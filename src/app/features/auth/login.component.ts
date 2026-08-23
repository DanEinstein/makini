import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-background text-on-background flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-surface/80 backdrop-blur-md border border-white/10 rounded-xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
        <!-- Accent line -->
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>

        <!-- Brand Header -->
        <div class="text-center mb-8">
          <div class="w-11 h-11 rounded-xl bg-primary mx-auto flex items-center justify-center mb-3 shadow-md">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19V11a4 4 0 0 1 8 0v8M12 11a4 4 0 0 1 8 0v8" />
            </svg>
          </div>
          <h1 class="text-2xl text-on-surface font-extrabold tracking-tight">makini</h1>
          <p class="font-body-md text-xs text-on-surface-variant mt-1">Deep cognitive focus & self-directed AI mastery</p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onLogin()" class="space-y-5">
          <div class="space-y-2">
            <label for="email" class="block font-label-md text-label-md text-on-background font-medium">Email address</label>
            <div class="flex items-center bg-[#0D1117] border border-outline-variant rounded px-3 py-2.5 focus-within:border-primary transition-colors">
              <span class="material-symbols-outlined text-on-surface-variant mr-2.5 text-[18px]">alternate_email</span>
              <input
                id="email"
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="you@institution.edu"
                required
                class="w-full bg-transparent border-none text-on-background font-code-sm text-sm focus:outline-none p-0"
              />
            </div>
          </div>

          <button
            type="submit"
            [disabled]="!email().trim()"
            class="w-full bg-primary hover:bg-primary-fixed-dim disabled:opacity-50 text-on-primary font-label-md text-label-md font-bold py-3.5 rounded transition-all flex items-center justify-center gap-2 shadow"
          >
            <span class="material-symbols-outlined text-[18px]">login</span>
            Sign In to Study Space
          </button>
        </form>

        <div class="relative my-6 text-center">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-outline-variant/60"></div></div>
          <span class="relative bg-surface px-3 font-code-sm text-xs text-on-surface-variant uppercase tracking-wider">Or explore</span>
        </div>

        <!-- Demo 1-Click Login -->
        <button
          (click)="onDemoLogin()"
          type="button"
          class="w-full bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-label-md text-label-md py-3 rounded transition-colors flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined text-primary text-[18px]">bolt</span>
          Continue as Alex Rivera (Demo)
        </button>

        <p class="text-center font-code-sm text-xs text-on-surface-variant/70 mt-6 flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-[14px]">lock</span>
          Zero telemetry. Client-side local persistence.
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected email = signal<string>('');

  onLogin(): void {
    if (this.email().trim()) {
      this.authService.login(this.email().trim());
      this.router.navigate(['/session/setup']);
    }
  }

  onDemoLogin(): void {
    this.authService.loginDemo();
    this.router.navigate(['/session/setup']);
  }
}
