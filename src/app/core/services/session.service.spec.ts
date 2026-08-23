import { TestBed } from '@angular/core/testing';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created and start with idle/mock state', () => {
    expect(service).toBeTruthy();
  });

  it('should start a new session, lock state, and persist to localStorage', () => {
    const session = service.startSession('Call Stack Optimization', 25);
    expect(session.topic).toBe('Call Stack Optimization');
    expect(session.plannedMinutes).toBe(25);
    expect(service.isLocked()).toBe(true);
    expect(service.remainingSeconds()).toBe(25 * 60);

    const saved = JSON.parse(localStorage.getItem('makini_active_session') || '{}');
    expect(saved.topic).toBe('Call Stack Optimization');
  });

  it('should update scratchpad notes and save to active session', () => {
    service.startSession('Recursion', 30);
    service.updateScratchpad('Question: how are tail calls unwound?');

    expect(service.activeSession()?.scratchpadNotes).toBe('Question: how are tail calls unwound?');
    const saved = JSON.parse(localStorage.getItem('makini_active_session') || '{}');
    expect(saved.scratchpadNotes).toBe('Question: how are tail calls unwound?');
  });

  it('should end session early into reflecting status', () => {
    service.startSession('Recursion', 30);
    service.endSessionEarly();

    expect(service.status()).toBe('reflecting');
    expect(service.isReflecting()).toBe(true);
  });

  it('should submit reflection, unlock AI panel, and record in history', () => {
    service.startSession('Superposition', 15);
    service.submitReflection({
      text: 'Quantum states collapse under measurement.',
      selfCheck: {
        explainWithoutNotes: true,
        identifyEdgeCases: true,
        teachSomeoneElse: true
      },
      confidenceRating: 5,
      submittedAt: Date.now()
    });

    expect(service.status()).toBe('completed');
    expect(service.canAccessAIPanel()).toBe(true);
    expect(service.sessionHistory().length).toBeGreaterThan(0);
    expect(service.sessionHistory()[0].reflection?.text).toBe('Quantum states collapse under measurement.');
  });
});
