import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-session-setup',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-background text-on-background min-h-screen flex items-center justify-center font-body-md antialiased p-4 md:p-margin-desktop">
      <main class="w-full max-w-2xl mx-auto">
        <!-- Modal / Card Container -->
        <div class="bg-surface/80 backdrop-blur-md border border-white/10 rounded-xl p-6 sm:p-8 md:p-14 shadow-2xl relative overflow-hidden">
          <!-- Background subtle accent -->
          <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>

          <!-- Header -->
          <div class="text-center mb-8 md:mb-10">
            <span class="material-symbols-outlined text-primary text-4xl mb-3 inline-block" aria-hidden="true">center_focus_strong</span>
            <h1 class="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-on-background tracking-tight mb-2 font-bold">
              Start a New Deep Focus Session
            </h1>
            <p class="font-body-lg text-body-lg text-on-surface-variant max-w-lg mx-auto">
              Configure your parameters for uninterrupted cognitive work.
            </p>
          </div>

          <form (ngSubmit)="onStartSession()" class="space-y-8">
            <!-- Input: Topic -->
            <div class="space-y-2">
              <label class="block font-label-md text-label-md text-on-background font-medium" for="topic">
                Topic or concept to explore
              </label>
              <div class="relative focus-ring border border-outline-variant rounded bg-[#0D1117] transition-colors duration-150 flex items-center px-4 py-3">
                <span class="material-symbols-outlined text-on-surface-variant mr-3 text-lg" aria-hidden="true">search</span>
                <input
                  class="w-full bg-transparent border-none text-on-background font-code-sm text-code-sm placeholder:text-on-surface-variant/50 focus:outline-none p-0"
                  id="topic"
                  name="topic"
                  [(ngModel)]="topic"
                  placeholder="e.g., Understanding Recursion & Call Stacks"
                  type="text"
                  required
                />
              </div>
            </div>

            <!-- Input: Duration -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <span class="block font-label-md text-label-md text-on-background font-medium">Duration</span>
                <span class="font-code-sm text-code-sm text-primary flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm" aria-hidden="true">timer</span>
                  Focus Timer
                </span>
              </div>

              <!-- Duration Chips Grid -->
              <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                @for (preset of durationPresets; track preset) {
                  <button
                    type="button"
                    (click)="selectPreset(preset)"
                    [class.border-primary]="selectedDuration() === preset && !isCustom()"
                    [class.bg-[#21262D]]="selectedDuration() === preset && !isCustom()"
                    [class.text-primary]="selectedDuration() === preset && !isCustom()"
                    [class.border-outline-variant]="selectedDuration() !== preset || isCustom()"
                    [class.bg-surface]="selectedDuration() !== preset || isCustom()"
                    [class.text-on-background]="selectedDuration() !== preset || isCustom()"
                    class="rounded border py-3 text-center transition-colors duration-150 hover:bg-[#21262D] focus:outline-none"
                  >
                    <span class="font-label-md text-label-md">{{ preset }} min</span>
                  </button>
                }

                <!-- Custom Chip -->
                <button
                  type="button"
                  (click)="toggleCustom()"
                  [class.border-primary]="isCustom()"
                  [class.bg-[#21262D]]="isCustom()"
                  [class.text-primary]="isCustom()"
                  [class.border-outline-variant]="!isCustom()"
                  [class.bg-surface]="!isCustom()"
                  class="rounded border border-dashed py-3 text-center transition-colors duration-150 hover:bg-[#21262D] col-span-2 md:col-span-1 focus:outline-none"
                >
                  <span class="font-label-md text-label-md">Custom</span>
                </button>
              </div>

              <!-- Custom Duration Input (if selected) -->
              @if (isCustom()) {
                <div class="pt-2 flex items-center gap-3">
                  <label for="customMinutes" class="font-code-sm text-xs text-on-surface-variant">Minutes:</label>
                  <input
                    id="customMinutes"
                    type="number"
                    min="1"
                    max="180"
                    [(ngModel)]="customMinutes"
                    name="customMinutes"
                    class="w-24 bg-[#0D1117] border border-primary text-on-surface font-code-sm text-sm rounded px-3 py-1.5 focus:outline-none"
                  />
                  <span class="text-xs text-on-surface-variant font-code-sm">(1 to 180 minutes)</span>
                </div>
              }
            </div>

            <!-- Spacer & CTA -->
            <div class="pt-6 border-t border-outline-variant mt-8">
              <button
                type="submit"
                [disabled]="!isValid() || starting()"
                class="w-full bg-[#ffb224] hover:bg-[#ffba47] disabled:opacity-50 text-[#000000] font-label-md text-label-md font-bold py-4 rounded transition-colors duration-150 flex justify-center items-center gap-2 group shadow-lg"
              >
                <span class="material-symbols-outlined fill-1" aria-hidden="true">lock</span>
                Lock In & Start Session
                <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform" aria-hidden="true">arrow_forward</span>
              </button>

              <!-- Helper Text -->
              <p class="text-center font-code-sm text-code-sm text-on-surface-variant mt-4 flex items-center justify-center gap-1.5 opacity-80">
                <span class="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
                AI and distractions will be locked until the timer ends.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  `
})
export class SessionSetupComponent {
  private sessionService = inject(SessionService);
  private router = inject(Router);

  protected topic = signal<string>('');
  protected durationPresets = [15, 30, 45, 60];
  protected selectedDuration = signal<number>(30);
  protected isCustom = signal<boolean>(false);
  protected customMinutes = signal<number>(25);

  protected starting = signal(false);

  selectPreset(preset: number): void {
    this.isCustom.set(false);
    this.selectedDuration.set(preset);
  }

  toggleCustom(): void {
    this.isCustom.set(true);
  }

  isValid(): boolean {
    if (!this.topic().trim()) return false;
    const dur = this.isCustom() ? this.customMinutes() : this.selectedDuration();
    return dur > 0;
  }

  async onStartSession(): Promise<void> {
    if (!this.isValid() || this.starting()) return;

    const duration = this.isCustom() ? this.customMinutes() : this.selectedDuration();
    this.starting.set(true);
    try {
      const session = await this.sessionService.startSession(this.topic(), duration);
      if (session.status === 'reflecting') {
        await this.router.navigate(['/session/reflect']);
        return;
      }
      await this.router.navigate(['/session/lock']);
    } catch (error) {
      console.error('[makini] Could not start a focus session.', error);
    } finally {
      this.starting.set(false);
    }
  }
}
