import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * What a screen shows when there is nothing to list, or the thing asked for does not exist: a
 * title, an optional explanation and, projected inside, the next step (a button or a link).
 *
 * The title is a heading whose level the page chooses, so the outline of the page stays in order
 * wherever the component is used.
 */
@Component({
  selector: 'app-empty-state',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <div class="empty__title" role="heading" [attr.aria-level]="headingLevel()">
        {{ title() | transloco }}
      </div>
      @if (text(); as key) {
        <p class="empty__text">{{ key | transloco }}</p>
      }
      <div class="empty__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-8);
      padding: var(--sp-48) var(--sp-16);
      border: 1px dashed var(--border);
      border-radius: var(--radius-card);
      text-align: center;
    }

    .empty__title {
      font-family: var(--font-serif);
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .empty__text {
      max-width: 36rem;
      margin: 0;
      color: var(--text-muted);
    }

    .empty__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-8);
      justify-content: center;
      margin-top: var(--sp-8);
    }

    .empty__actions:empty {
      display: none;
    }
  `,
})
export class EmptyStateComponent {
  /** Translation key of the title. */
  readonly title = input.required<string>();
  /** Translation key of the explanation. */
  readonly text = input<string | null>(null);
  readonly headingLevel = input<2 | 3>(2);
}
