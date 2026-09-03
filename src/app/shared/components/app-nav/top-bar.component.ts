import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClerkUserButtonComponent } from 'ngx-clerk';
import { clerkAppearance } from '../../../core/clerk-appearance';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [RouterLink, ClerkUserButtonComponent],
  template: `
    <header class="app-top-bar fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 z-30 flex justify-between items-center px-4 md:px-margin-desktop">
      <!-- Title / Section Breadcrumb -->
      <div class="flex items-center gap-4">
        <span class="app-top-bar-title font-headline-sm text-headline-sm font-semibold hidden sm:inline-block">
          {{ title() || 'Makini' }}
        </span>
        @if (subtitle()) {
          <span class="text-white/50 text-sm hidden md:inline-block">/</span>
          <span class="app-top-bar-sub font-label-md text-label-md hidden md:inline-block opacity-90">{{ subtitle() }}</span>
        }
      </div>

      <!-- Centered Navigation Links -->
      <nav class="hidden lg:flex items-center gap-2" aria-label="Top Sub-Navigation">
        <a routerLink="/dashboard" class="app-top-bar-link px-3 py-1.5 rounded-lg transition-colors font-label-md text-label-md">Dashboard</a>
        <a routerLink="/session/setup" class="app-top-bar-link px-3 py-1.5 rounded-lg transition-colors font-label-md text-label-md">Focus Mode</a>
        <a routerLink="/session/ai-tutor" class="app-top-bar-link px-3 py-1.5 rounded-lg transition-colors font-label-md text-label-md">AI Tutor</a>
        <a routerLink="/history" class="app-top-bar-link px-3 py-1.5 rounded-lg transition-colors font-label-md text-label-md">History</a>
      </nav>

      <!-- Trailing Actions & User Profile -->
      <div class="flex items-center gap-3">
        @if (aiRuntimeStatus()) {
          <button
            (click)="openApiKeyModal.emit()"
            class="app-top-bar-chip flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-inter hover:bg-white/20 transition-colors"
            title="AI tutor runtime status"
          >
            <span class="w-2 h-2 rounded-full" [class.bg-green-300]="aiRuntimeStatus() === 'Connected'" [class.bg-red-300]="aiRuntimeStatus() !== 'Connected'"></span>
            <span class="hidden sm:inline">Groq: {{ aiRuntimeStatus() }}</span>
          </button>
        }

        <button (click)="onNotificationClick()" aria-label="Notifications" class="app-top-bar-icon transition-colors p-2 rounded-full">
          <span class="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        <button (click)="openApiKeyModal.emit()" aria-label="Settings" class="app-top-bar-icon transition-colors p-2 rounded-full">
          <span class="material-symbols-outlined text-[20px]">settings</span>
        </button>

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
