import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'app-timer-ring',
  standalone: true,
  template: `
    <div class="relative w-64 h-64 flex items-center justify-center select-none" role="timer" [attr.aria-label]="'Countdown timer: ' + formattedTime()">
      <!-- Background track -->
      <div class="absolute inset-0 rounded-full border-[4px] border-surface-container-highest"></div>
      
      <!-- SVG Progress Ring for smooth rendering & accessibility -->
      <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="transparent"
          stroke="currentColor"
          class="text-[#ffb224] transition-all duration-300 ease-linear timer-circle"
          stroke-width="4"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="strokeDashoffset()"
          stroke-linecap="round"
        />
      </svg>

      <!-- Center Countdown Display -->
      <div class="z-10 flex flex-col items-center justify-center">
        <span class="font-display-lg text-display-lg text-primary tracking-tighter tabular-nums font-bold">
          {{ formattedTime() }}
        </span>
        @if (label()) {
          <span class="font-code-sm text-code-sm text-on-surface-variant uppercase tracking-wider mt-1 opacity-80">
            {{ label() }}
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    @media (prefers-reduced-motion: reduce) {
      .timer-circle {
        transition: none !important;
      }
    }
  `]
})
export class TimerRingComponent {
  readonly formattedTime = input.required<string>();
  readonly progressPercentage = input<number>(0);
  readonly label = input<string>('REMAINING');

  readonly circumference = 2 * Math.PI * 46; // ≈ 289.026

  readonly strokeDashoffset = computed(() => {
    const percent = Math.min(100, Math.max(0, this.progressPercentage()));
    return this.circumference - (percent / 100) * this.circumference;
  });
}
