import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from './language.service';

const description = () =>
  document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;

describe('meta description', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll('meta[name="description"]').forEach((meta) => meta.remove());
    TestBed.configureTestingModule({ providers: [provideTestI18n()] });
  });

  it.each([
    ['es', 'Escribe un texto en inglés y recibe correcciones explicadas'],
    ['ca', 'Escriu un text en anglès i rep correccions explicades'],
    ['en', 'Write a text in English and get explained corrections'],
  ])('is written in the interface language (%s)', async (lang, start) => {
    await TestBed.inject(LanguageService).setLanguage(lang);

    expect(description()).toContain(start);
  });

  it('is updated, not duplicated, when the language changes', async () => {
    const language = TestBed.inject(LanguageService);

    await language.setLanguage('es');
    await language.setLanguage('en');

    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(description()).toContain('Write a text in English');
  });
});
