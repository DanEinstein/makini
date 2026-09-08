import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReflectionComponent } from './reflection.component';
import { SessionService } from '../../core/services/session.service';
import { ReflectionGrade, Session } from '../../core/models/session.model';

const SESSION_ID = 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

function reflectingSession(): Session {
  return {
    id: SESSION_ID,
    topic: 'Recursion',
    plannedMinutes: 25,
    startedAt: Date.now(),
    status: 'reflecting',
    scratchpadNotes: '',
    sources: []
  };
}

describe('ReflectionComponent', () => {
  let httpTesting: HttpTestingController;
  let active: ReturnType<typeof signal<Session | null>>;

  beforeEach(async () => {
    active = signal<Session | null>(reflectingSession());
    const sessionService = {
      activeSession: active,
      submitReflection: async () => {
        const current = active()!;
        active.set({
          ...current,
          status: 'completed',
          reflection: {
            text: 'Recursion is a function that calls itself with a base case.',
            selfCheck: {
              explainWithoutNotes: true,
              identifyEdgeCases: true,
              teachSomeoneElse: true
            },
            confidenceRating: 4,
            submittedAt: Date.now(),
            inputMode: 'typed' as const
          }
        });
      },
      gradeReflection: async () => ({
        grade: {
          score: 72,
          verdict: 'proceed',
          covered: ['base case'],
          missed: ['stack frames'],
          note: 'Solid start.'
        } satisfies ReflectionGrade,
        summary: 'Recursion needs a base case.'
      })
    };

    TestBed.configureTestingModule({
      imports: [ReflectionComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SessionService, useValue: sessionService }
      ]
    });
    TestBed.overrideComponent(ReflectionComponent, {
      set: { imports: [FormsModule], template: '<div></div>' }
    });
    await TestBed.compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('does not request a source summary until the explanation is submitted', async () => {
    const fixture = TestBed.createComponent(ReflectionComponent);
    fixture.detectChanges();
    httpTesting.expectNone(req => req.url.includes('/source-summary'));

    const component = fixture.componentInstance;
    component.reflectionText.set('Recursion is a function that calls itself with a base case.');
    component.selfCheck.explainWithoutNotes = true;
    component.selfCheck.identifyEdgeCases = true;
    component.selfCheck.teachSomeoneElse = true;
    component.setConfidence(4);

    const pending = component.onSubmitReflection();
    await Promise.resolve();
    const summaryReq = httpTesting.expectOne(`/api/sessions/${SESSION_ID}/source-summary`);
    expect(summaryReq.request.method).toBe('POST');
    summaryReq.flush({ summary: 'Recursion needs a base case.' });
    await pending;
  });
});
