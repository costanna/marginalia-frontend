import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CorrectionSegment } from './build-segments';

/**
 * One correction explained: what was written, the better way, why, and a button to apply it.
 * Used in the corrections panel and in the mobile bottom sheet.
 */
@Component({
  selector: 'app-correction-card',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="card"
      [class.card--selected]="selected()"
      [attr.aria-current]="selected() ? 'true' : null"
    >
      <button type="button" class="head" (click)="selectRequested.emit()">
        <span class="category" [attr.data-category]="correction().category">
          {{ 'categories.' + correction().category | transloco }}
        </span>
        <span class="rule">{{ 'rules.' + correction().rule_tag | transloco }}</span>
      </button>
      <p class="was">
        <span class="label">{{ 'write.result.original' | transloco }}</span>
        <del>{{ correction().original }}</del>
      </p>
      <p class="better">
        <span class="label">{{ 'write.result.betterSo' | transloco }}</span>
        <ins>{{ suggestion() }}</ins>
      </p>
      <p class="why">{{ correction().explanation }}</p>
      <button
        type="button"
        class="btn btn--secondary apply"
        [attr.aria-pressed]="applied()"
        (click)="applyToggled.emit()"
      >
        {{ (applied() ? 'write.result.undo' : 'write.result.apply') | transloco }}
      </button>
    </article>
  `,
  styleUrl: './correction-card.component.scss',
})
export class CorrectionCardComponent {
  readonly item = input.required<CorrectionSegment>();
  readonly applied = input(false);
  readonly selected = input(false);
  readonly selectRequested = output<void>();
  readonly applyToggled = output<void>();

  protected readonly correction = computed(() => this.item().correction);
  // A deletion has an empty suggestion: show a dash instead of nothing.
  protected readonly suggestion = computed(() => this.correction().suggestion || '—');
}
