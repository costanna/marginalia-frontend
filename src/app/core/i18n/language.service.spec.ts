import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from './language.service';
import { LANG_STORAGE_KEY } from './supported-languages';

function setBrowserLanguages(languages: string[]): void {
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true });
  Object.defineProperty(window.navigator, 'language', { value: languages[0], configurable: true });
}

function setup() {
  TestBed.configureTestingModule({ providers: [provideTestI18n()] });
  return {
    language: TestBed.inject(LanguageService),
    transloco: TestBed.inject(TranslocoService),
  };
}

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    setBrowserLanguages(['en-US']);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('initial language', () => {
    it('uses the language the user saved, above everything else', async () => {
      localStorage.setItem(LANG_STORAGE_KEY, 'ca');
      setBrowserLanguages(['en-US']);
      const { language } = setup();

      await language.initialize();

      expect(language.language()).toBe('ca');
    });

    it.each([
      [['ca-ES', 'es'], 'ca'],
      [['en-GB'], 'en'],
      [['fr-FR', 'es-MX', 'en'], 'es'], // the first supported one, in the browser's order
      [['CA'], 'ca'], // case-insensitive
    ])('falls back to the browser language %j -> %s', async (browser, expected) => {
      setBrowserLanguages(browser);
      const { language } = setup();

      await language.initialize();

      expect(language.language()).toBe(expected);
    });

    it('falls back to Spanish when nothing matches', async () => {
      setBrowserLanguages(['fr-FR', 'de']);
      const { language } = setup();

      await language.initialize();

      expect(language.language()).toBe('es');
    });

    it('ignores an invalid stored value', async () => {
      localStorage.setItem(LANG_STORAGE_KEY, 'klingon');
      setBrowserLanguages(['ca']);
      const { language } = setup();

      await language.initialize();

      expect(language.language()).toBe('ca');
    });

    it('sets <html lang> and activates the language in Transloco', async () => {
      setBrowserLanguages(['ca']);
      const { language, transloco } = setup();

      await language.initialize();

      expect(document.documentElement.lang).toBe('ca');
      expect(transloco.getActiveLang()).toBe('ca');
      expect(transloco.translate('nav.write')).toBe('Escriure');
    });
  });

  describe('changing language', () => {
    it('switches immediately, translations included', async () => {
      const { language, transloco } = setup();
      await language.initialize(); // English (browser)
      expect(transloco.translate('write.title')).toBe('Write');

      await language.setLanguage('es');

      expect(language.language()).toBe('es');
      expect(document.documentElement.lang).toBe('es');
      expect(transloco.translate('write.title')).toBe('Escribir');
    });

    it('remembers the choice for the next visit', async () => {
      const { language } = setup();
      await language.initialize();

      await language.setLanguage('ca');

      expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('ca');
    });

    it('ignores unsupported languages', async () => {
      const { language } = setup();
      await language.initialize();

      await language.setLanguage('fr');

      expect(language.language()).toBe('en');
      expect(localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
    });

    it('keeps the current language if the new translations cannot be loaded', async () => {
      const { language, transloco } = setup();
      await language.initialize();
      vi.spyOn(transloco, 'load').mockImplementation(() => {
        throw new Error('offline');
      });

      await language.setLanguage('ca').catch(() => undefined);

      expect(language.language()).toBe('en');
    });
  });

  it('keeps working when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { language } = setup();

    await language.initialize();
    await language.setLanguage('ca');

    expect(language.language()).toBe('ca');
  });
});
