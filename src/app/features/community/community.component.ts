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
              Explore how other learners explain complex mental models without relying on generative shortcuts.
            </p>
          </div>

          <div class="grid grid-cols-1 gap-6">
            <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-4">
              <div>
                <div class="flex items-center gap-3 mb-2">
                  <span class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container font-bold flex items-center justify-center text-xs">
                    JD
                  </span>
                  <div>
                    <h3 class="font-headline-sm text-sm font-semibold text-on-surface">Jordan Diaz</h3>
                    <p class="text-xs text-on-surface-variant font-code-sm">Topic: Lamport Timers</p>
                  </div>
                </div>
                <p class="text-xs text-on-surface-variant leading-relaxed bg-[#0D1117] p-3 rounded border border-outline-variant/40">
                  "Lamport clocks preserve event ordering even when physical clocks drift."
                </p>
              </div>

              <div class="flex items-center justify-between text-xs font-code-sm text-secondary">
                <span>Verified 45-min lock</span>
                <span>★ 5/5</span>
              </div>
            </div>
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
