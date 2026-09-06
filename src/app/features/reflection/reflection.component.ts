import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../core/services/session.service';
import { SideNavComponent } from '../../shared/components/app-nav/side-nav.component';
import { TopBarComponent } from '../../shared/components/app-nav/top-bar.component';
import { ApiKeyModalComponent } from '../../shared/components/api-key-modal/api-key-modal.component';
import { ReflectionInputMode, SelfCheckProtocol } from '../../core/models/session.model';

@Component({
  selector: 'app-reflection',
  standalone: true,
  imports: [FormsModule, SideNavComponent, TopBarComponent, ApiKeyModalComponent],
  template: `
    <div class="reflection-page reflection-copy bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
      <!-- Side Navigation -->
      <app-side-nav class="hidden md:flex" />

      <!-- Main Content Area -->
      <div class="flex-1 ml-0 md:ml-64 flex flex-col h-screen relative overflow-y-auto">
        <!-- Top App Bar -->
        <app-top-bar
          title="Reflection Phase"
          subtitle="Synthesis & Self-Check"
          (openApiKeyModal)="showApiKeyModal.set(true)"
        />

        <!-- Reflection Canvas -->
        <main class="flex-1 mt-16 pt-8 pb-20 px-4 md:px-margin-desktop">
          <div class="max-w-container-max mx-auto">
            <!-- State Header -->
            <div class="mb-8 border-l-4 border-[#a4508b] pl-6">
              <p class="reflection-accent font-inter text-sm font-semibold mb-1 uppercase tracking-widest">Reflection</p>
              <h2 class="font-display-lg text-headline-lg md:text-display-lg leading-tight font-bold">
                Timer Complete.<br />
                <span class="reflection-muted font-semibold">Explain, then compare.</span>
              </h2>
            </div>

            <!-- Split compare: Feynman write-up vs source-grounded AI summary -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <!-- Left Column: learner explanation -->
              <div class="reflection-card rounded-xl p-6 md:p-8 flex flex-col">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="font-headline-md text-headline-md font-semibold">Explain what you learned in your own words</h3>
                    <p class="text-sm reflection-muted mt-0.5">Topic: <strong class="reflection-accent">{{ sessionService.activeSession()?.topic }}</strong></p>
                  </div>
                  <span class="material-symbols-outlined reflection-muted" aria-hidden="true">edit_note</span>
                </div>

                <!-- Editor Shell -->
                <div class="reflection-editor flex-1 flex flex-col rounded-lg focus-within:ring-2 focus-within:ring-[#a4508b] transition-all duration-150">
                  <!-- Toolbar -->
                  <div class="flex items-center gap-1.5 p-2 border-b border-[#c994ae] bg-[#f8edf2] rounded-t-lg">
                    <button
                      type="button"
                      (click)="formatBold()"
                      class="p-1.5 reflection-muted hover:text-[#2f004f] hover:bg-[#efd5e1] rounded transition-colors"
                      title="Bold text"
                    >
                      <span class="material-symbols-outlined text-[18px]">format_bold</span>
                    </button>
                    <button
                      type="button"
                      (click)="formatItalic()"
                      class="p-1.5 reflection-muted hover:text-[#2f004f] hover:bg-[#efd5e1] rounded transition-colors"
                      title="Italic text"
                    >
                      <span class="material-symbols-outlined text-[18px]">format_italic</span>
                    </button>
                    <div class="w-px h-4 bg-[#c994ae] mx-1"></div>
                    <button
                      type="button"
                      (click)="formatBulletList()"
                      class="p-1.5 reflection-muted hover:text-[#2f004f] hover:bg-[#efd5e1] rounded transition-colors"
                      title="Bullet list"
                    >
                      <span class="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                    </button>
                    <button
                      type="button"
                      (click)="formatCode()"
                      class="p-1.5 reflection-muted hover:text-[#2f004f] hover:bg-[#efd5e1] rounded transition-colors"
                      title="Code snippet"
                    >
                      <span class="material-symbols-outlined text-[18px]">code</span>
                    </button>
                    <div class="w-px h-4 bg-[#c994ae] mx-1"></div>
                    <button
                      type="button"
                      (click)="toggleRecording()"
                      [disabled]="isTranscribing()"
                      class="p-1.5 rounded transition-colors flex items-center gap-1.5"
                      [class.text-error]="isRecording()"
                      [class.bg-error/10]="isRecording()"
                      [class.reflection-muted]="!isRecording()"
                      [class.hover:bg-[#efd5e1]]="!isRecording()"
                      [title]="isRecording() ? 'Stop recording' : 'Record spoken reflection'"
                    >
                      <span class="material-symbols-outlined text-[18px]">{{ isRecording() ? 'stop_circle' : 'mic' }}</span>
                      @if (isRecording()) {
                        <span class="font-inter text-[11px] tabular-nums">{{ formattedRecordTime() }}</span>
                      } @else if (isTranscribing()) {
                        <span class="font-inter text-[11px]">Transcribing…</span>
                      }
                    </button>
                  </div>

                  <!-- Textarea -->
                  <textarea
                    #editorArea
                    [ngModel]="reflectionText()"
                    (ngModelChange)="reflectionText.set($event)"
                    id="reflectionTextarea"
                    class="w-full flex-1 bg-transparent border-none focus:ring-0 p-5 resize-none min-h-[320px] outline-none"
                    placeholder="Start typing your synthesis here — or tap the mic to speak it. Focus on the core concepts, boundary cases, and how they connect..."
                  ></textarea>
                </div>
                @if (recordError()) {
                  <p class="mt-3 text-sm text-error font-inter">{{ recordError() }}</p>
                }

                @if (sessionService.activeSession()?.scratchpadNotes; as notes) {
                  <div class="mt-4 p-4 rounded-lg bg-[#f3e5eb] border border-[#c994ae]">
                    <div class="flex items-center gap-2 text-sm font-inter reflection-accent mb-1">
                      <span class="material-symbols-outlined text-[16px]">history_edu</span>
                      Your Session Scratchpad Notes:
                    </div>
                    <p class="text-sm reflection-copy whitespace-pre-wrap">{{ notes }}</p>
                  </div>
                }
              </div>

              <!-- Right Column: AI source summary + unlock controls -->
              <div class="flex flex-col gap-6">
                <div class="reflection-card rounded-xl p-6 md:p-8 flex flex-col min-h-[320px]">
                  <div class="flex items-center justify-between mb-4">
                    <div>
                      <h3 class="font-headline-md text-headline-md font-semibold">Source summary</h3>
                      <p class="text-sm reflection-muted mt-0.5">Independent of your write-up. Compare after you explain.</p>
                    </div>
                    <span class="material-symbols-outlined reflection-muted" aria-hidden="true">auto_awesome</span>
                  </div>

                  @if (summaryLoading()) {
                    <p class="text-sm reflection-muted font-inter">Reading your sources…</p>
                  } @else if (summaryError()) {
                    <p class="text-sm text-error font-inter">{{ summaryError() }}</p>
                  } @else if (sourceSummary()) {
                    <div class="text-sm reflection-copy whitespace-pre-wrap leading-relaxed flex-1">{{ sourceSummary() }}</div>
                  } @else {
                    <p class="text-sm reflection-muted font-inter">No source summary yet.</p>
                  }

                  @if (sessionService.activeSession()?.sources?.length) {
                    <div class="mt-5 pt-4 border-t border-[#e2c3d0]">
                      <p class="text-xs font-semibold reflection-accent uppercase tracking-wider mb-2">Sources used</p>
                      <ul class="flex flex-col gap-1.5">
                        @for (source of sessionService.activeSession()?.sources || []; track source.url) {
                          <li class="text-xs reflection-muted truncate">
                            <a [href]="source.url" target="_blank" rel="noopener noreferrer" class="hover:text-[#7a1468]">
                              {{ source.title }}
                            </a>
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </div>

                <div class="reflection-card rounded-xl p-6">
                  <h3 class="font-label-md text-label-md reflection-accent uppercase tracking-wider mb-5 font-semibold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">checklist</span>
                    Self-Check Protocol
                  </h3>
                  
                  <div class="flex flex-col gap-4">
                    <label class="flex items-start gap-3.5 group cursor-pointer">
                      <div class="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          [(ngModel)]="selfCheck.explainWithoutNotes"
                          class="peer appearance-none w-5 h-5 border-2 border-[#a4508b] rounded-sm bg-white checked:bg-[#5f0a87] checked:border-[#5f0a87] transition-colors cursor-pointer"
                        />
                        <span class="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-[16px] font-bold">check</span>
                      </div>
                      <span class="font-body-md text-sm reflection-copy group-hover:text-[#7a1468] transition-colors leading-snug">
                        Can I explain this without looking at my notes?
                      </span>
                    </label>

                    <div class="h-px w-full bg-[#e2c3d0]"></div>

                    <label class="flex items-start gap-3.5 group cursor-pointer">
                      <div class="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          [(ngModel)]="selfCheck.identifyEdgeCases"
                          class="peer appearance-none w-5 h-5 border-2 border-[#a4508b] rounded-sm bg-white checked:bg-[#5f0a87] checked:border-[#5f0a87] transition-colors cursor-pointer"
                        />
                        <span class="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-[16px] font-bold">check</span>
                      </div>
                      <span class="font-body-md text-sm reflection-copy group-hover:text-[#7a1468] transition-colors leading-snug">
                        Did I identify the core edge cases or exceptions?
                      </span>
                    </label>

                    <div class="h-px w-full bg-[#e2c3d0]"></div>

                    <label class="flex items-start gap-3.5 group cursor-pointer">
                      <div class="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          [(ngModel)]="selfCheck.teachSomeoneElse"
                          class="peer appearance-none w-5 h-5 border-2 border-[#a4508b] rounded-sm bg-white checked:bg-[#5f0a87] checked:border-[#5f0a87] transition-colors cursor-pointer"
                        />
                        <span class="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-[16px] font-bold">check</span>
                      </div>
                      <span class="font-body-md text-sm reflection-copy group-hover:text-[#7a1468] transition-colors leading-snug">
                        Could I teach this concept to someone else right now?
                      </span>
                    </label>
                  </div>
                </div>

                <div class="reflection-card rounded-xl p-6">
                  <h3 class="font-label-md text-label-md reflection-accent uppercase tracking-wider mb-4 font-semibold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">speed</span>
                    Rate your confidence
                  </h3>
                  
                  <div class="flex justify-between items-center bg-[#f8edf2] border border-[#c994ae] rounded-lg p-2" role="group" aria-label="Confidence score from 1 to 5">
                    @for (val of [1, 2, 3, 4, 5]; track val) {
                      <button
                        type="button"
                        (click)="setConfidence(val)"
                        [class.bg-[#5f0a87]]="confidenceRating() === val"
                        [class.text-white]="confidenceRating() === val"
                        [class.font-bold]="confidenceRating() === val"
                        [class.reflection-muted]="confidenceRating() !== val"
                        class="w-10 h-10 rounded text-center font-headline-md hover:bg-[#efd5e1] transition-colors focus:outline-none"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                  
                  <div class="flex justify-between mt-2 reflection-muted font-inter text-xs px-1">
                    <span>1 - Shaky</span>
                    <span>3 - Moderate</span>
                    <span>5 - Mastered</span>
                  </div>
                </div>

                <button
                  type="button"
                  (click)="onSubmitReflection()"
                  [disabled]="!isSubmitEnabled()"
                  class="mt-2 w-full bg-[#5f0a87] hover:bg-[#a4508b] disabled:opacity-40 disabled:cursor-not-allowed text-white font-label-md text-label-md font-bold py-5 px-6 rounded flex items-center justify-center gap-3 transition-all"
                >
                  <span>Submit Reflection &amp; Unlock AI Tutor</span>
                  <span class="material-symbols-outlined" aria-hidden="true">lock_open</span>
                </button>

                @if (!isSubmitEnabled()) {
                  <p class="text-sm text-center reflection-muted font-inter">
                    * Written explanation and checklist items are required to unlock AI.
                  </p>
                }
              </div>
            </div>
          </div>
        </main>
      </div>
      <!-- Runtime status modal -->
      @if (showApiKeyModal()) {
        <app-api-key-modal (close)="showApiKeyModal.set(false)" />
      }
    </div>
  `
})
export class ReflectionComponent implements OnDestroy {
  protected sessionService = inject(SessionService);
  private router = inject(Router);
  private http = inject(HttpClient);

