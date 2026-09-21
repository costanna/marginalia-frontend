import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent } from '../button/button.component';

let nextId = 0;

/**
 * Asks "are you sure?" before something that cannot be undone (deleting a text or the account).
 *
 * It is a native modal <dialog>, like the menu and the bottom sheet: the browser traps focus in it,
 * Escape closes it and the page behind is inert. Focus starts on "Cancel", the safe choice, and
 * returns to the button that opened it. The parent opens it with `open()`, does the work when
 * `confirmed` fires, and calls `close()` when done; while `busy` the dialog cannot be dismissed, so
 * the request cannot be abandoned half way by a stray Escape or click.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslocoPipe, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="dialog"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="messageId"
      (cancel)="onCancel($event)"
    >
      <div class="dialog__body">
        <h2 class="dialog__title" [id]="titleId">{{ title() | transloco }}</h2>
        <p class="dialog__message" [id]="messageId">{{ message() | transloco }}</p>
        <div class="dialog__actions">
          <button type="button" class="btn btn--secondary" [disabled]="busy()" (click)="close()">
            {{ 'common.cancel' | transloco }}
          </button>
          <app-button
            [variant]="danger() ? 'danger' : 'primary'"
            [loading]="busy()"
            (click)="confirmed.emit()"
          >
            {{ confirmLabel() | transloco }}
          </app-button>
        </div>
      </div>
    </dialog>
  `,
  styles: `
    .dialog {
      width: min(28rem, calc(100vw - 2 * var(--sp-16)));
      max-width: none;
      margin: auto;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-overlay);
    }

    .dialog::backdrop {
      background: rgb(14 17 32 / 50%);
    }

    .dialog__body {
      display: flex;
      flex-direction: column;
      gap: var(--sp-12);
      padding: var(--sp-24);
    }

    .dialog__title {
      font-size: 1.25rem;
    }

    .dialog__message {
      margin: 0;
      color: var(--text-muted);
    }

    .dialog__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-8);
      justify-content: flex-end;
      margin-top: var(--sp-8);
    }
  `,
})
export class ConfirmDialogComponent {
  /** Translation keys. */
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  /** Styles the confirm button as destructive. */
  readonly danger = input(false, { transform: booleanAttribute });
  /** The action is running: the dialog cannot be dismissed and the button shows progress. */
  readonly busy = input(false, { transform: booleanAttribute });

  readonly confirmed = output<void>();

  protected readonly titleId = `confirm-${nextId}-title`;
  protected readonly messageId = `confirm-${nextId++}-message`;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      // A click on the backdrop lands on the <dialog> element itself, not on its content.
      const dialog = this.dialog().nativeElement;
      const onClick = (event: MouseEvent) =>
        event.target === dialog && !this.busy() && this.close();
      dialog.addEventListener('click', onClick);
      this.destroyRef.onDestroy(() => dialog.removeEventListener('click', onClick));
    });
  }

  open(): void {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) {
      return;
    }
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  close(): void {
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) {
      return;
    }
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  // Escape: closing is fine, unless the action is already running.
  protected onCancel(event: Event): void {
    if (this.busy()) {
      event.preventDefault();
    }
  }
}
