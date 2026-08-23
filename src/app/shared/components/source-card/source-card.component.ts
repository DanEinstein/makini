import { Component, input } from '@angular/core';
import { SourceLink } from '../../../core/models/session.model';

@Component({
  selector: 'app-source-card',
  standalone: true,
  template: `
    <a [href]="source().url" target="_blank" rel="noopener noreferrer"
       class="group p-5 bg-surface/80 backdrop-blur-md border border-white/10 rounded-lg hover:bg-surface-container-high hover:border-primary-fixed-dim transition-all duration-150 flex flex-col gap-3 h-full focus-ring cursor-pointer">
      <div class="flex items-center gap-3 text-on-surface-variant group-hover:text-primary transition-colors">
        <span class="material-symbols-outlined text-[24px]" aria-hidden="true">{{ source().icon || 'description' }}</span>
        <span class="font-label-md text-label-md font-semibold text-on-surface group-hover:text-primary">{{ source().title }}</span>
      </div>
      <p class="font-body-md text-body-md text-on-surface-variant text-sm flex-1 leading-relaxed">
        {{ source().description }}
      </p>
      <div class="flex items-center justify-between text-outline-variant group-hover:text-primary transition-colors pt-2 border-t border-white/5 text-xs font-code-sm">
        <span>External Reference</span>
        <span class="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true">open_in_new</span>
      </div>
    </a>
  `
})
export class SourceCardComponent {
  readonly source = input.required<SourceLink>();
}
