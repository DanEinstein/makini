import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClerkService } from 'ngx-clerk';
import { vi } from 'vitest';
import { SessionService } from './session.service';
import { Session } from '../models/session.model';

describe('SessionService', () => {
  let service!: SessionService;
  let httpTesting!: HttpTestingController;

  async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  function lockedSession(
    overrides: Partial<Omit<Session, 'startedAt'>> & { startedAt?: number | string } = {}
  ): Session {
    return {
      id: '11111111-1111-4111-8111-111111111111',
      topic: 'Focus',
      plannedMinutes: 25,
      startedAt: Date.now(),
      status: 'locked',
      scratchpadNotes: '',
      sources: [],
      ...overrides
    } as Session;
  }

  async function startLocked(topic: string, minutes: number, session: Session): Promise<Session> {
    const pending = service.startSession(topic, minutes);
    await flushMicrotasks();
    httpTesting.expectOne('/api/sessions').flush({ session });
    return pending;
  }

  beforeEach(async () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: ClerkService, useValue: null }
      ]
    });
    service = TestBed.inject(SessionService);
    httpTesting = TestBed.inject(HttpTestingController);

    await new Promise(resolve => setTimeout(resolve, 0));
    httpTesting.expectOne('/api/sessions/active').flush({ session: null });
    httpTesting.expectOne('/api/sessions').flush({ sessions: [] });
    await service.whenReady();
  });

  afterEach(() => {
    service.resetActiveSession();
    httpTesting.verify();
    localStorage.clear();
  });

  it('should be created and start idle after hydrate', async () => {
    await service.whenReady();
    expect(service).toBeTruthy();
    expect(service.status()).toBe('idle');
  });

  it('should start a new session, lock state, and persist via the API', async () => {
    const pending = service.startSession('Call Stack Optimization', 25);
    await flushMicrotasks();
    const req = httpTesting.expectOne('/api/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.topic).toBe('Call Stack Optimization');
    req.flush({
      session: lockedSession({
        topic: 'Call Stack Optimization',
        plannedMinutes: 25
      })
    });

    const session = await pending;
    expect(session.topic).toBe('Call Stack Optimization');
    expect(service.isLocked()).toBe(true);
    expect(service.remainingSeconds()).toBe(25 * 60);
  });

  it('cancels a leftover reflecting session and starts a fresh pomodoro', async () => {
    const pending = service.startSession('Fresh Pomodoro', 25);
    await flushMicrotasks();

    httpTesting.expectOne('/api/sessions').flush(
      {
        error: 'An active focus session is already in progress.',
        session: lockedSession({
          id: '77777777-7777-4777-8777-777777777777',
          topic: 'Abandoned reflection',
          status: 'reflecting',
          plannedMinutes: 25
        })
      },
      { status: 409, statusText: 'Conflict' }
    );

    await flushMicrotasks();
    httpTesting
      .expectOne('/api/sessions/77777777-7777-4777-8777-777777777777/cancel')
      .flush({ ok: true, id: '77777777-7777-4777-8777-777777777777' });

    await flushMicrotasks();
    httpTesting.expectOne('/api/sessions').flush({
      session: lockedSession({
        id: '88888888-8888-4888-8888-888888888888',
        topic: 'Fresh Pomodoro',
        plannedMinutes: 25
      })
    });

    const session = await pending;
    expect(session.topic).toBe('Fresh Pomodoro');
    expect(session.status).toBe('locked');
    expect(service.isLocked()).toBe(true);
  });

  it('counts down remaining pomodoro time after a session starts', async () => {
    const now = Date.parse('2026-09-04T16:00:00.000Z');
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'Date'] });
    vi.setSystemTime(now);
    try {
      await startLocked(
        'Pomodoro Focus',
        25,
        lockedSession({
          id: '55555555-5555-4555-8555-555555555555',
          topic: 'Pomodoro Focus',
          plannedMinutes: 25,
          startedAt: now
        })
      );
      expect(service.formattedTime()).toBe('25:00');

      vi.advanceTimersByTime(1000);
      expect(service.remainingSeconds()).toBe(25 * 60 - 1);
      expect(service.formattedTime()).toBe('24:59');
    } finally {
      vi.useRealTimers();
    }
  });

  it('still counts down when startedAt arrives as an ISO string', async () => {
    const now = Date.parse('2026-09-04T16:00:00.000Z');
    vi.useFakeTimers({ toFake: ['setInterval', 'setTimeout', 'Date'] });
    vi.setSystemTime(now);
    try {
      await startLocked(
        'ISO Clock',
        15,
        lockedSession({
          id: '66666666-6666-4666-8666-666666666666',
          topic: 'ISO Clock',
          plannedMinutes: 15,
          startedAt: new Date(now).toISOString()
        })
      );
      expect(service.formattedTime()).toBe('15:00');
      vi.advanceTimersByTime(2000);
      expect(service.formattedTime()).toBe('14:58');
    } finally {
      vi.useRealTimers();
    }
  });

  it('should update scratchpad notes locally and persist after debounce', async () => {
    await startLocked(
      'Recursion',
      30,
      lockedSession({
        id: '22222222-2222-4222-8222-222222222222',
        topic: 'Recursion',
        plannedMinutes: 30
      })
    );

    service.updateScratchpad('Question: how are tail calls unwound?');
    expect(service.activeSession()?.scratchpadNotes).toBe('Question: how are tail calls unwound?');

    await new Promise(resolve => setTimeout(resolve, 450));
    const saveReq = httpTesting.expectOne(
      '/api/sessions/22222222-2222-4222-8222-222222222222/scratchpad'
    );
    expect(saveReq.request.method).toBe('PATCH');
    saveReq.flush({
      session: {
        id: '22222222-2222-4222-8222-222222222222',
        topic: 'Recursion',
        plannedMinutes: 30,
        startedAt: Date.now(),
        status: 'locked',
        scratchpadNotes: 'Question: how are tail calls unwound?',
        sources: []
      }
    });
  });

  it('should end session early into reflecting status', async () => {
    await startLocked(
      'Recursion',
      30,
      lockedSession({
        id: '33333333-3333-4333-8333-333333333333',
        topic: 'Recursion',
        plannedMinutes: 30
      })
    );

    const pendingEnd = service.endSessionEarly();
    const endReq = httpTesting.expectOne(
      '/api/sessions/33333333-3333-4333-8333-333333333333/end'
    );
    expect(endReq.request.method).toBe('POST');
    endReq.flush({
      session: {
        id: '33333333-3333-4333-8333-333333333333',
        topic: 'Recursion',
        plannedMinutes: 30,
        startedAt: Date.now(),
        endedAt: Date.now(),
        status: 'reflecting',
        scratchpadNotes: '',
        sources: []
      }
    });
    await pendingEnd;

    expect(service.status()).toBe('reflecting');
    expect(service.isReflecting()).toBe(true);
  });

  it('should submit reflection, unlock AI panel, and record in history', async () => {
    await startLocked(
      'Superposition',
      15,
      lockedSession({
        id: '44444444-4444-4444-8444-444444444444',
        topic: 'Superposition',
        plannedMinutes: 15
      })
    );

    const pendingEnd = service.endSessionEarly();
    httpTesting
      .expectOne('/api/sessions/44444444-4444-4444-8444-444444444444/end')
      .flush({
        session: {
          id: '44444444-4444-4444-8444-444444444444',
          topic: 'Superposition',
          plannedMinutes: 15,
          startedAt: Date.now(),
          endedAt: Date.now(),
          status: 'reflecting',
          scratchpadNotes: '',
          sources: []
        }
      });
    await pendingEnd;

    const pendingReflect = service.submitReflection({
      text: 'Quantum states collapse under measurement.',
      selfCheck: {
        explainWithoutNotes: true,
        identifyEdgeCases: true,
        teachSomeoneElse: true
      },
      confidenceRating: 5,
      submittedAt: Date.now(),
      inputMode: 'typed'
    });
    httpTesting
      .expectOne('/api/sessions/44444444-4444-4444-8444-444444444444/reflection')
      .flush({
        session: {
          id: '44444444-4444-4444-8444-444444444444',
          topic: 'Superposition',
          plannedMinutes: 15,
          startedAt: Date.now(),
          endedAt: Date.now(),
          status: 'completed',
          scratchpadNotes: '',
          sources: [],
          reflection: {
            text: 'Quantum states collapse under measurement.',
            selfCheck: {
              explainWithoutNotes: true,
              identifyEdgeCases: true,
              teachSomeoneElse: true
            },
            confidenceRating: 5,
            submittedAt: Date.now(),
            inputMode: 'typed'
          }
        }
      });
    await pendingReflect;

    expect(service.status()).toBe('completed');
    expect(service.canAccessAIPanel()).toBe(true);
    expect(service.sessionHistory().length).toBeGreaterThan(0);
    expect(service.sessionHistory()[0].reflection?.text).toBe(
      'Quantum states collapse under measurement.'
    );
  });
});
