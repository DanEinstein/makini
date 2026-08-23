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

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (item of badges; track item.id) {
              <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden"
                   [class.border-primary]="item.unlocked" [class.opacity-60]="!item.unlocked">
                <div class="flex items-center justify-between">
                  <div class="w-12 h-12 rounded-lg flex items-center justify-center"
                       [class.bg-primary-container]="item.unlocked" [class.text-on-primary-container]="item.unlocked"
                       [class.bg-surface-container-high]="!item.unlocked" [class.text-on-surface-variant]="!item.unlocked">
                    <span class="material-symbols-outlined text-[28px] fill-1">{{ item.icon }}</span>
                  </div>
                  <span class="font-code-sm text-xs px-2 py-0.5 rounded"
                        [class.bg-secondary/20]="item.unlocked" [class.text-secondary]="item.unlocked"
                        [class.bg-surface-container]="!item.unlocked" [class.text-outline]="!item.unlocked">
                    {{ item.unlocked ? 'Unlocked' : 'Locked' }}
                  </span>
                </div>

                <div>
                  <h3 class="font-headline-sm text-on-surface font-semibold text-lg">{{ item.title }}</h3>
                  <p class="text-xs text-on-surface-variant mt-1 leading-relaxed">{{ item.description }}</p>
                </div>

                <div class="mt-auto pt-4 border-t border-outline-variant/30 flex justify-between items-center text-xs font-code-sm text-on-surface-variant">
                  <span>{{ item.progress }}</span>
                </div>
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
export class AchievementsComponent {
  protected showApiKeyModal = signal<boolean>(false);

  badges = [
    {
      id: 'b1',
      title: '5-Day Deep Focus Streak',
      description: 'Maintained uninterrupted study sessions across 5 consecutive calendar days.',
      icon: 'local_fire_department',
      unlocked: true,
      progress: 'Completed (5 / 5 days)'
    },
    {
      id: 'b2',
      title: 'Zero-AI Purist',
      description: 'Completed a 60-minute session without breaking focus or opening AI tools early.',
      icon: 'lock',
      unlocked: true,
      progress: 'Completed (60 / 60 mins)'
    },
    {
      id: 'b3',
      title: 'Synthesis Master',
      description: 'Wrote over 10 verified reflections answering all 3 self-check criteria.',
      icon: 'psychiatry',
      unlocked: true,
      progress: '12 / 10 reflections'
    },
    {
      id: 'b4',
      title: 'Mastery Level 5',
      description: 'Attain a 5/5 confidence rating on 5 complex concepts.',
      icon: 'military_tech',
      unlocked: false,
      progress: '1 / 5 concepts'
    }
  ];
}
