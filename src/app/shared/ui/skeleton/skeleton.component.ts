import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Grey placeholder lines shown while content loads. They are decorative (`aria-hidden`): the page
 * announces the loading state with its own live text, so screen readers are not read a list of
 * empty bars. The shimmer stops for users who prefer reduced motion (see base.scss).
 */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton" aria-hidden="true">
      @for (line of lineList(); track line) {
        <span class="line" [style.width.%]="line === lastLine() ? 60 : 100"></span>
      }
    </div>
  `,
  styles: `
    .skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--sp-12);
    }

    .line {
      display: block;
      height: 1em;
      border-radius: var(--radius-input);
      background: linear-gradient(
        90deg,
        var(--surface-alt) 25%,
        var(--border) 50%,
        var(--surface-alt) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s linear infinite;
    }

    @keyframes shimmer {
      from {
        background-position: 200% 0;
      }
      to {
        background-position: -200% 0;
      }
    }
  `,
})
export class SkeletonComponent {
  readonly lines = input(4);
  protected readonly lineList = computed(() =>
    Array.from({ length: this.lines() }, (_, i) => i + 1),
  );
  protected readonly lastLine = computed(() => this.lines());
}
