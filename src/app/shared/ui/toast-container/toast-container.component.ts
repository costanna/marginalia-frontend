import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastService } from '../../../core/toast/toast.service';

/** Renders the active toasts in a polite live region, so screen readers announce them. */
@Component({
  selector: 'app-toast-container',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.kind">
          <p class="toast__message">{{ toast.message }}</p>
          <button
            type="button"
            class="toast__close"
            [attr.aria-label]="'toast.close' | transloco"
            (click)="toastService.dismiss(toast.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      inset-inline: var(--sp-16);
      bottom: calc(var(--sp-16) + env(safe-area-inset-bottom, 0px));
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: var(--sp-8);
      align-items: center;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-12);
      width: min(100%, 28rem);
      padding: var(--sp-12) var(--sp-16);
      border: 1px solid var(--border);
      border-inline-start: 4px solid var(--primary);
      border-radius: var(--radius-card);
      background: var(--surface);
      box-shadow: var(--shadow-overlay);
      pointer-events: auto;
    }

    .toast--error {
      border-inline-start-color: var(--danger);
    }

    .toast--success {
      border-inline-start-color: var(--success);
    }

    .toast__message {
      flex: 1;
      font-size: 0.9375rem;
    }

    .toast__close {
      display: grid;
      place-items: center;
      min-width: 32px;
      min-height: 32px;
      margin: -4px -8px -4px 0;
      padding: 0;
      border: 0;
      border-radius: var(--radius-input);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }

    .toast__close:hover {
      background: var(--surface-alt);
      color: var(--text);
    }

    svg {
      width: 1.125rem;
      height: 1.125rem;
      fill: none;
      stroke: currentcolor;
      stroke-width: 2;
      stroke-linecap: round;
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
