import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { startWith, switchMap } from 'rxjs';

let nextId = 0;

/**
 * A labelled text input bound to a reactive FormControl, with a hint and a translated error.
 *
 * Accessibility: the label is tied to the input, the hint and the error are linked with
 * `aria-describedby`, the invalid state is exposed with `aria-invalid`, and the error is announced
 * (`role="alert"`) rather than communicated by colour alone. Errors appear once the field has
 * been touched, or when the form is submitted (`markAllAsTouched`).
 */
@Component({
  selector: 'app-form-field',
  imports: [ReactiveFormsModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="label" [for]="id">{{ label() | transloco }}</label>
    <input
      class="input"
      [id]="id"
      [type]="type()"
      [formControl]="control()"
      [attr.autocomplete]="autocomplete()"
      [attr.inputmode]="inputmode()"
      [attr.aria-invalid]="showError() ? 'true' : null"
      [attr.aria-describedby]="describedBy()"
      [attr.aria-required]="required() ? 'true' : null"
    />
    @if (hint(); as hintKey) {
      <p class="hint" [id]="hintId">{{ hintKey | transloco }}</p>
    }
    @if (errorKey(); as key) {
      <p class="error" [id]="errorId" role="alert">{{ key | transloco: errorParams() }}</p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }

    .label {
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .input {
      min-height: 44px;
      padding: var(--sp-8) var(--sp-12);
      border: 1px solid var(--border);
      border-radius: var(--radius-input);
      background: var(--surface);
      color: var(--text);
      transition: border-color var(--transition);
    }

    .input:hover {
      border-color: var(--text-muted);
    }

    .input[aria-invalid='true'] {
      border-color: var(--danger);
    }

    .hint {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .error {
      margin: 0;
      color: var(--danger);
      font-size: 0.875rem;
      font-weight: 500;
    }
  `,
})
export class FormFieldComponent {
  readonly control = input.required<FormControl<string>>();
  /** Translation key of the label. */
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  /** Translation key of the optional help text. */
  readonly hint = input<string | null>(null);
  readonly required = input(false);

  protected readonly id = `field-${nextId++}`;
  protected readonly hintId = `${this.id}-hint`;
  protected readonly errorId = `${this.id}-error`;

  // Angular forms are not signal-based: this bridges the control's events (value, status, touched)
  // into a signal, so the OnPush template updates when the form is submitted from outside.
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events.pipe(startWith(null)))),
    { initialValue: null },
  );

  protected readonly showError = computed(() => {
    this.controlEvents();
    const control = this.control();
    return control.invalid && control.touched;
  });

  protected readonly errorKey = computed(() => {
    if (!this.showError()) {
      return null;
    }
    const errors = this.control().errors ?? {};
    for (const code of ['required', 'email', 'minlength', 'maxlength']) {
      if (code in errors) {
        return `form.errors.${code}`;
      }
    }
    return 'errors.unknown';
  });

  protected readonly errorParams = computed(() => {
    const errors = this.control().errors ?? {};
    const length = errors['minlength'] ?? errors['maxlength'];
    return length ? { requiredLength: length.requiredLength } : {};
  });

  protected readonly describedBy = computed(() => {
    const ids = [this.hint() ? this.hintId : null, this.errorKey() ? this.errorId : null];
    return ids.filter(Boolean).join(' ') || null;
  });
}
