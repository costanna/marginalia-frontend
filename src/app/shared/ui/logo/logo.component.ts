import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The Marginalia mark: a rounded square with a serif "M" and a wavy "error" underline in the
 * corrective accent colour, optionally followed by the wordmark. Drawn with theme tokens, so it
 * follows light and dark mode (no fixed-background image).
 */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" class="mark__bg" />
      <text x="32" y="43" text-anchor="middle" class="mark__letter">M</text>
      <path
        d="M14 53 q4-4 8 0 t8 0 t8 0 t8 0 t8 0"
        class="mark__wave"
        fill="none"
        stroke-width="3"
        stroke-linecap="round"
      />
    </svg>
    @if (showWordmark()) {
      <span class="wordmark">Marginalia</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-8);
      color: var(--text);
    }

    .mark {
      width: 2rem;
      height: 2rem;
      flex: none;
    }

    .mark__bg {
      fill: var(--primary);
    }

    .mark__letter {
      fill: var(--on-primary);
      font-family: var(--font-serif);
      font-weight: 700;
      font-size: 38px;
    }

    .mark__wave {
      stroke: var(--accent);
    }

    .wordmark {
      font-family: var(--font-serif);
      font-weight: 600;
      font-size: 1.375rem;
      letter-spacing: -0.01em;
    }
  `,
})
export class LogoComponent {
  readonly showWordmark = input(true);
}
