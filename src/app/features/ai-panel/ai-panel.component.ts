import { Component, inject, signal, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../core/services/session.service';
import { ChatService } from '../../core/services/chat.service';
import { StatsService } from '../../core/services/stats.service';
import { SideNavComponent } from '../../shared/components/app-nav/side-nav.component';
import { TopBarComponent } from '../../shared/components/app-nav/top-bar.component';
import { ApiKeyModalComponent } from '../../shared/components/api-key-modal/api-key-modal.component';
import { ConfidenceChartComponent } from '../../shared/components/confidence-chart/confidence-chart.component';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [
    FormsModule,
    SideNavComponent,
    TopBarComponent,
    ApiKeyModalComponent,
    ConfidenceChartComponent
  ],
  template: `
    <div class="bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <!-- Side Navigation -->
      <app-side-nav class="hidden md:flex" />

      <!-- Main Content Area -->
      <div class="flex-1 ml-0 md:ml-64 flex flex-col h-screen relative overflow-y-auto">
        <!-- Top App Bar -->
        <app-top-bar
          title="AI Tutor Workspace"
          subtitle="Synthesis & Sparring"
          [aiRuntimeStatus]="runtimeStatusLabel()"
          (openApiKeyModal)="showApiKeyModal.set(true)"
        />

        <!-- Content Canvas -->
        <main class="flex-1 mt-16 pt-6 pb-20 px-4 md:px-margin-desktop w-full max-w-container-max mx-auto flex flex-col gap-8">
          <!-- Active Session Notice Banner if unlocked -->
          @if (sessionService.activeSession(); as active) {
            <div class="bg-surface-container-high/60 border border-secondary/30 rounded-lg px-4 py-3 flex items-center justify-between">
              <div class="flex items-center gap-3 text-xs md:text-sm">
                <span class="material-symbols-outlined text-secondary text-[20px]">lock_open</span>
                <span>Unlocked from focus session on: <strong class="text-primary">{{ active.topic }}</strong></span>
              </div>
              <span class="font-code-sm text-xs text-secondary bg-secondary/10 px-2 py-1 rounded">Reflection Verified</span>
            </div>
          }

          <!-- Top Section: Split Workspace Panel -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[620px]">
            <!-- Left Panel: Your Reflection & Scratchpad (5 cols) -->
            <div class="lg:col-span-5 bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-lg p-6 flex flex-col h-full overflow-hidden">
              <h2 class="font-headline-md text-headline-sm md:text-headline-md text-primary mb-5 flex items-center gap-2 font-bold">
                <span class="material-symbols-outlined">edit_note</span>
                Your Reflection
              </h2>

              <div class="flex-grow overflow-y-auto pr-2 space-y-6">
                <!-- Previous Phase Notes -->
                <div>
                  <h3 class="font-label-md text-label-md text-on-surface-variant mb-2 uppercase tracking-widest text-xs font-semibold">
                    Submitted Synthesis
                  </h3>
                  <div class="bg-[#0D1117] border border-outline-variant rounded p-4 text-on-surface font-body-md text-sm leading-relaxed whitespace-pre-wrap">
                    {{ reflectionText() }}
                  </div>
                </div>

                <!-- Hold Your Thoughts / Scratchpad Questions -->
                <div>
                  <h3 class="font-label-md text-label-md text-on-surface-variant mb-3 uppercase tracking-widest text-xs font-semibold">
                    Scratchpad Questions (Click to Ask)
                  </h3>
                  
                  @if (scratchpadQuestions().length > 0) {
                    <div class="space-y-3">
                      @for (q of scratchpadQuestions(); track $index) {
                        <button
                          type="button"
                          (click)="populatePrompt(q)"
                          class="w-full text-left p-3 border border-[#30363D] rounded bg-[#10141a] hover:bg-surface-container-high transition-colors cursor-pointer border-l-2"
                          [class.border-l-secondary]="$index % 2 === 0"
                          [class.border-l-primary]="$index % 2 !== 0"
                        >
                          <p class="font-body-md text-on-surface text-sm">{{ q }}</p>
                        </button>
                      }
                    </div>
                  } @else {
                    <div class="p-3 border border-dashed border-[#30363D] rounded text-xs text-on-surface-variant/70">
                      No scratchpad notes recorded for this session.
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Right Panel: AI Workspace & Chat (7 cols) -->
            <div class="lg:col-span-7 bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-lg flex flex-col h-full border-l-2 border-l-primary relative overflow-hidden">
              <!-- AI Header -->
              <div class="p-4 border-b border-white/10 bg-[#21262D]/60 flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-outlined text-primary">smart_toy</span>
                  <h2 class="font-label-md text-label-md text-on-surface font-semibold">AI Synthesis & Sparring</h2>
                </div>

                <div class="flex items-center gap-3">
                  <span
                    class="inline-flex items-center gap-1.5 text-xs font-code-sm px-2.5 py-1 rounded border"
                    [class.text-secondary]="runtimeConnected()"
                    [class.border-secondary/30]="runtimeConnected()"
                    [class.bg-secondary/10]="runtimeConnected()"
                    [class.text-error]="!runtimeConnected()"
                    [class.border-error/40]="!runtimeConnected()"
                    [class.bg-error-container/20]="!runtimeConnected()"
                  >
                    <span class="w-2 h-2 rounded-full" [class.bg-secondary]="runtimeConnected()" [class.bg-error]="!runtimeConnected()"></span>
                    Groq: {{ runtimeStatusLabel() }}
                  </span>

                  <button
                    type="button"
                    (click)="showApiKeyModal.set(true)"
                    class="text-xs font-code-sm text-on-surface-variant hover:text-primary hover:underline"
                  >
                    Runtime info
                  </button>
                </div>
              </div>

              <!-- Chat Feed -->
              <div #chatContainer class="flex-grow overflow-y-auto p-5 md:p-6 space-y-5 bg-[#0a0e14]/40">
                @for (msg of chatService.messages(); track msg.id) {
                  @if (msg.role === 'assistant') {
                    <!-- AI Message -->
                    <div class="flex gap-3.5">
                      <div class="w-8 h-8 rounded bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5">
                        <span class="material-symbols-outlined text-sm fill-1">auto_awesome</span>
                      </div>
                      <div class="flex-1 max-w-[90%]">
                        <div class="bg-[#161B22] border border-[#30363D] rounded-lg p-4 font-body-md text-on-surface text-sm leading-relaxed border-l-2 border-l-primary">
                          <p class="whitespace-pre-wrap">{{ msg.content }}</p>
                        </div>
                        <span class="text-[10px] font-code-sm text-on-surface-variant/60 mt-1 block pl-1">
                          {{ msg.model || 'AI Tutor' }}
                        </span>
                      </div>
                    </div>
                  } @else {
                    <!-- User Message -->
                    <div class="flex gap-3.5 flex-row-reverse">
                      <div class="w-8 h-8 rounded bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 mt-0.5">
                        <span class="material-symbols-outlined text-sm text-on-surface-variant">person</span>
                      </div>
                      <div class="flex-1 flex flex-col items-end max-w-[85%]">
                        <div class="bg-[#21262D] border border-[#30363D] rounded-lg p-4 font-body-md text-on-surface text-sm leading-relaxed">
                          <p class="whitespace-pre-wrap">{{ msg.content }}</p>
                        </div>
                      </div>
                    </div>
                  }
                }

                @if (chatService.isStreaming()) {
                  <div class="flex items-center gap-2 text-xs font-code-sm text-primary pl-11">
                    <span class="inline-block w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    AI Tutor is synthesizing response...
                  </div>
                }
              </div>

              <!-- Chat Input Area -->
              <div class="p-4 border-t border-white/10 bg-surface/50">
                <div class="relative flex items-center">
                  <textarea
                    [ngModel]="promptText()"
                    (ngModelChange)="promptText.set($event)"
                    (keydown)="onKeyDown($event)"
                    rows="2"
                    placeholder="Ask a clarifying question or test your mental model... (Press Cmd+Enter or Enter to send)"
                    class="w-full bg-[#0D1117] border border-[#30363D] rounded-lg p-3 pr-12 font-code-sm text-sm text-on-surface focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-on-surface-variant/60"
                  ></textarea>

                  <button
                    type="button"
                    (click)="onSendMessage()"
                    [disabled]="!promptText().trim() || chatService.isStreaming()"
                    class="absolute right-3 bottom-3 text-primary hover:text-primary-fixed-dim disabled:opacity-30 disabled:hover:text-primary transition-colors p-1.5 rounded hover:bg-surface-container"
                    aria-label="Send message"
                  >
                    <span class="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Section: Dashboard Analytics -->
          <div class="mt-4">
            <h2 class="font-headline-md text-headline-sm md:text-headline-md text-on-surface mb-5 font-bold">
              Learning Analytics
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start">
              <!-- Stats Cards -->
              <div class="lg:col-span-1 space-y-4">
                <!-- AI-Free Study -->
                <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-lg p-5 flex items-start gap-4">
                  <div class="p-2.5 bg-surface-container-high rounded text-on-surface-variant">
                    <span class="material-symbols-outlined text-[22px]">timer_off</span>
                  </div>
                  <div>
                    <p class="font-label-md text-label-md text-on-surface-variant mb-1 uppercase text-xs tracking-wider">
                      AI-Free Study
                    </p>
                    <p class="font-headline-lg text-headline-lg text-on-surface font-bold">
                      {{ statsService.stats().totalStudyHours }}<span class="text-sm text-on-surface-variant ml-1 font-normal">hrs</span>
                    </p>
                  </div>
                </div>

                <!-- Current Streak -->
                <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-lg p-5 flex items-start gap-4 border-l-2 border-l-primary">
                  <div class="p-2.5 bg-primary-container rounded text-on-primary-container">
                    <span class="material-symbols-outlined text-[22px] fill-1">local_fire_department</span>
                  </div>
                  <div>
                    <p class="font-label-md text-label-md text-on-surface-variant mb-1 uppercase text-xs tracking-wider">
                      Current Streak
                    </p>
                    <p class="font-headline-lg text-headline-lg text-primary font-bold">
                      {{ statsService.stats().currentStreakDays }} <span class="text-sm text-primary-fixed-dim ml-1 font-normal">Days</span>
                    </p>
                  </div>
                </div>

                <!-- Topics Mastered -->
                <div class="bg-[#161B22]/60 backdrop-blur-md border border-white/10 rounded-lg p-5 flex items-start gap-4">
                  <div class="p-2.5 bg-secondary-fixed-dim/20 rounded text-secondary">
                    <span class="material-symbols-outlined text-[22px]">check_circle</span>
                  </div>
                  <div>
                    <p class="font-label-md text-label-md text-on-surface-variant mb-1 uppercase text-xs tracking-wider">
                      Topics Mastered
                    </p>
                    <p class="font-headline-lg text-headline-lg text-on-surface font-bold">
                      {{ statsService.stats().topicsMastered }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Confidence Chart Area -->
              <div class="md:col-span-2 lg:col-span-3">
                <app-confidence-chart
                  [data]="statsService.stats().confidenceTrend"
                  [timeframe]="statsService.timeframe()"
                  (timeframeChange)="statsService.setTimeframe($event)"
                />
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Local Runtime Info Modal -->
      @if (showApiKeyModal()) {
        <app-api-key-modal (close)="showApiKeyModal.set(false)" />
      }
    </div>
  `
})
export class AiPanelComponent implements OnInit {
  @ViewChild('chatContainer') private chatContainer?: ElementRef<HTMLDivElement>;

