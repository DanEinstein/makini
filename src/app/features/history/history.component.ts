import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { SideNavComponent } from '../../shared/components/app-nav/side-nav.component';
import { TopBarComponent } from '../../shared/components/app-nav/top-bar.component';
import { ApiKeyModalComponent } from '../../shared/components/api-key-modal/api-key-modal.component';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [SideNavComponent, TopBarComponent, ApiKeyModalComponent],
  template: `
    <div class="bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <app-side-nav class="hidden md:flex" />

      <div class="flex-1 ml-0 md:ml-64 flex flex-col h-screen relative overflow-y-auto">
        <app-top-bar
          title="Session Archive"
          subtitle="Past Reflections & Syntheses"
          (openApiKeyModal)="showApiKeyModal.set(true)"
        />

        <main class="flex-1 mt-16 pt-8 pb-20 px-4 md:px-margin-desktop w-full max-w-container-max mx-auto flex flex-col gap-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold">
                Focus Session History
              </h1>
              <p class="text-sm text-on-surface-variant mt-1">
                A permanent log of every concept you isolated, synthesized, and verified.
              </p>
            </div>

            <button
              (click)="router.navigate(['/session/setup'])"
              class="bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-xs font-bold px-4 py-2.5 rounded flex items-center gap-2 transition-colors shadow"
            >
              <span class="material-symbols-outlined text-[16px]">add</span>
              New Session
            </button>
          </div>

          <div class="space-y-4">
            @for (session of sessionService.sessionHistory(); track session.id) {
              <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-xl p-6 transition-all hover:border-outline-variant">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
                  <div>
                    <div class="flex items-center gap-3">
                      <h2 class="font-headline-sm text-headline-sm text-primary font-semibold">{{ session.topic }}</h2>
                      <span class="bg-primary-container text-on-primary-container text-xs font-code-sm font-semibold px-2.5 py-0.5 rounded">
                        {{ session.plannedMinutes }} min Focus
                      </span>
                    </div>
                    <p class="text-xs text-on-surface-variant font-code-sm mt-1">
                      {{ formatDate(session.startedAt) }}
                    </p>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <span class="text-xs text-on-surface-variant font-code-sm block">Confidence Score</span>
                      <span class="text-secondary font-bold text-sm">
                        ★ {{ session.reflection?.confidenceRating || 4 }}/5
                      </span>
                    </div>

                    <button
                      type="button"
                      (click)="reviewSession(session)"
                      class="px-4 py-2 bg-surface border border-outline-variant hover:border-primary hover:text-primary rounded text-xs font-label-md transition-colors flex items-center gap-1.5"
                    >
                      <span class="material-symbols-outlined text-[16px]">smart_toy</span>
                      Review in AI Tutor
                    </button>
                  </div>
                </div>

                <!-- Reflection Content -->
                @if (session.reflection; as ref) {
                  <div class="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-sm">
                    <div class="md:col-span-8 bg-[#0D1117] border border-outline-variant/50 rounded-lg p-4">
                      <span class="text-xs text-primary font-code-sm block mb-1 uppercase tracking-wider">Written Synthesis</span>
                      <p class="text-on-surface leading-relaxed whitespace-pre-wrap">{{ ref.text }}</p>
                    </div>

                    <div class="md:col-span-4 bg-[#0D1117] border border-outline-variant/50 rounded-lg p-4 space-y-2">
                      <span class="text-xs text-on-surface-variant font-code-sm block mb-2 uppercase tracking-wider">Self-Check Protocols</span>
                      <div class="flex items-center gap-2 text-xs">
                        <span class="material-symbols-outlined text-[16px]" [class.text-secondary]="ref.selfCheck.explainWithoutNotes" [class.text-outline]="!ref.selfCheck.explainWithoutNotes">
                          {{ ref.selfCheck.explainWithoutNotes ? 'check_circle' : 'radio_button_unchecked' }}
                        </span>
                        <span>Explained without notes</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs">
                        <span class="material-symbols-outlined text-[16px]" [class.text-secondary]="ref.selfCheck.identifyEdgeCases" [class.text-outline]="!ref.selfCheck.identifyEdgeCases">
                          {{ ref.selfCheck.identifyEdgeCases ? 'check_circle' : 'radio_button_unchecked' }}
                        </span>
                        <span>Identified edge cases</span>
                      </div>
                      <div class="flex items-center gap-2 text-xs">
                        <span class="material-symbols-outlined text-[16px]" [class.text-secondary]="ref.selfCheck.teachSomeoneElse" [class.text-outline]="!ref.selfCheck.teachSomeoneElse">
                          {{ ref.selfCheck.teachSomeoneElse ? 'check_circle' : 'radio_button_unchecked' }}
                        </span>
                        <span>Ready to teach to others</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @empty {
              <div class="p-12 text-center bg-[#161B22]/40 rounded-xl border border-dashed border-outline-variant">
                <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">history</span>
                <p class="text-on-surface font-semibold">No completed sessions yet.</p>
                <p class="text-xs text-on-surface-variant mt-1">Start your first deep study lock to build your cognitive log.</p>
              </div>
            }
          </div>
        </main>
      </div>

      @if (showApiKeyModal()) {
        <app-api-key-modal (close)="showApiKeyModal.set(false)" />
      }
    </div>
  `
})
export class HistoryComponent {
  protected sessionService = inject(SessionService);
  protected router = inject(Router);
  protected showApiKeyModal = signal<boolean>(false);

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  reviewSession(session: Session): void {
    this.sessionService.reviewSession(session);
    this.router.navigate(['/session/ai-tutor']);
  }
}
