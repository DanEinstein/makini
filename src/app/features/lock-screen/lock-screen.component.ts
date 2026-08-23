import { Component, inject, effect, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { TimerRingComponent } from '../../shared/components/timer-ring/timer-ring.component';
import { SourceCardComponent } from '../../shared/components/source-card/source-card.component';

@Component({
  selector: 'app-lock-screen',
  standalone: true,
  imports: [FormsModule, TimerRingComponent, SourceCardComponent],
  template: `
    <div class="bg-background text-on-background min-h-screen flex flex-col font-body-lg">
      <!-- Minimal Top Bar (Focus Phase specific, suppresses global nav for zero distraction) -->
      <header class="w-full flex justify-between items-center px-4 md:px-margin-desktop h-16 border-b border-surface-variant bg-surface sticky top-0 z-50">
        <div class="flex items-center gap-3">
          <span class="material-symbols-outlined text-primary fill-1" aria-hidden="true">target</span>
          <h1 class="font-headline-md text-headline-md text-on-surface font-semibold truncate max-w-xs md:max-w-xl">
            {{ sessionService.activeSession()?.topic || 'Understanding Concept' }}
          </h1>
        </div>
        <button
          (click)="onEndEarly()"
          type="button"
          class="px-4 py-2 border border-surface-variant text-on-surface bg-transparent rounded hover:bg-surface-container-high transition-colors duration-150 font-label-md text-label-md flex items-center gap-2 focus-ring"
        >
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">stop</span>
          End Session Early
        </button>
      </header>

      <!-- Main Workspace Area -->
      <main class="flex-1 w-full max-w-container-max mx-auto px-4 md:px-margin-desktop py-8 grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
        <!-- Left/Center Column: Focus & Sources (8 cols) -->
        <div class="md:col-span-8 flex flex-col gap-8 w-full">
          <!-- Timer & Badge Module -->
          <div class="bg-surface/80 backdrop-blur-md border border-white/10 rounded-xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
            <!-- Decorative subtle background pattern -->
            <div class="absolute inset-0 opacity-5 pointer-events-none"
                 style="background-image: radial-gradient(var(--tw-colors-surface-variant, #31353c) 1px, transparent 1px); background-size: 24px 24px;"></div>
            
            <!-- Countdown Ring -->
            <app-timer-ring
              [formattedTime]="sessionService.formattedTime()"
              [progressPercentage]="sessionService.progressPercentage()"
            />

            <!-- Visual Badge -->
            <div class="mt-8 flex items-center gap-3 bg-surface-container border border-surface-variant px-4 py-2 rounded-lg">
              <span class="material-symbols-outlined text-outline text-[18px]" aria-hidden="true">lock</span>
              <span class="font-label-md text-label-md text-on-surface-variant">AI unlocks after timer &amp; reflection</span>
            </div>
          </div>

          <!-- Primary Sources Grid -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Primary Source Links</h2>
              <span class="font-code-sm text-xs text-on-surface-variant">Validated references</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              @for (source of sessionService.activeSession()?.sources || []; track source.title) {
                <app-source-card [source]="source" />
              }
            </div>
          </div>
        </div>

        <!-- Right Column: Scratchpad (4 cols) -->
        <div class="md:col-span-4 h-full flex flex-col w-full">
          <div class="bg-surface/80 backdrop-blur-md border border-white/10 rounded-xl p-6 flex flex-col h-full min-h-[580px] sticky top-24">
            <div class="flex items-center gap-2 mb-2 text-primary">
              <span class="material-symbols-outlined" aria-hidden="true">edit_note</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Questions for later</h3>
            </div>
            <p class="font-body-md text-body-md text-on-surface-variant text-sm mb-4 pb-4 border-b border-surface-variant leading-relaxed">
              Hold your thoughts. Document conceptual blocks to discuss with the AI Tutor once the session completes.
            </p>

            <textarea
              [(ngModel)]="scratchpad"
              (ngModelChange)="onScratchpadChange($event)"
              class="flex-1 w-full bg-surface-dim border border-surface-variant rounded-lg p-4 font-code-sm text-code-sm text-on-surface placeholder:text-outline focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none resize-none transition-all"
              placeholder="e.g., How does tail call optimization actually work under the hood? I keep thinking about infinite loops..."
            ></textarea>

            <div class="mt-4 flex justify-between items-center text-outline font-label-md text-label-md text-xs">
              <span class="text-on-surface-variant/80">Draft saved automatically</span>
              <span class="material-symbols-outlined text-[16px] text-secondary" aria-hidden="true">cloud_done</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class LockScreenComponent {
  protected sessionService = inject(SessionService);
  private router = inject(Router);

  protected scratchpad = signal<string>(this.sessionService.activeSession()?.scratchpadNotes || '');

  constructor() {
    // Monitor session state for timer completion -> auto transition to reflection
    effect(() => {
      const status = this.sessionService.status();
      if (status === 'reflecting') {
        this.router.navigate(['/session/reflect']);
      } else if (status === 'completed') {
        this.router.navigate(['/session/ai-tutor']);
      }
    });
  }

  onScratchpadChange(value: string): void {
    this.scratchpad.set(value);
    this.sessionService.updateScratchpad(value);
  }

  onEndEarly(): void {
    if (confirm('Are you ready to stop the timer early and proceed to the reflection phase?')) {
      this.sessionService.endSessionEarly();
      this.router.navigate(['/session/reflect']);
    }
  }
}
