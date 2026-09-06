import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';
import { ClerkService } from 'ngx-clerk';
import { firstValueFrom } from 'rxjs';
import { toEpochMs } from '../../../shared/epoch';
import { DEFAULT_SOURCES } from '../../../shared/session-defaults';
import { Session, SessionReflection } from '../models/session.model';

export { DEFAULT_SOURCES };

const STORAGE_KEY_ACTIVE_SESSION = 'makini_active_session';
const STORAGE_KEY_SESSION_HISTORY = 'makini_session_history';
const STORAGE_KEY_IMPORTED = 'makini_sessions_imported';

interface SessionResponse {
  session: Session | null;
}

interface SessionListResponse {
  sessions: Session[];
}

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private clerk = inject(ClerkService, { optional: true });
  private isBrowser = isPlatformBrowser(this.platformId);

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private scratchpadTimer: ReturnType<typeof setTimeout> | null = null;
  private endingInFlight = false;
  private lastSignedIn: boolean | null = null;
  private hydrateChain: Promise<void> = Promise.resolve();
  private hydrateGen = 0;
  private readyResolve!: () => void;
  private markedReady = false;
  private readonly ready = new Promise<void>(resolve => {
    this.readyResolve = resolve;
  });

  readonly activeSession = signal<Session | null>(null);
  readonly sessionHistory = signal<Session[]>([]);
  readonly remainingSeconds = signal<number>(0);
  readonly isHydrating = signal<boolean>(false);

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
    if (!this.isBrowser) {
      this.markReady();
      return;
    }

    if (!this.clerk) {
      void this.hydrate();
      return;
    }

    effect(() => {
      const loaded = this.clerk?.isLoaded() ?? false;
      const signedIn = this.clerk?.isSignedIn() ?? false;
      untracked(() => {
        if (!loaded) return;
        if (signedIn) {
          if (this.lastSignedIn === true) return;
          this.lastSignedIn = true;
          void this.hydrate();
        } else {
          this.lastSignedIn = false;
          this.stopTimer();
          this.activeSession.set(null);
          this.sessionHistory.set([]);
          this.markReady();
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.scratchpadTimer) {
      clearTimeout(this.scratchpadTimer);
    }
  }

  whenReady(): Promise<void> {
    return this.ready.then(() => this.hydrateChain);
  }

  async hydrate(): Promise<void> {
    this.hydrateChain = this.runHydrate();
    await this.hydrateChain;
  }

  private async runHydrate(): Promise<void> {
    if (!this.isBrowser) {
      this.markReady();
      return;
    }

    const gen = ++this.hydrateGen;
    this.isHydrating.set(true);
    try {
      await this.importLegacyLocalData();

      const [activeRes, historyRes] = await Promise.all([
        firstValueFrom(this.http.get<SessionResponse>('/api/sessions/active')),
        firstValueFrom(this.http.get<SessionListResponse>('/api/sessions'))
      ]);

      if (gen !== this.hydrateGen) {
        return;
      }

      const incoming = activeRes.session;
      const local = this.activeSession();
      // A just-started Pomodoro must not be wiped by a stale hydrate response.
      if (
        !incoming &&
        local &&
        (local.status === 'locked' || local.status === 'reflecting')
      ) {
        this.initTimerFromActiveSession();
      } else {
        this.activeSession.set(incoming);
        this.initTimerFromActiveSession();
      }
      this.sessionHistory.set(historyRes.sessions ?? []);
    } catch (error) {
      console.error('[makini] Failed to load sessions from the server.', error);
    } finally {
      if (gen === this.hydrateGen) {
        this.isHydrating.set(false);
      }
      this.lastSignedIn = true;
      this.markReady();
    }
  }

  async startSession(
    topic: string,
    plannedMinutes: number,
    retried = false
  ): Promise<Session> {
    if (!this.markedReady) {
      await this.whenReady();
    }
    this.hydrateGen++;
    this.stopTimer();

    // Sources are resolved server-side from the topic (DuckDuckGo + AI denylist).
    const body = {
      topic: topic.trim() || 'Deep Focus Exploration',
      plannedMinutes: plannedMinutes || 25
    };

    try {
      const res = await firstValueFrom(this.http.post<SessionResponse>('/api/sessions', body));
      if (!res.session || res.session.status !== 'locked') {
        throw new Error('Server did not return a locked focus session.');
      }
      return this.activateLockedSession(res.session, true);
    } catch (error) {
      const conflict = this.conflictSession(error);
      if (!conflict) {
        throw error;
      }

      // Starting from setup means "new Pomodoro". Clear any unfinished blocker
      // (stuck lock or abandoned Feynman reflection) and create the new session.
      if (!retried && (conflict.status === 'locked' || conflict.status === 'reflecting')) {
        await this.cancelSession(conflict);
        return this.startSession(topic, plannedMinutes, true);
      }

      this.activeSession.set(conflict);
      if (conflict.status === 'locked') {
        this.initTimerFromActiveSession();
      } else {
        this.remainingSeconds.set(0);
      }
      return conflict;
    }
  }

  /** Removes an unfinished session so a new Pomodoro can start. */
  async cancelSession(session: Session): Promise<void> {
    this.stopTimer();
    try {
      await firstValueFrom(this.http.post<{ ok: boolean }>(`/api/sessions/${session.id}/cancel`, {}));
    } catch (error) {
      console.error('[makini] Failed to cancel unfinished session.', error);
      throw error;
    }

    if (this.activeSession()?.id === session.id) {
      this.activeSession.set(null);
      this.remainingSeconds.set(0);
    }
  }

  updateScratchpad(notes: string): void {
    const current = this.activeSession();
    if (!current || current.status !== 'locked') return;

    this.activeSession.set({ ...current, scratchpadNotes: notes });

    if (this.scratchpadTimer) {
      clearTimeout(this.scratchpadTimer);
    }
    this.scratchpadTimer = setTimeout(() => {
      void firstValueFrom(
        this.http.patch<SessionResponse>(`/api/sessions/${current.id}/scratchpad`, { notes })
      ).catch(err => console.error('[makini] Failed to save scratchpad.', err));
    }, 400);
  }

  async endSessionEarly(): Promise<void> {
    const current = this.activeSession();
    if (!current || current.status !== 'locked') return;
    await this.persistEnd(current);
  }

  async submitReflection(reflection: SessionReflection): Promise<void> {
    const current = this.activeSession();
    if (!current) return;

    const res = await firstValueFrom(
      this.http.post<SessionResponse>(`/api/sessions/${current.id}/reflection`, reflection)
    );
    const completed = res.session!;
    this.activeSession.set(completed);
    this.sessionHistory.set([
      completed,
      ...this.sessionHistory().filter(session => session.id !== completed.id)
    ]);
  }

  reviewSession(session: Session): void {
    this.stopTimer();
    this.remainingSeconds.set(0);
    this.activeSession.set(session);
  }

  resetActiveSession(): void {
    this.stopTimer();
    this.activeSession.set(null);
    this.remainingSeconds.set(0);
  }

  private async persistEnd(session: Session): Promise<void> {
    if (this.endingInFlight) return;
    this.endingInFlight = true;
    this.stopTimer();
    this.remainingSeconds.set(0);

    try {
      const res = await firstValueFrom(
        this.http.post<SessionResponse>(`/api/sessions/${session.id}/end`, {})
      );
      this.activeSession.set(res.session);
    } catch (error) {
      console.error('[makini] Failed to end session on the server.', error);
      this.activeSession.set({ ...session, status: 'reflecting', endedAt: Date.now() });
    } finally {
      this.endingInFlight = false;
    }
  }

  private activateLockedSession(session: Session, preferLocalClock = false): Session {
    this.activeSession.set(session);
    let remaining = this.remainingFor(session);
    let origin: number | string = session.startedAt;

    if (remaining <= 0 && preferLocalClock) {
      remaining = Math.max(1, session.plannedMinutes) * 60;
      origin = Date.now();
    }

    this.remainingSeconds.set(Math.max(0, remaining));
    if (remaining <= 0) {
      void this.persistEnd(session);
    } else {
      this.startTimer(origin, session.plannedMinutes);
    }
    return session;
  }

  private initTimerFromActiveSession(): void {
    const session = this.activeSession();
    if (!session || session.status !== 'locked') {
      this.stopTimer();
      this.remainingSeconds.set(0);
      return;
    }

    this.activateLockedSession(session);
  }

  private startTimer(startedAt: number | string, plannedMinutes: number): void {
    this.stopTimer();
    if (!this.isBrowser) return;

    const origin = toEpochMs(startedAt);
    const totalSeconds = Math.max(1, plannedMinutes) * 60;

    const tick = (): void => {
      const remaining = totalSeconds - Math.floor((Date.now() - origin) / 1000);

      if (remaining <= 0) {
        const current = this.activeSession();
        if (current && current.status === 'locked') {
          void this.persistEnd(current);
        } else {
          this.remainingSeconds.set(0);
          this.stopTimer();
        }
        return;
      }

      this.remainingSeconds.set(remaining);
    };

    tick();
    this.timerInterval = setInterval(tick, 250);
  }

  private remainingFor(session: Session): number {
    const totalSeconds = Math.max(1, session.plannedMinutes) * 60;
    const elapsedSeconds = Math.floor((Date.now() - toEpochMs(session.startedAt)) / 1000);
    return totalSeconds - elapsedSeconds;
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private markReady(): void {
    if (this.markedReady) return;
    this.markedReady = true;
    this.readyResolve();
  }

  private conflictSession(error: unknown): Session | null {
    if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
    const body = error.error as SessionResponse | undefined;
    return body?.session ?? null;
  }

  private async importLegacyLocalData(): Promise<void> {
    if (!this.isBrowser) return;
    if (localStorage.getItem(STORAGE_KEY_IMPORTED) === '1') return;

    const collected: Session[] = [];
    try {
      const historyRaw = localStorage.getItem(STORAGE_KEY_SESSION_HISTORY);
      if (historyRaw) {
        const parsed = JSON.parse(historyRaw) as Session[];
        if (Array.isArray(parsed)) collected.push(...parsed);
      }
      const activeRaw = localStorage.getItem(STORAGE_KEY_ACTIVE_SESSION);
      if (activeRaw) {
        collected.push(JSON.parse(activeRaw) as Session);
      }
    } catch {
      localStorage.setItem(STORAGE_KEY_IMPORTED, '1');
      return;
    }

    const completed = collected.filter(
      session => session?.status === 'completed' && session.reflection?.text
    );
    if (completed.length === 0) {
      localStorage.setItem(STORAGE_KEY_IMPORTED, '1');
      return;
    }

    try {
      await firstValueFrom(this.http.post('/api/sessions/import', { sessions: completed }));
      localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
      localStorage.removeItem(STORAGE_KEY_SESSION_HISTORY);
      localStorage.setItem(STORAGE_KEY_IMPORTED, '1');
    } catch (error) {
      console.warn('[makini] Could not import local session history.', error);
    }
  }
}
