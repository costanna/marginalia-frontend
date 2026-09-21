import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * A button with variants and a loading state. It renders a real <button>, so it works inside
 * forms (`type="submit"`) and keeps native keyboard and accessibility behaviour. While `loading`
 * it is disabled (no double submit) and announces the busy state to screen readers.
 * For links that look like buttons, use `<a class="btn btn--primary">` directly.
 */
@Component({
  selector: 'app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.block]': 'block()' },
  template: `
    <button
      [class]="'btn btn--' + variant() + (block() ? ' btn--block' : '')"
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
    >
      @if (loading()) {
        <span class="spinner" aria-hidden="true"></span>
      }
      <ng-content />
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    :host(.block) {
      display: flex;
      width: 100%;
    }

    .spinner {
      width: 1em;
      height: 1em;
      border: 2px solid currentcolor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit'>('button');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly block = input(false, { transform: booleanAttribute });
}
