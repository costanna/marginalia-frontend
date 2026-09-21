import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AUTHOR_HANDLE, AUTHOR_URL } from '../../core/config/site.config';

/** Site footer, visible on every page: "© {year} Marginalia. All rights reserved." and @costanna. */
@Component({
  selector: 'app-footer',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="footer__inner container">
        <p>&copy; {{ year }} Marginalia. {{ 'footer.rights' | transloco }}</p>
        <a [href]="authorUrl" target="_blank" rel="noopener noreferrer">{{ authorHandle }}</a>
      </div>
    </footer>
  `,
  styles: `
    @use 'styles/mixins' as m;

    .footer {
      border-top: 1px solid var(--border);
      background: var(--bg);
      color: var(--text-muted);
      font-size: 0.9375rem;
    }

    .footer__inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-4);
      padding-block: var(--sp-16);
      padding-bottom: calc(var(--sp-16) + env(safe-area-inset-bottom, 0px));
      text-align: center;

      @include m.up(md) {
        flex-direction: row;
        justify-content: space-between;
        text-align: start;
      }
    }

    a {
      color: var(--text-muted);
      text-underline-offset: 0.2em;
    }

    a:hover {
      color: var(--primary);
    }
  `,
})
export class FooterComponent {
  // Computed at run time, never written by hand.
  protected readonly year = new Date().getFullYear();
  protected readonly authorHandle = AUTHOR_HANDLE;
  protected readonly authorUrl = AUTHOR_URL;
}
