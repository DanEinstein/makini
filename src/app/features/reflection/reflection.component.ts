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
    <div class="bg-background text-on-background font-body-md flex h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
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
            <div class="mb-8 border-l-2 border-primary pl-6">
              <p class="font-code-sm text-code-sm text-primary mb-1 uppercase tracking-widest">Phase 03 // Integration</p>
              <h2 class="font-display-lg text-headline-lg md:text-display-lg text-on-surface leading-tight font-bold">
                Timer Complete.<br />
                <span class="text-on-surface-variant font-normal">Time to reflect.</span>
              </h2>
            </div>

            <!-- Bento Grid Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <!-- Left Column: Rich Text Synthesis Editor (8 cols) -->
              <div class="lg:col-span-8 bg-surface-container/40 backdrop-blur-xl border border-outline-variant/30 shadow-lg rounded-xl p-6 md:p-8 flex flex-col">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="font-headline-md text-headline-md text-on-surface font-semibold">Explain what you learned in your own words</h3>
                    <p class="text-xs text-on-surface-variant mt-0.5">Topic: <strong class="text-primary">{{ sessionService.activeSession()?.topic }}</strong></p>
                  </div>
                  <span class="material-symbols-outlined text-outline-variant" aria-hidden="true">edit_note</span>
                </div>

                <!-- Editor Shell -->
                <div class="flex-1 flex flex-col border border-outline-variant/50 rounded-lg bg-surface/60 backdrop-blur-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all duration-150">
                  <!-- Toolbar -->
                  <div class="flex items-center gap-1.5 p-2 border-b border-outline-variant/50 bg-surface-container-low/60 rounded-t-lg">
                    <button
                      type="button"
                      (click)="formatBold()"
                      class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                      title="Bold text"
                    >
                      <span class="material-symbols-outlined text-[18px]">format_bold</span>
                    </button>
                    <button
                      type="button"
                      (click)="formatItalic()"
                      class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                      title="Italic text"
                    >
                      <span class="material-symbols-outlined text-[18px]">format_italic</span>
                    </button>
                    <div class="w-px h-4 bg-outline-variant mx-1"></div>
                    <button
                      type="button"
                      (click)="formatBulletList()"
                      class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                      title="Bullet list"
                    >
                      <span class="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                    </button>
                    <button
                      type="button"
                      (click)="formatCode()"
                      class="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                      title="Code snippet"
                    >
                      <span class="material-symbols-outlined text-[18px]">code</span>
                    </button>
                    <div class="w-px h-4 bg-outline-variant mx-1"></div>
                    <button
                      type="button"
                      (click)="toggleRecording()"
                      [disabled]="isTranscribing()"
                      class="p-1.5 rounded transition-colors flex items-center gap-1.5"
                      [class.text-error]="isRecording()"
                      [class.bg-error/10]="isRecording()"
                      [class.text-on-surface-variant]="!isRecording()"
                      [class.hover:text-on-surface]="!isRecording()"
                      [class.hover:bg-surface-container-high]="!isRecording()"
                      [title]="isRecording() ? 'Stop recording' : 'Record spoken reflection'"
                    >
                      <span class="material-symbols-outlined text-[18px]">{{ isRecording() ? 'stop_circle' : 'mic' }}</span>
                      @if (isRecording()) {
                        <span class="font-code-sm text-[11px] tabular-nums">{{ formattedRecordTime() }}</span>
                      } @else if (isTranscribing()) {
                        <span class="font-code-sm text-[11px]">Transcribing…</span>
                      }
                    </button>
                  </div>

                  <!-- Textarea -->
                  <textarea
                    #editorArea
                    [(ngModel)]="reflectionText"
                    id="reflectionTextarea"
                    class="w-full flex-1 bg-transparent border-none focus:ring-0 text-body-lg font-body-lg text-on-surface placeholder-on-surface-variant/50 p-5 resize-none min-h-[320px] outline-none"
                    placeholder="Start typing your synthesis here — or tap the mic to speak it. Focus on the core concepts, boundary cases, and how they connect..."
                  ></textarea>
                </div>
                @if (recordError()) {
                  <p class="mt-3 text-xs text-error font-code-sm">{{ recordError() }}</p>
                }

                <!-- Scratchpad Reference Accordion / Helper -->
                @if (sessionService.activeSession()?.scratchpadNotes; as notes) {
                  <div class="mt-4 p-4 rounded bg-[#0D1117] border border-outline-variant/60">
                    <div class="flex items-center gap-2 text-xs font-code-sm text-primary mb-1">
                      <span class="material-symbols-outlined text-[16px]">history_edu</span>
                      Your Session Scratchpad Notes:
                    </div>
                    <p class="text-xs text-on-surface-variant font-code-sm whitespace-pre-wrap">{{ notes }}</p>
                  </div>
                }
              </div>

              <!-- Right Column: Self-Check & Confidence Rating (4 cols) -->
              <div class="lg:col-span-4 flex flex-col gap-6">
                <!-- Self-Check Checklist Card -->
                <div class="bg-surface-container/40 backdrop-blur-xl border border-outline-variant/30 shadow-lg rounded-xl p-6">
                  <h3 class="font-label-md text-label-md text-primary uppercase tracking-wider mb-5 font-semibold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">checklist</span>
                    Self-Check Protocol
                  </h3>
                  
                  <div class="flex flex-col gap-4">
                    <!-- Check 1 -->
                    <label class="flex items-start gap-3.5 group cursor-pointer">
                      <div class="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          [(ngModel)]="selfCheck.explainWithoutNotes"
                          class="peer appearance-none w-5 h-5 border border-outline-variant rounded-sm bg-surface checked:bg-secondary checked:border-secondary transition-colors cursor-pointer"
                        />
                        <span class="material-symbols-outlined absolute text-on-secondary opacity-0 peer-checked:opacity-100 pointer-events-none text-[16px] font-bold">check</span>
                      </div>
                      <span class="font-body-md text-body-md text-sm text-on-surface group-hover:text-primary transition-colors leading-snug">
                        Can I explain this without looking at my notes?
                      </span>
                    </label>

                    <div class="h-px w-full bg-outline-variant/40"></div>

                    <!-- Check 2 -->
                    <label class="flex items-start gap-3.5 group cursor-pointer">
                      <div class="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          [(ngModel)]="selfCheck.identifyEdgeCases"
                          class="peer appearance-none w-5 h-5 border border-outline-variant rounded-sm bg-surface checked:bg-secondary checked:border-secondary transition-colors cursor-pointer"
                        />
                        <span class="material-symbols-outlined absolute text-on-secondary opacity-0 peer-checked:opacity-100 pointer-events-none text-[16px] font-bold">check</span>
                      </div>
                      <span class="font-body-md text-body-md text-sm text-on-surface group-hover:text-primary transition-colors leading-snug">
                        Did I identify the core edge cases or exceptions?
                      </span>
                    </label>

                    <div class="h-px w-full bg-outline-variant/40"></div>

                    <!-- Check 3 -->
                    <label class="flex items-start gap-3.5 group cursor-pointer">
                      <div class="relative flex items-center justify-center mt-0.5">
                        <input
                          type="checkbox"
                          [(ngModel)]="selfCheck.teachSomeoneElse"
                          class="peer appearance-none w-5 h-5 border border-outline-variant rounded-sm bg-surface checked:bg-secondary checked:border-secondary transition-colors cursor-pointer"
                        />
                        <span class="material-symbols-outlined absolute text-on-secondary opacity-0 peer-checked:opacity-100 pointer-events-none text-[16px] font-bold">check</span>
                      </div>
                      <span class="font-body-md text-body-md text-sm text-on-surface group-hover:text-primary transition-colors leading-snug">
                        Could I teach this concept to someone else right now?
                      </span>
                    </label>
                  </div>
                </div>

                <!-- Confidence Rating Card -->
                <div class="bg-surface-container/40 backdrop-blur-xl border border-outline-variant/30 shadow-lg rounded-xl p-6">
                  <h3 class="font-label-md text-label-md text-primary uppercase tracking-wider mb-4 font-semibold flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">speed</span>
                    Rate your confidence
                  </h3>
                  
                  <div class="flex justify-between items-center bg-surface border border-outline-variant rounded-lg p-2" role="group" aria-label="Confidence score from 1 to 5">
                    @for (val of [1, 2, 3, 4, 5]; track val) {
                      <button
                        type="button"
                        (click)="setConfidence(val)"
                        [class.bg-primary]="confidenceRating() === val"
                        [class.text-on-primary]="confidenceRating() === val"
                        [class.font-bold]="confidenceRating() === val"
                        [class.text-on-surface-variant]="confidenceRating() !== val"
                        class="w-10 h-10 rounded text-center font-headline-md hover:bg-surface-container-high transition-colors focus:outline-none"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                  
                  <div class="flex justify-between mt-2 text-on-surface-variant font-code-sm text-xs opacity-75 px-1">
                    <span>1 - Shaky</span>
                    <span>3 - Moderate</span>
                    <span>5 - Mastered</span>
                  </div>
                </div>

                <!-- Primary CTA -->
                <button
                  type="button"
                  (click)="onSubmitReflection()"
                  [disabled]="!isSubmitEnabled()"
                  class="mt-2 w-full bg-primary hover:bg-primary-fixed-dim disabled:opacity-40 disabled:cursor-not-allowed text-on-primary font-label-md text-label-md font-bold py-5 px-6 rounded flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(255,215,158,0.15)] hover:shadow-[0_0_25px_rgba(255,215,158,0.25)]"
                >
                  <span>Submit Reflection &amp; Unlock AI Tutor</span>
                  <span class="material-symbols-outlined" aria-hidden="true">lock_open</span>
                </button>

                @if (!isSubmitEnabled()) {
                  <p class="text-xs text-center text-on-surface-variant/80 font-code-sm">
                    * Written explanation and checklist items are required to unlock AI.
                  </p>
                }
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- BYOK Modal -->
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
  protected confidenceRating = signal<number>(4);
  protected showApiKeyModal = signal<boolean>(false);
  protected isRecording = signal(false);
  protected isTranscribing = signal(false);
  protected recordSeconds = signal(0);
  protected recordError = signal('');
  protected inputMode = signal<ReflectionInputMode>('typed');

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
      this.recordSeconds.set(Math.floor((Date.now() - this.recStartedAt) / 1000));
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
}
