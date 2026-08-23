import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-outline-variant flex flex-col py-6 px-4 z-40" aria-label="Sidebar Navigation">
      <!-- Header / Logo -->
      <a routerLink="/" class="flex items-center gap-2.5 mb-8 px-3 group">
        <div class="w-8 h-8 rounded-lg bg-primary group-hover:bg-primary-fixed-dim transition-colors flex items-center justify-center shrink-0 shadow-sm">
          <svg class="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19V11a4 4 0 0 1 8 0v8M12 11a4 4 0 0 1 8 0v8" />
          </svg>
        </div>
        <span class="text-lg font-bold text-on-surface tracking-tight">makini</span>
      </a>

      <!-- Navigation Links -->
      <div class="flex-1 flex flex-col gap-1.5">
        <a routerLink="/dashboard" routerLinkActive="bg-primary-container text-on-primary-container font-bold" [routerLinkActiveOptions]="{exact: true}"
           class="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-primary transition-colors" aria-hidden="true">home</span>
          <span class="font-label-md text-label-md">Dashboard</span>
        </a>

        <a routerLink="/session/ai-tutor" routerLinkActive="bg-primary-container text-on-primary-container font-bold"
           class="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-primary transition-colors" aria-hidden="true">smart_toy</span>
          <span class="font-label-md text-label-md">AI Tutor Workspace</span>
        </a>

        <a routerLink="/history" routerLinkActive="bg-primary-container text-on-primary-container font-bold"
           class="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-primary transition-colors" aria-hidden="true">history</span>
          <span class="font-label-md text-label-md">Session History</span>
        </a>

        <a routerLink="/achievements" routerLinkActive="bg-primary-container text-on-primary-container font-bold"
           class="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-primary transition-colors" aria-hidden="true">military_tech</span>
          <span class="font-label-md text-label-md">Achievements</span>
        </a>

        <a routerLink="/community" routerLinkActive="bg-primary-container text-on-primary-container font-bold"
           class="text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-primary transition-colors" aria-hidden="true">groups</span>
          <span class="font-label-md text-label-md">Community</span>
        </a>
      </div>

      <!-- Start New Session Button -->
      <button (click)="startNewSession()"
              class="w-full mt-4 mb-6 bg-primary text-on-primary font-label-md text-label-md font-bold py-3 px-4 rounded hover:bg-primary-fixed-dim transition-colors flex items-center justify-center gap-2 shadow-sm">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>
        Start New Session
      </button>

      <!-- Footer Actions -->
      <div class="flex flex-col gap-1 pt-4 border-t border-outline-variant">
        <button (click)="openHelp()"
                class="w-full text-left text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-primary transition-colors" aria-hidden="true">help</span>
          <span class="font-label-md text-label-md">Help & Info</span>
        </button>

        <button (click)="signOut()"
                class="w-full text-left text-on-surface-variant hover:bg-error-container/30 hover:text-error transition-colors duration-150 flex items-center gap-3 p-3 rounded-lg group">
          <span class="material-symbols-outlined group-hover:text-error transition-colors" aria-hidden="true">logout</span>
          <span class="font-label-md text-label-md">Sign Out</span>
        </button>
      </div>
    </nav>
  `
})
export class SideNavComponent {
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private router = inject(Router);

  startNewSession(): void {
    const active = this.sessionService.activeSession();
    if (active && active.status === 'locked') {
      if (confirm('You currently have an active locked session in progress. Do you want to view it?')) {
        this.router.navigate(['/session/lock']);
        return;
      }
    }
    this.router.navigate(['/session/setup']);
  }

  openHelp(): void {
    alert('Study Workflow:\n\n1. Set your topic and duration.\n2. Deep study in isolation with the lock timer.\n3. Complete self-check reflection.\n4. Unlock AI tutor for synthesis and feedback.');
  }

  signOut(): void {
    if (confirm('Are you sure you want to sign out?')) {
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    }
  }
}
