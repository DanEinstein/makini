import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClerkService } from 'ngx-clerk';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;
  let httpTesting: HttpTestingController;

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

    const req = httpTesting.expectOne('/api/sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.topic).toBe('Call Stack Optimization');
    req.flush({
      session: {
        id: '11111111-1111-4111-8111-111111111111',
        topic: 'Call Stack Optimization',
        plannedMinutes: 25,
        startedAt: Date.now(),
        status: 'locked',
        scratchpadNotes: '',
        sources: []
      }
    });

    const session = await pending;
    expect(session.topic).toBe('Call Stack Optimization');
    expect(service.isLocked()).toBe(true);
    expect(service.remainingSeconds()).toBe(25 * 60);
  });

  it('should update scratchpad notes locally and persist after debounce', async () => {
    const pending = service.startSession('Recursion', 30);
    httpTesting.expectOne('/api/sessions').flush({
      session: {
        id: '22222222-2222-4222-8222-222222222222',
        topic: 'Recursion',
        plannedMinutes: 30,
        startedAt: Date.now(),
        status: 'locked',
        scratchpadNotes: '',
        sources: []
      }
    });
    await pending;

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
    const pendingStart = service.startSession('Recursion', 30);
    httpTesting.expectOne('/api/sessions').flush({
      session: {
        id: '33333333-3333-4333-8333-333333333333',
        topic: 'Recursion',
        plannedMinutes: 30,
        startedAt: Date.now(),
        status: 'locked',
        scratchpadNotes: '',
        sources: []
      }
    });
    await pendingStart;

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
    const pendingStart = service.startSession('Superposition', 15);
    httpTesting.expectOne('/api/sessions').flush({
      session: {
        id: '44444444-4444-4444-8444-444444444444',
        topic: 'Superposition',
        plannedMinutes: 15,
        startedAt: Date.now(),
        status: 'locked',
        scratchpadNotes: '',
        sources: []
      }
    });
    await pendingStart;

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
