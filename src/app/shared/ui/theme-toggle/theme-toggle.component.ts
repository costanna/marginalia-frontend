import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { PreferencesService } from '../../../core/preferences/preferences.service';
import { ThemeService } from '../../../core/theme/theme.service';

/** Sun/moon button for the header. Its accessible name says what pressing it will DO. */
@Component({
  selector: 'app-theme-toggle',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="toggle"
      [attr.aria-label]="(isDark() ? 'theme.switchToLight' : 'theme.switchToDark') | transloco"
      [attr.title]="(isDark() ? 'theme.switchToLight' : 'theme.switchToDark') | transloco"
      (click)="preferences.toggleTheme()"
    >
      @if (isDark()) {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      }
    </button>
  `,
  styles: `
    .toggle {
      display: inline-grid;
      place-items: center;
      min-width: 44px;
      min-height: 44px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: var(--radius-input);
      background: transparent;
      color: var(--text);
      cursor: pointer;
      transition: background-color var(--transition);
    }

    .toggle:hover {
      background: var(--surface-alt);
    }

    svg {
      width: 1.375rem;
      height: 1.375rem;
      fill: none;
      stroke: currentcolor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class ThemeToggleComponent {
  protected readonly preferences = inject(PreferencesService);
  private readonly theme = inject(ThemeService);
  protected readonly isDark = () => this.theme.resolved() === 'dark';
}
