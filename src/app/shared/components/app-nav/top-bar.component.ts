import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClerkUserButtonComponent } from 'ngx-clerk';
import { clerkAppearance } from '../../../core/clerk-appearance';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [RouterLink, ClerkUserButtonComponent],
  template: `
    <header class="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] bg-surface/95 backdrop-blur-md border-b border-outline-variant h-16 z-30 flex justify-between items-center px-4 md:px-margin-desktop shadow-sm">
      <!-- Title / Section Breadcrumb -->
      <div class="flex items-center gap-4">
        <span class="font-headline-sm text-headline-sm font-semibold text-primary hidden sm:inline-block">
          {{ title() || 'Makini' }}
        </span>
        @if (subtitle()) {
          <span class="text-outline-variant text-sm hidden md:inline-block">/</span>
          <span class="font-label-md text-label-md text-on-surface-variant hidden md:inline-block">{{ subtitle() }}</span>
        }
      </div>

      <!-- Centered Navigation Links -->
      <nav class="hidden lg:flex items-center gap-8" aria-label="Top Sub-Navigation">
        <a routerLink="/dashboard" class="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">Dashboard</a>
        <a routerLink="/session/setup" class="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">Focus Mode</a>
        <a routerLink="/session/ai-tutor" class="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">AI Tutor</a>
        <a routerLink="/history" class="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md">History</a>
      </nav>

      <!-- Trailing Actions & User Profile -->
      <div class="flex items-center gap-3">
        @if (aiRuntimeStatus()) {
          <button
            (click)="openApiKeyModal.emit()"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container border border-outline-variant text-xs font-code-sm hover:border-primary transition-colors"
            title="AI tutor runtime status"
          >
            <span class="w-2 h-2 rounded-full" [class.bg-secondary]="aiRuntimeStatus() === 'Connected'" [class.bg-error]="aiRuntimeStatus() !== 'Connected'"></span>
            <span class="text-on-surface-variant hidden sm:inline">Groq: {{ aiRuntimeStatus() }}</span>
          </button>
        }

        <!-- Notification / Settings -->
        <button (click)="onNotificationClick()" aria-label="Notifications" class="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high">
          <span class="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        <button (click)="openApiKeyModal.emit()" aria-label="Settings" class="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high">
          <span class="material-symbols-outlined text-[20px]">settings</span>
        </button>

        <!-- User Profile Menu -->
        <div class="shrink-0 ml-1 flex items-center">
          <clerk-user-button [props]="{ appearance: appearance }" />
        </div>
      </div>
    </header>
  `
})
export class TopBarComponent {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly aiRuntimeStatus = input<string>('');
  readonly openApiKeyModal = output<void>();

  protected readonly appearance = clerkAppearance;

  onNotificationClick(): void {
    alert('No unread notifications. Keep up the deep focus flow!');
  }
}
