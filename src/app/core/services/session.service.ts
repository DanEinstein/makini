import { Injectable, signal, computed, PLATFORM_ID, inject, NgZone, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Session, SessionReflection, SourceLink } from '../models/session.model';

const STORAGE_KEY_ACTIVE_SESSION = 'makini_active_session';
const STORAGE_KEY_SESSION_HISTORY = 'makini_session_history';

export const DEFAULT_SOURCES: SourceLink[] = [
  {
    title: 'MDN Docs',
    description: 'Core documentation on functions, syntax, and execution environments.',
    url: 'https://developer.mozilla.org',
    icon: 'description'
  },
  {
    title: 'Google Scholar',
    description: 'Academic papers on computational theory, algorithms, and cognitive science.',
    url: 'https://scholar.google.com',
    icon: 'school'
  },
  {
    title: 'Wikipedia',
    description: 'Overview of foundational principles, proofs, and historical context.',
    url: 'https://wikipedia.org',
    icon: 'language'
  }
];

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private isBrowser = isPlatformBrowser(this.platformId);

  private timerInterval: any = null;

  readonly activeSession = signal<Session | null>(this.loadActiveSession());
  readonly sessionHistory = signal<Session[]>(this.loadSessionHistory());
  
  readonly remainingSeconds = signal<number>(0);

  readonly status = computed(() => this.activeSession()?.status ?? 'idle');
  readonly isLocked = computed(() => this.status() === 'locked');
  readonly isReflecting = computed(() => this.status() === 'reflecting');
  readonly isCompleted = computed(() => this.status() === 'completed');
  readonly canAccessAIPanel = computed(() => this.status() === 'completed');

  readonly formattedTime = computed(() => {
    const totalSec = Math.max(0, this.remainingSeconds());
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  readonly progressPercentage = computed(() => {
    const session = this.activeSession();
    if (!session || session.plannedMinutes <= 0) return 0;
    const totalSeconds = session.plannedMinutes * 60;
    const elapsed = totalSeconds - this.remainingSeconds();
    const percent = Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
    return Math.round(percent);
  });

  constructor() {
    if (this.isBrowser) {
      this.initTimerFromActiveSession();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  startSession(topic: string, plannedMinutes: number, customSources?: SourceLink[]): Session {
    this.stopTimer();

    const now = Date.now();
    const newSession: Session = {
      id: 'ses_' + Math.random().toString(36).substring(2, 9),
      topic: topic.trim() || 'Deep Focus Exploration',
      plannedMinutes: plannedMinutes || 25,
      startedAt: now,
      status: 'locked',
      scratchpadNotes: '',
      sources: customSources && customSources.length > 0 ? customSources : DEFAULT_SOURCES
    };

    this.activeSession.set(newSession);
    this.remainingSeconds.set(newSession.plannedMinutes * 60);
    this.saveActiveSession(newSession);
    this.startTimer(newSession.startedAt, newSession.plannedMinutes);

    return newSession;
  }

  updateScratchpad(notes: string): void {
    const current = this.activeSession();
    if (!current) return;

    const updated: Session = {
      ...current,
      scratchpadNotes: notes
    };
    this.activeSession.set(updated);
    this.saveActiveSession(updated);
  }

  endSessionEarly(): void {
    this.stopTimer();
    const current = this.activeSession();
    if (!current) return;

    const updated: Session = {
      ...current,
      status: 'reflecting',
      endedAt: Date.now()
    };
    this.activeSession.set(updated);
    this.remainingSeconds.set(0);
    this.saveActiveSession(updated);
  }

  submitReflection(reflection: SessionReflection): void {
    const current = this.activeSession();
    if (!current) return;

    const completedSession: Session = {
      ...current,
      status: 'completed',
      endedAt: current.endedAt || Date.now(),
      reflection
    };

    this.activeSession.set(completedSession);
    this.saveActiveSession(completedSession);

    // Also persist into session history
    const history = [completedSession, ...this.sessionHistory().filter(s => s.id !== completedSession.id)];
    this.sessionHistory.set(history);
    this.saveSessionHistory(history);
  }

  resetActiveSession(): void {
    this.stopTimer();
    this.activeSession.set(null);
    this.remainingSeconds.set(0);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    }
  }

  private initTimerFromActiveSession(): void {
    const session = this.activeSession();
    if (!session) return;

    if (session.status === 'locked') {
      const totalSeconds = session.plannedMinutes * 60;
      const elapsedSeconds = Math.floor((Date.now() - session.startedAt) / 1000);
      const remaining = totalSeconds - elapsedSeconds;

      if (remaining <= 0) {
        // Timer completed while away
        this.remainingSeconds.set(0);
        const updated: Session = {
          ...session,
          status: 'reflecting',
          endedAt: session.startedAt + totalSeconds * 1000
        };
        this.activeSession.set(updated);
        this.saveActiveSession(updated);
      } else {
        this.remainingSeconds.set(remaining);
        this.startTimer(session.startedAt, session.plannedMinutes);
      }
    } else {
      this.remainingSeconds.set(0);
    }
  }

  private startTimer(startedAt: number, plannedMinutes: number): void {
    this.stopTimer();
    if (!this.isBrowser) return;

    const totalSeconds = plannedMinutes * 60;

    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = totalSeconds - elapsedSeconds;

        this.ngZone.run(() => {
          if (remaining <= 0) {
            this.remainingSeconds.set(0);
            this.stopTimer();
            const current = this.activeSession();
            if (current && current.status === 'locked') {
              const updated: Session = {
                ...current,
                status: 'reflecting',
                endedAt: Date.now()
              };
              this.activeSession.set(updated);
              this.saveActiveSession(updated);
            }
          } else {
            this.remainingSeconds.set(remaining);
          }
        });
      }, 500);
    });
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private loadActiveSession(): Session | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private saveActiveSession(session: Session): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save active session to localStorage', e);
    }
  }

  private loadSessionHistory(): Session[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSION_HISTORY);
      if (raw) return JSON.parse(raw);
    } catch {}

    // Initial mock history for demo and testing analytics
    return this.getMockHistory();
  }

  private saveSessionHistory(history: Session[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY_SESSION_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save session history to localStorage', e);
    }
  }

  private getMockHistory(): Session[] {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return [
      {
        id: 'ses_mock_1',
        topic: 'Recursive Call Stacks',
        plannedMinutes: 30,
        startedAt: now - day,
        endedAt: now - day + 30 * 60 * 1000,
        status: 'completed',
        scratchpadNotes: 'Where does stack overflow occur in deep recursion?',
        sources: DEFAULT_SOURCES,
        reflection: {
          text: 'A recursive function must have a clear base case and a step that reduces input size. Each call adds a frame until unwinding starts.',
          selfCheck: {
            explainWithoutNotes: true,
            identifyEdgeCases: true,
            teachSomeoneElse: true
          },
          confidenceRating: 4,
          submittedAt: now - day + 35 * 60 * 1000
        }
      }
    ];
  }
}
