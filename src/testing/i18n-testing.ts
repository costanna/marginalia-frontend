import { EnvironmentProviders, Provider } from '@angular/core';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import ca from '../assets/i18n/ca.json';
import en from '../assets/i18n/en.json';
import es from '../assets/i18n/es.json';
import fr from '../assets/i18n/fr.json';
import { DEFAULT_LANG, SUPPORTED_LANGS } from '../app/core/i18n/supported-languages';

export const TRANSLATIONS: Record<string, Translation> = { ca, es, en, fr };

/** Serves the REAL translation files, so tests read the same texts the users do. */
class InlineLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(TRANSLATIONS[lang]);
  }
}

export function provideTestI18n(): (Provider | EnvironmentProviders)[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGS],
        defaultLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: true,
      },
      loader: InlineLoader,
    }),
  ];
}
