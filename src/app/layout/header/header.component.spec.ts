import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { AuthService, TOKEN_STORAGE_KEY } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { HeaderComponent } from './header.component';

async function render(signedIn = false) {
  localStorage.clear();
  if (signedIn) {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'tok');
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  TestBed.configureTestingModule({
    imports: [HeaderComponent],
    providers: [
      provideTestI18n(),
      provideRouter([{ path: '**', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(HeaderComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    dialog: el.querySelector('dialog') as HTMLDialogElement,
    menuButton: el.querySelector('.header__menu-button') as HTMLButtonElement,
    router: TestBed.inject(Router),
  };
}

const texts = (nodes: NodeListOf<Element>) => [...nodes].map((n) => n.textContent?.trim());

describe('HeaderComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  describe('anonymous visitor', () => {
    it('offers login and sign-up, and no private navigation', async () => {
      const { el } = await render(false);

      expect(texts(el.querySelectorAll('.header__actions a.btn'))).toEqual([
        'Iniciar sesión',
        'Crear cuenta',
      ]);
      expect(el.querySelectorAll('.header__nav a')).toHaveLength(0);
      expect(el.querySelector('.header__actions button.btn')).toBeNull(); // no logout
    });
  });

  describe('signed-in user', () => {
    it('shows the navigation and a logout button instead of login and sign-up', async () => {
      const { el } = await render(true);

      expect(texts(el.querySelectorAll('.header__nav a'))).toEqual([
        'Escribir',
        'Historial',
        'Practicar',
        'Ajustes',
      ]);
      expect(el.querySelector('.header__actions a.btn')).toBeNull();
      expect(el.querySelector('.header__actions button.btn')?.textContent?.trim()).toBe(
        'Cerrar sesión',
      );
    });

    it('logs out and goes home', async () => {
      const { fixture, el, router } = await render(true);
      const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

      (el.querySelector('.header__actions button.btn') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(navigate).toHaveBeenCalledWith('/');
      expect(el.querySelector('.header__nav a')).toBeNull();
    });
  });

  describe('landmarks and labels', () => {
    it('has a labelled main navigation', async () => {
      const { el } = await render();

      expect(el.querySelector('header nav')?.getAttribute('aria-label')).toBe(
        'Navegación principal',
      );
    });

    it('names the logo link by its visible wordmark, without an aria-label that could differ', async () => {
      const { el } = await render();

      const logo = el.querySelector('.header__logo') as HTMLAnchorElement;

      // WCAG 2.5.3 (Label in Name): a label override that does not match the visible text breaks
      // voice control ("click Marginalia"). With no override the name is the visible wordmark.
      expect(logo.hasAttribute('aria-label')).toBe(false);
      expect(logo.querySelector('.wordmark')?.textContent?.trim()).toBe('Marginalia');
      expect(logo.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(logo.getAttribute('href')).toBe('/');
    });

    it('has a menu button that announces the dialog it opens', async () => {
      const { menuButton } = await render();

      expect(menuButton.getAttribute('aria-label')).toBe('Menú');
      expect(menuButton.getAttribute('aria-haspopup')).toBe('dialog');
      expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('mobile side panel', () => {
    it('opens from the menu button and reports it as expanded', async () => {
      const { fixture, dialog, menuButton } = await render();

      menuButton.click();
      fixture.detectChanges();

      expect(dialog.open).toBe(true);
      expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    });

    it('holds navigation, language and theme', async () => {
      const { fixture, dialog, menuButton } = await render(true);

      menuButton.click();
      fixture.detectChanges();

      expect(dialog.querySelector('nav a')?.textContent?.trim()).toBe('Escribir');
      expect(dialog.querySelector('app-language-switcher select')).not.toBeNull();
      expect(dialog.querySelector('app-theme-toggle button')).not.toBeNull();
    });

    it('closes with its close button', async () => {
      const { fixture, dialog, menuButton } = await render();
      menuButton.click();
      fixture.detectChanges();

      (dialog.querySelector('.panel__close') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(dialog.open).toBe(false);
      expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    });

    it('closes when the backdrop (the dialog itself) is clicked, but not its content', async () => {
      const { fixture, dialog, menuButton } = await render();
      menuButton.click();
      fixture.detectChanges();

      (dialog.querySelector('.panel__content') as HTMLElement).click();
      expect(dialog.open).toBe(true);

      dialog.click();
      expect(dialog.open).toBe(false);
    });

    it('closes when the user navigates', async () => {
      const { fixture, dialog, menuButton, router } = await render();
      menuButton.click();
      fixture.detectChanges();

      await router.navigateByUrl('/login');

      expect(dialog.open).toBe(false);
    });

    it('offers login and sign-up to an anonymous visitor', async () => {
      const { dialog } = await render(false);

      expect(texts(dialog.querySelectorAll('.panel__account a'))).toEqual([
        'Crear cuenta',
        'Iniciar sesión',
      ]);
    });
  });
});
