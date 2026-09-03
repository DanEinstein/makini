import { Component, input, output, computed } from '@angular/core';
import { ConfidenceDataPoint } from '../../../core/models/stats.model';

@Component({
  selector: 'app-confidence-chart',
  standalone: true,
  template: `
    <div class="panel-card rounded-lg p-6 flex flex-col h-full">
      <!-- Chart Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[18px]">trending_up</span>
            Confidence Trend Over Time
          </h3>
          <p class="text-xs text-on-surface-variant mt-0.5">Self-assessed retention after reflection phases</p>
        </div>

        <div class="flex items-center gap-2">
          <label for="timeframe-select" class="sr-only">Select Timeframe</label>
          <select
            id="timeframe-select"
            [value]="timeframe()"
            (change)="onTimeframeChange($event)"
            class="bg-surface border border-outline-variant text-on-surface font-inter text-xs rounded px-2.5 py-1.5 focus:border-primary focus:outline-none transition-colors"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      <!-- Chart Canvas Area -->
      <div class="flex-grow relative mt-2 h-52 border-l border-b border-outline-variant flex items-end px-3">
        <!-- Y-Axis Labels -->
        <div class="absolute left-[-28px] top-0 bottom-0 flex flex-col justify-between text-[11px] text-on-surface-variant font-code-sm pb-2 select-none">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>

        @if (points().length === 0) {
          <p class="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant">
            No confidence scores yet.
          </p>
        }
        <div class="absolute inset-x-0 border-t border-outline-variant/50 top-1/2 w-full pointer-events-none"></div>

        <!-- SVG Line Chart and Area Gradient -->
        <svg class="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient [id]="gradientId" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="#a4508b" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#fffafb" stop-opacity="0.0" />
            </linearGradient>
          </defs>

          <!-- Gradient Area Fill -->
          <path [attr.d]="areaPath()" [attr.fill]="'url(#' + gradientId + ')'" />

          <!-- Main Stroke Line -->
          <path
            class="chart-line"
            [attr.d]="linePath()"
            fill="none"
            stroke="#a4508b"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Interactive Data Points -->
          @for (pt of points(); track $index) {
            <circle
              [attr.cx]="pt.x"
              [attr.cy]="pt.y"
              r="3.5"
              fill="#fffafb"
              stroke="#a4508b"
              stroke-width="2"
              class="hover:r-5 hover:fill-primary transition-all cursor-pointer"
            >
              <title>{{ pt.label }}: {{ pt.score }}% ({{ pt.topic || 'Session' }})</title>
            </circle>
          }
        </svg>

        <!-- X-Axis Labels -->
        <div class="absolute bottom-[-24px] left-0 right-0 flex justify-between text-[11px] text-on-surface-variant font-code-sm select-none px-1">
          @for (pt of data(); track pt.date) {
            <span>{{ pt.label }}</span>
          }
        </div>
      </div>
    </div>
  `
})
export class ConfidenceChartComponent {
  readonly data = input.required<ConfidenceDataPoint[]>();
  readonly timeframe = input<'7d' | '30d'>('7d');
  readonly timeframeChange = output<'7d' | '30d'>();

  readonly gradientId = 'confidence-grad-' + Math.random().toString(36).substring(2, 7);

  readonly points = computed(() => {
    const list = this.data();
    if (!list || list.length === 0) return [];

    const n = list.length;
    return list.map((item, idx) => {
      const x = n > 1 ? (idx / (n - 1)) * 100 : 50;
      // SVG Y: 0 is top (100%), 100 is bottom (0%)
      const y = Math.max(5, Math.min(95, 100 - item.score));
      return {
        x,
        y,
        score: item.score,
        label: item.label,
        topic: item.topic
      };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x},${curr.y}` : `${acc} L ${curr.x},${curr.y}`;
    }, '');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const line = this.linePath();
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L ${last.x},100 L ${first.x},100 Z`;
  });

  onTimeframeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as '7d' | '30d';
    this.timeframeChange.emit(value);
  }
}
