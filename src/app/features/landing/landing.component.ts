import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface LandingStep {
  title: string;
  description: string;
}

interface LearnerLevel {
  label: string;
  note: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-background text-on-background">
      <header class="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant">
        <div class="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <a routerLink="/" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <svg class="w-4.5 h-4.5 text-on-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19V11a4 4 0 0 1 8 0v8M12 11a4 4 0 0 1 8 0v8" />
              </svg>
            </div>
            <span class="text-lg font-bold tracking-tight text-on-surface">makini</span>
          </a>

          <nav class="hidden md:flex items-center gap-1.5 text-sm font-semibold text-on-surface">
            <a href="#how" class="px-3 py-2 rounded-lg hover:bg-primary-container hover:text-primary transition-colors">How it works</a>
            <a href="#levels" class="px-3 py-2 rounded-lg hover:bg-primary-container hover:text-primary transition-colors">Levels</a>
            <a href="#spaces" class="px-3 py-2 rounded-lg hover:bg-primary-container hover:text-primary transition-colors">Study spaces</a>
          </nav>

          <div class="flex items-center gap-2">
            <a routerLink="/sign-in" class="px-3 py-2 rounded-lg text-on-surface text-sm font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors">
              Sign in
            </a>
            <a routerLink="/sign-up" class="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary-fixed-dim transition-colors">
              Start
            </a>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14 space-y-14">
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <p class="inline-flex items-center px-3 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold">
              Focus-first learning
            </p>
            <h1 class="mt-4 text-3xl md:text-4xl font-bold leading-tight text-on-surface">
              Study first. AI later.
            </h1>
            <p class="mt-3 text-sm md:text-base text-on-surface-variant max-w-xl">
              Makini locks AI during your focus block, asks for a self-explanation, then unlocks guided AI feedback.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a routerLink="/sign-up" class="px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary-fixed-dim transition-colors">
                Start session
              </a>
              <a href="#how" class="px-5 py-3 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
                See flow
              </a>
            </div>
          </div>

          <div class="rounded-3xl p-2 bg-surface border border-outline-variant shadow-sm">
            <img src="assets/images/study_desk4.jpeg" alt="Makini focus study desk" class="w-full h-72 object-cover rounded-2xl" />
          </div>
        </section>

        <section id="how">
          <h2 class="text-xl md:text-2xl font-bold text-on-surface">How it works</h2>
          <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            @for (step of steps; track step.title; let i = $index) {
              <article class="rounded-2xl p-5 border border-outline-variant bg-surface">
                <p class="text-[11px] font-bold text-primary uppercase tracking-wider">0{{ i + 1 }}</p>
                <h3 class="mt-1 text-sm font-bold text-on-surface">{{ step.title }}</h3>
                <p class="mt-1 text-xs text-on-surface-variant">{{ step.description }}</p>
              </article>
            }
          </div>
        </section>

        <section id="levels">
          <h2 class="text-xl md:text-2xl font-bold text-on-surface">For every learner</h2>
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            @for (level of levels; track level.label) {
              <div class="rounded-2xl p-4 border border-outline-variant bg-surface-container">
                <p class="text-sm font-bold text-on-surface">{{ level.label }}</p>
                <p class="mt-1 text-xs text-on-surface-variant">{{ level.note }}</p>
              </div>
            }
          </div>
        </section>

        <section id="spaces">
          <h2 class="text-xl md:text-2xl font-bold text-on-surface">Study spaces</h2>
          <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            @for (image of images; track image.src) {
              <img [src]="image.src" [alt]="image.alt" class="w-full h-36 md:h-44 object-cover rounded-xl border border-outline-variant bg-surface" />
            }
          </div>
        </section>
      </main>
    </div>
  `
})
export class LandingComponent {
  readonly steps: LandingStep[] = [
    { title: 'Lock focus', description: 'Set topic + timer and keep AI out while you study.' },
    { title: 'Self-explain', description: 'Write what you understood before any AI help.' },
    { title: 'Unlock AI', description: 'Get guided feedback after reflection is complete.' }
  ];

  readonly levels: LearnerLevel[] = [
    { label: 'Kids', note: 'Short, playful focus sessions.' },
    { label: 'Teens', note: 'Exam prep with consistent study rhythm.' },
    { label: 'Campus', note: 'Deep research and concept mastery.' },
    { label: 'Lifelong', note: 'Upskilling with deliberate practice.' }
  ];

  readonly images = [
    { src: 'assets/images/study_desk1.jpeg', alt: 'Night study desk' },
    { src: 'assets/images/study_desk2.jpeg', alt: 'Creative desk setup' },
    { src: 'assets/images/study_desk3.jpeg', alt: 'Balcony study desk' },
    { src: 'assets/images/study_desk4.jpeg', alt: 'Planner study desk' }
  ];
}
