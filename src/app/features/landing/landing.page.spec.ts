import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { TOKEN_STORAGE_KEY } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LandingPage } from './landing.page';

async function render(lang = 'es', signedIn = false) {
  localStorage.clear();
  if (signedIn) {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'tok');
  }
  TestBed.configureTestingModule({
    imports: [LandingPage],
    providers: [
      provideTestI18n(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const fixture = TestBed.createComponent(LandingPage);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('LandingPage', () => {
  it.each([
    ['es', 'Aprende inglés escribiendo.'],
    ['ca', 'Aprèn anglès escrivint.'],
    ['en', 'Learn English by writing.'],
  ])('shows the tagline in %s as the only <h1>', async (lang, tagline) => {
    const { el } = await render(lang);

    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe(tagline);
  });

  it('invites an anonymous visitor to sign up or log in', async () => {
    const { el } = await render('es');

    const links = [...el.querySelectorAll('.hero__actions a')].map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);

    expect(links).toEqual([
      ['Empieza gratis', '/register'],
      ['Ya tengo cuenta', '/login'],
    ]);
  });

  it('takes a signed-in user straight to the writing page', async () => {
    const { el } = await render('es', true);

    const links = [...el.querySelectorAll('.hero__actions a')].map((a) => a.getAttribute('href'));

    expect(links).toEqual(['/write']);
  });

  it('presents the three features with their own headings', async () => {
    const { el } = await render('en');

    expect([...el.querySelectorAll('.feature h3')].map((h) => h.textContent?.trim())).toEqual([
      'Corrections that teach',
      'Your level at a glance',
      'Practice made for you',
    ]);
  });

  it('tells visitors their text goes to an AI provider', async () => {
    const { el } = await render('en');

    expect(el.querySelector('.privacy')?.textContent).toContain('sent to an AI provider');
  });
});