  protected sessionService = inject(SessionService);
  protected chatService = inject(ChatService);
  protected statsService = inject(StatsService);

  protected promptText = signal<string>('');
  protected showApiKeyModal = signal<boolean>(false);
  protected runtimeConnected = signal<boolean>(false);
  protected runtimeStatusLabel = signal<string>('Checking...');

  protected reflectionText = signal<string>(
    this.sessionService.activeSession()?.reflection?.text ||
    'Use this space to review your most recent reflection and pressure-test your understanding with the AI tutor.'
  );

  protected scratchpadQuestions = signal<string[]>([]);

  ngOnInit(): void {
    this.refreshRuntimeHealth();

    const active = this.sessionService.activeSession();
    if (active) {
      void this.chatService.loadSessionChat(active);
      if (active.scratchpadNotes) {
        const lines = active.scratchpadNotes
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);
        this.scratchpadQuestions.set(lines.length > 0 ? lines : [
          'How does observer effect fundamentally alter the state?',
          'Can I derive the Schrödinger equation from first principles here?'
        ]);
      } else {
        this.scratchpadQuestions.set([
          'What concept still feels unclear to me?',
          'Which edge case should I test next?'
        ]);
      }
      
      if (active.reflection?.text) {
        this.reflectionText.set(active.reflection.text);
      }
    } else {
      this.scratchpadQuestions.set([
        'What concept still feels unclear to me?',
        'Which edge case should I test next?'
      ]);
    }
  }

  populatePrompt(question: string): void {
    this.promptText.set(question);
  }

  onKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.onSendMessage();
    }
  }

  onSendMessage(): void {
    const text = this.promptText().trim();
    if (!text || this.chatService.isStreaming()) return;

    this.promptText.set('');
    this.chatService.sendMessage(text, this.sessionService.activeSession());

    setTimeout(() => {
      this.scrollToBottom();
    }, 50);
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    }
  }

  private refreshRuntimeHealth(): void {
    this.chatService.checkRuntimeHealth().subscribe((health) => {
      this.runtimeConnected.set(health.ok);
      this.runtimeStatusLabel.set(health.ok ? 'Connected' : 'Offline');
    });
  }
}
