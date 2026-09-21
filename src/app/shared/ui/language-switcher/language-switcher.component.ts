import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '../../../core/i18n/language.service';
import { PreferencesService } from '../../../core/preferences/preferences.service';

let nextId = 0;

/**
 * Language menu. It is a native <select> on purpose: fully operable with the keyboard, announced
 * correctly by screen readers and shown as a native picker on phones, with no custom ARIA to get
 * wrong. Language names are written in their own language and are not translated.
 */
@Component({
  selector: 'app-language-switcher',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="visually-hidden" [for]="'lang-' + idSuffix">{{
      'language.label' | transloco
    }}</label>
    <select
      class="select"
      [id]="'lang-' + idSuffix"
      [value]="language.language()"
      (change)="change($event)"
    >
      @for (lang of language.languages; track lang) {
        <option [value]="lang" [selected]="lang === language.language()">
          {{ 'language.' + lang | transloco }}
        </option>
      }
    </select>
  `,
})
export class LanguageSwitcherComponent {
  protected readonly language = inject(LanguageService);
  private readonly preferences = inject(PreferencesService);
  // The header renders two switchers (desktop and mobile panel): ids must not collide.
  protected readonly idSuffix = nextId++;

  protected change(event: Event): void {
    void this.preferences.setLanguage((event.target as HTMLSelectElement).value);
  }
}
