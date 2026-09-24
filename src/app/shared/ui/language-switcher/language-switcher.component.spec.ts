import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { LANG_STORAGE_KEY } from '../../../core/i18n/supported-languages';
import { LanguageService } from '../../../core/i18n/language.service';
import { LanguageSwitcherComponent } from './language-switcher.component';

async function render(lang = 'es') {
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [LanguageSwitcherComponent],
    providers: [provideTestI18n(), provideHttpClient(), provideHttpClientTesting()],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const fixture = TestBed.createComponent(LanguageSwitcherComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, select: el.querySelector('select') as HTMLSelectElement };
}

describe('LanguageSwitcherComponent', () => {
  it('offers every supported language, each named in its own language', async () => {
    const { select } = await render();

    const options = [...select.options].map((option) => [option.value, option.textContent?.trim()]);

    expect(options).toEqual([
      ['ca', 'Català'],
      ['es', 'Castellano'],
      ['en', 'English'],
      ['fr', 'Français'],
    ]);
  });

  it('has an accessible name and marks the current language', async () => {
    const { el, select } = await render('ca');

    expect(el.querySelector('label')?.textContent?.trim()).toBe('Idioma');
    expect(el.querySelector('label')?.getAttribute('for')).toBe(select.id);
    expect(select.value).toBe('ca');
  });

  it('switches the whole interface language, saves it and updates <html lang>', async () => {
    const { fixture, el, select } = await render('es');

    select.value = 'en';
    select.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(TestBed.inject(LanguageService).language()).toBe('en'));
    fixture.detectChanges();

    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(el.querySelector('label')?.textContent?.trim()).toBe('Language');
  });

  it('gives two switchers on the same page different ids', async () => {
    const { select: first } = await render();
    const second = TestBed.createComponent(LanguageSwitcherComponent);
    await second.whenStable();

    const secondSelect = (second.nativeElement as HTMLElement).querySelector('select');

    expect(secondSelect?.id).not.toBe(first.id);
  });
});
