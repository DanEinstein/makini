import { Component, signal } from '@angular/core';
import { SideNavComponent } from '../../shared/components/app-nav/side-nav.component';
import { TopBarComponent } from '../../shared/components/app-nav/top-bar.component';
import { ApiKeyModalComponent } from '../../shared/components/api-key-modal/api-key-modal.component';

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [SideNavComponent, TopBarComponent, ApiKeyModalComponent],
  template: `
    <div class="bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <app-side-nav class="hidden md:flex" />

      <div class="flex-1 ml-0 md:ml-64 flex flex-col h-screen relative overflow-y-auto">
        <app-top-bar
          title="Cognitive Milestones"
          subtitle="Streaks & Badges"
          (openApiKeyModal)="showApiKeyModal.set(true)"
        />

        <main class="flex-1 mt-16 pt-8 pb-20 px-4 md:px-margin-desktop w-full max-w-container-max mx-auto flex flex-col gap-8">
          <div>
            <h1 class="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold">
              Cognitive Mastery Achievements
            </h1>
            <p class="text-sm text-on-surface-variant mt-1">
              Rewarding unassisted focus, self-explanation consistency, and conceptual retention.
            </p>
          </div>

          <div class="panel-card rounded-xl p-10 text-center">
            <span class="material-symbols-outlined text-4xl text-primary mb-3">military_tech</span>
            <p class="text-on-surface font-semibold">Achievements are not wired yet.</p>
            <p class="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
              Badges will appear here from your real session history. Nothing is unlocked until that ships.
            </p>
          </div>
        </main>
      </div>

      @if (showApiKeyModal()) {
        <app-api-key-modal (close)="showApiKeyModal.set(false)" />
      }
    </div>
  `
})
export class AchievementsComponent {
  protected showApiKeyModal = signal<boolean>(false);
}
