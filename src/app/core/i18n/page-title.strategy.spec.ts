import { TestBed } from '@angular/core/testing';
import { provideRouter, TitleStrategy } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from './language.service';
import { PageTitleStrategy } from './page-title.strategy';

describe('PageTitleStrategy', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideTestI18n(),
        provideRouter([
          { path: '', children: [], title: undefined },
          { path: 'write', children: [], title: 'nav.write' },
        ]),
        { provide: TitleStrategy, useExisting: PageTitleStrategy },
      ],
    });
    await TestBed.inject(LanguageService).setLanguage('es');
  });

  it('shows the translated page name followed by the app name', async () => {
    await RouterTestingHarness.create('/write');

    expect(document.title).toBe('Escribir · Marginalia');
  });

  it('shows only the app name on a page without a title', async () => {
    await RouterTestingHarness.create('/');

    expect(document.title).toBe('Marginalia');
  });

  it('re-translates the title when the language changes', async () => {
    await RouterTestingHarness.create('/write');

    await TestBed.inject(LanguageService).setLanguage('ca');
    expect(document.title).toBe('Escriure · Marginalia');

    await TestBed.inject(LanguageService).setLanguage('en');
    expect(document.title).toBe('Write · Marginalia');
  });
});
