import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTestI18n } from '../testing/i18n-testing';
import { routes } from './app.routes';
import { TOKEN_STORAGE_KEY } from './core/auth/auth.service';
import { LanguageService } from './core/i18n/language.service';
import { PageTitleStrategy } from './core/i18n/page-title.strategy';

async function setup(signedIn: boolean) {
  localStorage.clear();
  if (signedIn) {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'tok');
  }
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: TitleStrategy, useExisting: PageTitleStrategy },
    ],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  return { harness: await RouterTestingHarness.create(), router: TestBed.inject(Router) };
}

describe('routes', () => {
  it('shows the landing page at /', async () => {
    const { harness } = await setup(false);

    await harness.navigateByUrl('/');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Aprende inglés escribiendo.',
    );
  });

  it('sends an anonymous visitor from a private page to login, remembering it', async () => {
    const { harness, router } = await setup(false);

    await harness.navigateByUrl('/write');

    expect(router.url).toBe('/login?returnUrl=%2Fwrite');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Iniciar sesión',
    );
  });

  it('lets a signed-in user into a private page', async () => {
    const { harness, router } = await setup(true);

    await harness.navigateByUrl('/write');

    expect(router.url).toBe('/write');
    expect(document.title).toBe('Escribir · Marginalia');
  });

  it.each(['/login', '/register'])(
    'keeps a signed-in user out of %s (goes to the app instead)',
    async (path) => {
      const { harness, router } = await setup(true);

      await harness.navigateByUrl(path);

      expect(router.url).toBe('/write');
    },
  );

  it('shows a translated 404 page for an unknown address', async () => {
    const { harness } = await setup(false);

    await harness.navigateByUrl('/this/does/not/exist');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain(
      'Esta página no existe',
    );
    expect(document.title).toBe('Esta página no existe · Marginalia');
  });

  it('titles the public pages with their translated name', async () => {
    const { harness } = await setup(false);

    await harness.navigateByUrl('/register');

    expect(document.title).toBe('Crear cuenta · Marginalia');
  });
});
