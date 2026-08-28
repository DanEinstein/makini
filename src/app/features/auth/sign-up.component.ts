import { Component } from '@angular/core';
import { ClerkSignUpComponent } from 'ngx-clerk';
import { clerkAppearance } from '../../core/clerk-appearance';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [ClerkSignUpComponent],
  template: `
    <div class="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-4 gap-8">
      <div class="text-center">
        <div class="w-11 h-11 rounded-xl bg-primary mx-auto flex items-center justify-center mb-3 shadow-md">
          <svg class="w-6 h-6 text-on-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19V11a4 4 0 0 1 8 0v8M12 11a4 4 0 0 1 8 0v8" />
          </svg>
        </div>
        <h1 class="text-2xl text-on-surface font-extrabold tracking-tight">makini</h1>
        <p class="font-body-md text-xs text-on-surface-variant mt-1">
          Study first. AI later.
        </p>
      </div>

      <clerk-sign-up
        [props]="{
          routing: 'path',
          path: '/sign-up',
          signInUrl: '/sign-in',
          fallbackRedirectUrl: '/dashboard',
          appearance: appearance
        }"
      />
    </div>
  `
})
export class SignUpComponent {
  protected readonly appearance = clerkAppearance;
}
