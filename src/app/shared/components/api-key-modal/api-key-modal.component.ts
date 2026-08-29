import { Component, OnInit, inject, output, signal } from '@angular/core';
import { ChatService } from '../../../core/services/chat.service';

@Component({
  selector: 'app-api-key-modal',
  standalone: true,
  imports: [],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1b2550]/35 backdrop-blur-sm animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="bg-surface border border-outline-variant rounded-xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>

        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2 text-primary">
            <span class="material-symbols-outlined">memory</span>
            <h2 id="modal-title" class="font-headline-sm text-headline-sm text-on-surface">AI Tutor Runtime</h2>
          </div>
          <button (click)="close.emit()" class="text-on-surface-variant hover:text-on-surface p-1 rounded hover:bg-surface-container-high transition-colors" aria-label="Close modal">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <p class="font-body-md text-sm text-on-surface-variant mb-5 leading-relaxed">
          The tutor runs on Groq from the server. You do not need a personal API key in the browser.
        </p>

        <div class="bg-surface-container border border-outline-variant rounded-lg p-4 mb-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="font-label-md text-label-md text-on-surface font-semibold">Runtime Status</p>
              <p class="text-xs text-on-surface-variant mt-0.5">Model: {{ healthModel() }}</p>
            </div>
            <button
              type="button"
              (click)="refreshHealth()"
              class="px-3 py-2 text-xs font-label-md rounded border border-outline-variant hover:border-primary hover:text-primary transition-colors"
            >
              Re-check
            </button>
          </div>
          <p class="mt-3 text-xs font-medium" [class.text-secondary]="runtimeOk()" [class.text-error]="!runtimeOk()">
            {{ runtimeOk() ? 'Connected' : 'Offline' }}
          </p>
          @if (healthError()) {
            <p class="mt-1 text-xs text-error">{{ healthError() }}</p>
          }
        </div>

        <div class="bg-surface-container border border-secondary/30 rounded-lg p-3.5 mb-6 flex items-start gap-3">
          <span class="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">vpn_key</span>
          <div class="text-xs text-on-surface-variant leading-relaxed space-y-1">
            <strong class="text-secondary font-medium block">Server setup</strong>
            <p>Add <code class="text-primary bg-surface px-1 py-0.5 rounded">GROQ_API_KEY</code> from console.groq.com to <code class="text-primary bg-surface px-1 py-0.5 rounded">.env</code>, then restart the server.</p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-1">
          <button
            (click)="close.emit()"
            type="button"
            class="px-4 py-2.5 text-xs font-label-md text-on-surface-variant hover:text-on-surface border border-outline-variant rounded hover:bg-surface-container transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  `
})
export class ApiKeyModalComponent implements OnInit {
  readonly close = output<void>();
  protected chatService = inject(ChatService);

  protected runtimeOk = signal<boolean>(false);
  protected healthModel = signal<string>('llama-3.3-70b-versatile');
  protected healthError = signal<string>('');

  ngOnInit(): void {
    this.refreshHealth();
  }

  refreshHealth(): void {
    this.chatService.checkRuntimeHealth().subscribe((health) => {
      this.runtimeOk.set(health.ok);
      this.healthModel.set(health.model || 'llama-3.3-70b-versatile');
      this.healthError.set(health.error || '');
    });
  }
}
