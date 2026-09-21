import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';
import { TitleStrategy } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { environment } from '../../../environments/environment';
import { LanguageService } from './language.service';
import { PageTitleStrategy } from './page-title.strategy';
import { DEFAULT_LANG, SUPPORTED_LANGS } from './supported-languages';
import { TranslocoHttpLoader } from './transloco-http-loader';

export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: [...SUPPORTED_LANGS],
        defaultLang: DEFAULT_LANG,
        reRenderOnLangChange: true,
        prodMode: environment.production,
      },
      loader: TranslocoHttpLoader,
    }),
    // Blocks the first render until the initial language is loaded: no flash of raw keys.
    provideAppInitializer(() => inject(LanguageService).initialize()),
    { provide: TitleStrategy, useExisting: PageTitleStrategy },
  ];
}
