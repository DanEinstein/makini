import { Component, signal } from '@angular/core';
import { SideNavComponent } from '../../shared/components/app-nav/side-nav.component';
import { TopBarComponent } from '../../shared/components/app-nav/top-bar.component';
import { ApiKeyModalComponent } from '../../shared/components/api-key-modal/api-key-modal.component';

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [SideNavComponent, TopBarComponent, ApiKeyModalComponent],
  template: `
    <div class="bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <app-side-nav class="hidden md:flex" />

      <div class="flex-1 ml-0 md:ml-64 flex flex-col h-screen relative overflow-y-auto">
        <app-top-bar
          title="Community & Peer Sparring"
          subtitle="Collective Synthesis"
          (openApiKeyModal)="showApiKeyModal.set(true)"
        />

        <main class="flex-1 mt-16 pt-8 pb-20 px-4 md:px-margin-desktop w-full max-w-container-max mx-auto flex flex-col gap-6">
          <div>
            <h1 class="font-headline-lg text-headline-md md:text-headline-lg text-on-surface font-bold">
              Peer Syntheses & Study Rooms
            </h1>
            <p class="text-sm text-on-surface-variant mt-1">
              Shared reflections from other learners will show up here when community is enabled.
            </p>
          </div>

          <div class="panel-card rounded-xl p-10 text-center">
            <span class="material-symbols-outlined text-4xl text-primary mb-3">groups</span>
            <p class="text-on-surface font-semibold">No community posts yet.</p>
            <p class="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
              This space is empty on purpose. There are no sample peers or sample topics.
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
export class CommunityComponent {
  protected showApiKeyModal = signal<boolean>(false);
}
