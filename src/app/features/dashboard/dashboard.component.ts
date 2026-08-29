import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StatsService } from '../../core/services/stats.service';
import { SessionService } from '../../core/services/session.service';
import { SideNavComponent } from '../../shared/components/app-nav/side-nav.component';
import { TopBarComponent } from '../../shared/components/app-nav/top-bar.component';
import { ApiKeyModalComponent } from '../../shared/components/api-key-modal/api-key-modal.component';
import { ConfidenceChartComponent } from '../../shared/components/confidence-chart/confidence-chart.component';
import { Session } from '../../core/models/session.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    SideNavComponent,
    TopBarComponent,
    ApiKeyModalComponent,
    ConfidenceChartComponent
  ],
  template: `
    <div class="bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <!-- Side Navigation -->
      <app-side-nav class="hidden md:flex" />

      <!-- Main Content Area -->
      <div class="flex-1 ml-0 md:ml-64 flex flex-col h-screen relative overflow-y-auto">
        <!-- Top App Bar -->
        <app-top-bar
          title="Cognitive Dashboard"
          subtitle="Learning Analytics & Mastery"
          (openApiKeyModal)="showApiKeyModal.set(true)"
        />

        <!-- Content Canvas -->
        <main class="flex-1 mt-16 pt-8 pb-20 px-4 md:px-margin-desktop w-full max-w-container-max mx-auto flex flex-col gap-8">
          <!-- Welcome & Quick Focus CTA -->
          <div class="bg-surface/80 backdrop-blur-md border border-white/10 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary-container opacity-40"></div>
            <div>
              <div class="flex items-center gap-2 text-primary font-code-sm text-xs uppercase tracking-wider mb-1">
                <span class="material-symbols-outlined text-[16px]">bolt</span>
                Deep Focus Architecture
              </div>
              <h1 class="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold">
                Lock AI. Read Sources. Master Invariants.
              </h1>
              <p class="font-body-md text-sm text-on-surface-variant max-w-xl mt-1">
                This workspace enforces cognitive friction: study in isolation, synthesize in your own words, then unlock AI only after reflection is complete.
              </p>
            </div>

            <button
              (click)="onStartSession()"
              class="bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-md text-label-md font-bold px-6 py-4 rounded flex items-center gap-2 shadow-lg shrink-0 transition-transform active:scale-95"
            >
              <span class="material-symbols-outlined fill-1">lock</span>
              Start New Focus Session
            </button>
          </div>

          <!-- Top Analytics Metric Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Stat 1: AI-Free Hours -->
            <div class="bg-[#161B22]/70 backdrop-blur-md border border-white/10 rounded-lg p-6 flex items-center gap-5">
              <div class="p-3 bg-surface-container-high rounded-lg text-on-surface-variant">
                <span class="material-symbols-outlined text-[28px]">timer_off</span>
              </div>
              <div>
                <p class="font-label-md text-label-md text-on-surface-variant mb-1 uppercase text-xs tracking-wider">
                  AI-Free Study Time
                </p>
                <p class="font-headline-lg text-3xl md:text-4xl text-on-surface font-bold">
                  {{ statsService.stats().totalStudyHours }} <span class="text-base text-on-surface-variant font-normal">hours</span>
                </p>
              </div>
            </div>

            <!-- Stat 2: Streak -->
            <div class="bg-[#161B22]/70 backdrop-blur-md border border-white/10 rounded-lg p-6 flex items-center gap-5 border-l-2 border-l-primary">
              <div class="p-3 bg-primary-container rounded-lg text-on-primary-container">
                <span class="material-symbols-outlined text-[28px] fill-1">local_fire_department</span>
              </div>
              <div>
                <p class="font-label-md text-label-md text-on-surface-variant mb-1 uppercase text-xs tracking-wider">
                  Consecutive Streak
                </p>
                <p class="font-headline-lg text-3xl md:text-4xl text-primary font-bold">
                  {{ statsService.stats().currentStreakDays }} <span class="text-base text-primary-fixed-dim font-normal">days</span>
                </p>
              </div>
            </div>

            <!-- Stat 3: Topics Mastered -->
            <div class="bg-[#161B22]/70 backdrop-blur-md border border-white/10 rounded-lg p-6 flex items-center gap-5">
              <div class="p-3 bg-secondary-fixed-dim/20 rounded-lg text-secondary">
                <span class="material-symbols-outlined text-[28px]">check_circle</span>
              </div>
              <div>
                <p class="font-label-md text-label-md text-on-surface-variant mb-1 uppercase text-xs tracking-wider">
                  Concepts Mastered
                </p>
                <p class="font-headline-lg text-3xl md:text-4xl text-on-surface font-bold">
                  {{ statsService.stats().topicsMastered }} <span class="text-base text-on-surface-variant font-normal">topics</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Mid Section: Confidence Chart -->
          <app-confidence-chart
            [data]="statsService.stats().confidenceTrend"
            [timeframe]="statsService.timeframe()"
            (timeframeChange)="statsService.setTimeframe($event)"
          />

          <!-- Bottom Section: Recent Completed Sessions -->
          <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-lg p-6">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary">history</span>
                  Recent Focus Sessions
                </h3>
                <p class="text-xs text-on-surface-variant mt-0.5">Verified reflections & conceptual notes</p>
              </div>

              <a routerLink="/history" class="text-xs font-code-sm text-primary hover:underline flex items-center gap-1">
                View all sessions <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm" aria-label="Recent focus sessions table">
                <thead>
                  <tr class="border-b border-outline-variant/40 text-on-surface-variant font-code-sm text-xs">
                    <th class="pb-3 font-medium">Topic</th>
                    <th class="pb-3 font-medium">Focus Duration</th>
                    <th class="pb-3 font-medium">Confidence</th>
                    <th class="pb-3 font-medium">Status</th>
                    <th class="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/20">
                  @for (s of sessionService.sessionHistory(); track s.id) {
                    <tr class="hover:bg-surface-container-high/40 transition-colors">
                      <td class="py-4 font-medium text-on-surface">
                        {{ s.topic }}
                      </td>
                      <td class="py-4 text-on-surface-variant font-code-sm">
                        {{ s.plannedMinutes }} mins
                      </td>
                      <td class="py-4">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-code-sm"
                              [class.bg-secondary/15]="(s.reflection?.confidenceRating || 0) >= 4"
                              [class.text-secondary]="(s.reflection?.confidenceRating || 0) >= 4"
                              [class.bg-primary/15]="(s.reflection?.confidenceRating || 0) < 4"
                              [class.text-primary]="(s.reflection?.confidenceRating || 0) < 4">
                          ★ {{ s.reflection?.confidenceRating || 4 }}/5
                        </span>
                      </td>
                      <td class="py-4">
                        <span class="inline-flex items-center gap-1 text-xs text-secondary font-code-sm">
                          <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                          Completed &amp; Reflected
                        </span>
                      </td>
                      <td class="py-4 text-right">
                        <button
                          type="button"
                          (click)="reviewInAIWorkspace(s)"
                          class="px-3 py-1.5 text-xs font-label-md rounded border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1.5"
                        >
                          <span class="material-symbols-outlined text-[14px]">smart_toy</span>
                          AI Sparring
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <!-- BYOK Settings Modal -->
      @if (showApiKeyModal()) {
        <app-api-key-modal (close)="showApiKeyModal.set(false)" />
      }
    </div>
  `
})
export class DashboardComponent {
  protected statsService = inject(StatsService);
  protected sessionService = inject(SessionService);
  private router = inject(Router);

  protected showApiKeyModal = signal<boolean>(false);

  onStartSession(): void {
    this.router.navigate(['/session/setup']);
  }

  reviewInAIWorkspace(session: Session): void {
    this.sessionService.reviewSession(session);
    this.router.navigate(['/session/ai-tutor']);
  }
}