  protected reflectionText = signal<string>('');
  protected confidenceRating = signal<number>(0);
  protected showApiKeyModal = signal<boolean>(false);
  protected isRecording = signal(false);
  protected isTranscribing = signal(false);
  protected recordSeconds = signal(0);
  protected recordError = signal('');
  protected inputMode = signal<ReflectionInputMode>('typed');
  protected sourceSummary = signal('');
  protected summaryLoading = signal(false);
  protected summaryError = signal('');

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recTimer: ReturnType<typeof setInterval> | null = null;
  private recStartedAt = 0;
  private mediaStream: MediaStream | null = null;

  protected selfCheck: SelfCheckProtocol = {
    explainWithoutNotes: false,
    identifyEdgeCases: false,
    teachSomeoneElse: false
  };

  constructor() {
    void this.loadSourceSummary();
  }

  readonly formattedRecordTime = computed(() => {
    const total = this.recordSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  readonly isChecklistComplete = computed(() => {
    return (
      this.selfCheck.explainWithoutNotes &&
      this.selfCheck.identifyEdgeCases &&
      this.selfCheck.teachSomeoneElse
    );
  });

  readonly isSubmitEnabled = computed(() => {
    return (
      this.reflectionText().trim().length > 10 &&
      this.isChecklistComplete() &&
      this.confidenceRating() > 0 &&
      !this.isRecording() &&
      !this.isTranscribing()
    );
  });

  setConfidence(val: number): void {
    this.confidenceRating.set(val);
  }

  formatBold(): void {
    this.insertFormatting('**', '**');
  }

  formatItalic(): void {
    this.insertFormatting('*', '*');
  }

  formatBulletList(): void {
    this.insertFormatting('\n- ', '');
  }

  formatCode(): void {
    this.insertFormatting('`', '`');
  }

  private insertFormatting(prefix: string, suffix: string): void {
    const area = document.getElementById('reflectionTextarea') as HTMLTextAreaElement;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const text = this.reflectionText();
    const selected = text.substring(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    this.reflectionText.set(newText);

    setTimeout(() => {
      area.focus();
      area.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 10);
  }

  ngOnDestroy(): void {
    this.stopMedia();
  }

  toggleRecording(): void {
    if (this.isTranscribing()) return;
    if (this.isRecording()) {
      this.stopRecording();
      return;
    }
    void this.startRecording();
  }

  private async startRecording(): Promise<void> {
    this.recordError.set('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.recordError.set('Recording is not supported in this browser. Type your reflection instead.');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.recordError.set('Microphone permission was denied. You can still type your reflection.');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    this.recordedChunks = [];
    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.mediaStream, { mimeType })
      : new MediaRecorder(this.mediaStream);

    this.mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };
    this.mediaRecorder.onstop = () => {
      void this.finishRecording();
    };

    this.recStartedAt = Date.now();
    this.recordSeconds.set(0);
    this.recTimer = setInterval(() => {
      const elapsed = Date.now() - this.recStartedAt;
      this.recordSeconds.set(Math.floor(elapsed / 1000));
      if (elapsed >= 3 * 60 * 1000) {
        this.stopRecording();
      }
    }, 250);
    this.mediaRecorder.start();
    this.isRecording.set(true);
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    if (this.recTimer) {
      clearInterval(this.recTimer);
      this.recTimer = null;
    }
  }

  private async finishRecording(): Promise<void> {
    const durationMs = Date.now() - this.recStartedAt;
    const type = this.mediaRecorder?.mimeType || 'audio/webm';
    this.stopMedia();

    if (durationMs < 3000) {
      this.recordError.set('Speak for at least 3 seconds before stopping.');
      return;
    }
    if (durationMs > 3 * 60 * 1000) {
      this.recordError.set('Recordings are limited to 3 minutes.');
      return;
    }

    const blob = new Blob(this.recordedChunks, { type });
    this.recordedChunks = [];
    this.isTranscribing.set(true);

    try {
      const sessionId = this.sessionService.activeSession()?.id;
      const text = await firstValueFrom(
        this.http.post<{ text: string }>('/api/reflections/transcribe', blob, {
          headers: {
            'Content-Type': type,
            'x-audio-duration-ms': String(durationMs),
            ...(sessionId ? { 'x-session-id': sessionId } : {}),
          },
        })
      );
      const transcript = text.text?.trim();
      if (!transcript) {
        this.recordError.set('No speech was detected. Try again or type your reflection.');
        return;
      }

      const current = this.reflectionText().trim();
      this.reflectionText.set(current ? `${current}\n\n${transcript}` : transcript);
      this.inputMode.set('spoken');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'error' in error
          ? (error as { error?: { error?: string } }).error?.error
          : undefined;
      this.recordError.set(message || 'Transcription failed. You can still type your reflection.');
    } finally {
      this.isTranscribing.set(false);
    }
  }

  private stopMedia(): void {
    if (this.recTimer) {
      clearInterval(this.recTimer);
      this.recTimer = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.isRecording.set(false);
  }

  async onSubmitReflection(): Promise<void> {
    if (!this.isSubmitEnabled()) return;

    await this.sessionService.submitReflection({
      text: this.reflectionText().trim(),
      selfCheck: { ...this.selfCheck },
      confidenceRating: this.confidenceRating(),
      submittedAt: Date.now(),
      inputMode: this.inputMode()
    });

    await this.router.navigate(['/session/ai-tutor']);
  }

  private async loadSourceSummary(): Promise<void> {
    const session = this.sessionService.activeSession();
    if (!session?.id) {
      return;
    }

    const cached = session.sourceSummary?.trim();
    if (cached) {
      this.sourceSummary.set(cached);
      return;
    }

    this.summaryLoading.set(true);
    this.summaryError.set('');
    try {
      const res = await firstValueFrom(
        this.http.post<{ summary?: string }>(`/api/sessions/${session.id}/source-summary`, {})
      );
      const text = res.summary?.trim() ?? '';
      this.sourceSummary.set(text);
      if (!text) {
        this.summaryError.set('The source summary came back empty. You can still write your explanation.');
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'error' in error
          ? (error as { error?: { error?: string } }).error?.error
          : undefined;
      this.summaryError.set(
        message || 'Could not load the source summary. Your explanation still unlocks the tutor.'
      );
    } finally {
      this.summaryLoading.set(false);
    }
  }
}
