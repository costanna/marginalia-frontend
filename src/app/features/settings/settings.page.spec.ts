import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { apiErrorBody, makeUser } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { User } from '../../core/auth/auth.models';
import { AuthService, TOKEN_STORAGE_KEY } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/theme/theme.service';
import { ToastService } from '../../core/toast/toast.service';
import { SettingsPage } from './settings.page';

const API = environment.apiUrl;

@Component({ template: '' })
class Stub {}

interface Options {
  /** false: the profile has not arrived yet (a cold server). */
  profile?: User | false;
}

async function render({
  profile = makeUser({ display_name: 'Marta', target_level: 'B1' }),
}: Options = {}) {
  localStorage.clear();
  localStorage.setItem(TOKEN_STORAGE_KEY, 'tok');
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'settings', component: SettingsPage },
        { path: '', component: Stub },
      ]),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  const auth = TestBed.inject(AuthService);
  if (profile) {
    auth.updateUser(profile);
  }
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/settings', SettingsPage);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = () => harness.fixture.whenStable();
  const q = <T extends Element>(selector: string) => el.querySelector<T>(selector);
  const type = async (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const submit = async () => {
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await settle();
  };
  return {
    auth,
    backend,
    el,
    q,
    settle,
    type,
    submit,
    toasts: TestBed.inject(ToastService),
    url: () => TestBed.inject(Router).url,
    name: () => q<HTMLInputElement>('input')!,
    level: () => q<HTMLSelectElement>('#settings-level')!,
    toastList: () =>
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => [t.kind, t.message]),
  };
}

describe('SettingsPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('the profile', () => {
    it('shows the email and the current name and target level', async () => {
      const { q, name, level } = await render();

      expect(q('.settings__email')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Correo electrónico ana@example.com',
      );
      expect(name().value).toBe('Marta');
      expect(level().value).toBe('B1');
      expect(Array.from(level().options).map((o) => o.textContent?.trim())).toEqual([
        'Sin definir',
        'A2',
        'B1',
        'B2',
        'C1',
        'C2',
      ]);
    });

    it('shows "not set" for a user without a target level', async () => {
      const { level } = await render({ profile: makeUser({ target_level: null }) });

      expect(level().value).toBe('');
    });

    it('waits for the profile on a cold start, then fills the form', async () => {
      const { q, auth, settle, name } = await render({ profile: false });
      expect(q('form')).toBeNull();
      expect(q('app-skeleton')).not.toBeNull();

      auth.updateUser(makeUser({ display_name: 'Late Marta' }));
      await settle();

      expect(q('app-skeleton')).toBeNull();
      expect(name().value).toBe('Late Marta');
    });

    it('does not overwrite what the user is typing when the profile is refreshed', async () => {
      const { auth, settle, type, name } = await render();
      await type(name(), 'Typing…');

      auth.updateUser(makeUser({ display_name: 'From the server' }));
      await settle();

      expect(name().value).toBe('Typing…');
    });

    it('saves the changes, updates the session and says so', async () => {
      const { auth, backend, settle, type, submit, name, level, toastList } = await render();
      await type(name(), '  Marta Ruiz ');
      level().value = 'C1';
      level().dispatchEvent(new Event('change'));
      await settle();

      await submit();
      const request = backend.expectOne(`${API}/me`);
      request.flush(makeUser({ display_name: 'Marta Ruiz', target_level: 'C1' }));
      await settle();

      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ display_name: 'Marta Ruiz', target_level: 'C1' });
      expect(auth.user()?.display_name).toBe('Marta Ruiz');
      expect(toastList()).toEqual([['success', 'Cambios guardados.']]);
      expect(name().value).toBe('Marta Ruiz');
    });

    it('can clear the target level', async () => {
      const { backend, settle, submit, level } = await render();
      level().value = '';
      level().dispatchEvent(new Event('change'));
      await settle();

      await submit();
      const request = backend.expectOne(`${API}/me`);
      request.flush(makeUser({ target_level: null }));

      expect(request.request.body.target_level).toBeNull();
    });

    it.each([
      ['empty', '', 'Este campo es obligatorio.'],
      ['only spaces', '   ', 'Este campo es obligatorio.'],
      ['over the limit', 'x'.repeat(81), 'Puede tener como máximo 80 caracteres.'],
    ])('does not send a name that is %s, and explains why', async (_case, value, message) => {
      const { q, type, submit, name } = await render();
      await type(name(), value);

      await submit();

      expect(q('.error')?.textContent?.trim()).toBe(message);
      // TestBed.verify() in afterEach also proves that no request was sent.
    });

    it('counts an emoji as one character, like the API', async () => {
      const { backend, type, submit, name } = await render();
      await type(name(), '😀'.repeat(80));

      await submit();

      backend.expectOne(`${API}/me`).flush(makeUser({ display_name: '😀'.repeat(80) }));
    });

    it('sends one request even if it is submitted twice', async () => {
      const { backend, submit } = await render();

      await submit();
      await submit();

      backend.expectOne(`${API}/me`).flush(makeUser());
    });

    it('keeps what was typed, and explains, when the save fails', async () => {
      const { backend, settle, type, submit, name, toastList } = await render();
      await type(name(), 'Marta Ruiz');

      await submit();
      backend
        .expectOne(`${API}/me`)
        .flush(apiErrorBody('validation_error'), { status: 422, statusText: 'Unprocessable' });
      await settle();

      expect(name().value).toBe('Marta Ruiz');
      expect(toastList().map(([kind]) => kind)).toEqual(['error']);
    });
  });

  describe('appearance and language', () => {
    it('shows the current theme and language', async () => {
      const { q } = await render();

      expect(q<HTMLSelectElement>('#settings-theme')?.value).toBe('system');
      expect(q<HTMLSelectElement>('#settings-language')?.value).toBe('es');
      expect(
        Array.from(q<HTMLSelectElement>('#settings-theme')!.options).map((o) =>
          o.textContent?.trim(),
        ),
      ).toEqual(['Claro', 'Oscuro', 'Sistema']);
    });

    it('changes the theme now and saves it to the account', async () => {
      const { q, backend, settle } = await render();
      const select = q<HTMLSelectElement>('#settings-theme')!;

      select.value = 'dark';
      select.dispatchEvent(new Event('change'));
      await settle();

      expect(TestBed.inject(ThemeService).preference()).toBe('dark');
      const request = backend.expectOne(`${API}/me`);
      expect(request.request.body).toEqual({ theme_preference: 'dark' });
      request.flush(makeUser({ theme_preference: 'dark' }));
    });

    it('changes the language now, saves it, and translates the screen', async () => {
      const { q, backend, settle } = await render();
      const select = q<HTMLSelectElement>('#settings-language')!;

      select.value = 'en';
      select.dispatchEvent(new Event('change'));
      await settle();

      expect(q('h1')?.textContent).toBe('Settings');
      const request = backend.expectOne(`${API}/me`);
      expect(request.request.body).toEqual({ ui_language: 'en' });
      request.flush(makeUser({ ui_language: 'en' }));
    });
  });

  describe('exporting the data', () => {
    let clicked: string[];

    beforeEach(() => {
      clicked = [];
      URL.createObjectURL = vi.fn(() => 'blob:test');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push(this.download);
      });
    });

    afterEach(() => vi.restoreAllMocks());

    const exportButton = (q: <T extends Element>(s: string) => T | null) =>
      q<HTMLButtonElement>(
        '#settings-data app-button button, section[aria-labelledby="settings-data"] app-button button',
      )!;

    it('downloads everything as a JSON file named after the day, and says so', async () => {
      const { q, backend, settle, toastList } = await render();
      const data = {
        exported_at: '2026-09-21T12:00:00Z',
        profile: makeUser(),
        texts: [],
        usage: [],
      };

      exportButton(q).click();
      await settle();
      const request = backend.expectOne(`${API}/me/export`);
      request.flush(data);
      await settle();

      expect(request.request.method).toBe('GET');
      expect(clicked).toEqual(['marginalia-export-2026-09-21.json']);
      expect(toastList()).toEqual([['success', 'Tus datos se han descargado.']]);
    });

    it('sends one request even if the button is pressed twice', async () => {
      const { q, backend, settle } = await render();

      exportButton(q).click();
      await settle();
      exportButton(q).click(); // disabled while busy
      await settle();

      backend
        .expectOne(`${API}/me/export`)
        .flush({ exported_at: '2026-09-21T12:00:00Z', profile: makeUser(), texts: [], usage: [] });
    });

    it('explains a refusal (too many exports) and downloads nothing', async () => {
      const { q, backend, settle, toastList } = await render();

      exportButton(q).click();
      await settle();
      backend
        .expectOne(`${API}/me/export`)
        .flush(apiErrorBody('rate_limit_exceeded'), { status: 429, statusText: 'Too Many' });
      await settle();

      expect(clicked).toEqual([]);
      expect(toastList()).toEqual([
        ['error', 'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.'],
      ]);
      expect(exportButton(q).disabled).toBe(false); // it can be tried again
    });
  });

  describe('deleting the account', () => {
    const open = async (ctx: Awaited<ReturnType<typeof render>>) => {
      ctx.q<HTMLButtonElement>('.settings__danger button')!.click();
      await ctx.settle();
    };
    const dialog = (ctx: Awaited<ReturnType<typeof render>>) =>
      ctx.q<HTMLDialogElement>('app-confirm-dialog dialog')!;
    const buttons = (ctx: Awaited<ReturnType<typeof render>>) =>
      Array.from(ctx.el.querySelectorAll<HTMLButtonElement>('app-confirm-dialog button'));

    it('warns first and sends nothing until the user confirms', async () => {
      const ctx = await render();

      await open(ctx);

      expect(dialog(ctx).open).toBe(true);
      expect(dialog(ctx).querySelector('h2')?.textContent).toBe('¿Eliminar tu cuenta?');
      expect(dialog(ctx).textContent).toContain('se borrarán para siempre');
      expect(buttons(ctx)[0].textContent?.trim()).toBe('Cancelar');
    });

    it('keeps the account when the user cancels', async () => {
      const ctx = await render();
      await open(ctx);

      buttons(ctx)[0].click();
      await ctx.settle();

      expect(dialog(ctx).open).toBe(false);
      expect(ctx.auth.isAuthenticated()).toBe(true);
    });

    it('deletes the account, ends the session, goes to the home page and says so', async () => {
      const ctx = await render();
      await open(ctx);

      buttons(ctx)[1].click();
      await ctx.settle();
      const request = ctx.backend.expectOne(`${API}/me`);
      request.flush(null, { status: 204, statusText: 'No Content' });
      await ctx.settle();

      expect(request.request.method).toBe('DELETE');
      expect(ctx.auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
      expect(ctx.url()).toBe('/');
      expect(dialog(ctx)?.open ?? false).toBe(false);
      expect(ctx.toastList()).toEqual([['success', 'Tu cuenta se ha eliminado.']]);
    });

    it('cannot be dismissed, or sent twice, while the request runs', async () => {
      const ctx = await render();
      await open(ctx);

      buttons(ctx)[1].click();
      await ctx.settle();
      buttons(ctx)[1].click();
      dialog(ctx).click(); // the backdrop
      await ctx.settle();

      expect(dialog(ctx).open).toBe(true);
      ctx.backend.expectOne(`${API}/me`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('keeps the account and explains when the deletion fails', async () => {
      const ctx = await render();
      await open(ctx);

      buttons(ctx)[1].click();
      await ctx.settle();
      ctx.backend
        .expectOne(`${API}/me`)
        .flush(apiErrorBody('unknown'), { status: 500, statusText: 'Server Error' });
      await ctx.settle();

      expect(dialog(ctx).open).toBe(false);
      expect(ctx.auth.isAuthenticated()).toBe(true);
      expect(ctx.toastList().map(([kind]) => kind)).toEqual(['error']);
      expect(ctx.url()).toBe('/settings');
    });
  });

  describe('the side menu', () => {
    beforeEach(() => {
      Element.prototype.scrollIntoView = vi.fn();
    });

    it('lists the four sections', async () => {
      const { el } = await render();

      const items = Array.from(el.querySelectorAll('.settings__menu button')).map((b) =>
        b.textContent?.trim(),
      );

      expect(items).toEqual(['Perfil', 'Apariencia e idioma', 'Tus datos', 'Eliminar cuenta']);
      expect(el.querySelector('.settings__menu')?.getAttribute('aria-label')).toBe(
        'Secciones de ajustes',
      );
    });

    it('jumps to a section and moves the focus to its heading', async () => {
      const { el, q } = await render();

      Array.from(el.querySelectorAll<HTMLButtonElement>('.settings__menu button'))[2].click();

      const heading = q<HTMLElement>('#settings-data')!;
      expect(heading.textContent?.trim()).toBe('Tus datos');
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
      expect(document.activeElement).toBe(heading);
    });

    it('labels every section with its own heading', async () => {
      const { el } = await render();

      const sections = Array.from(el.querySelectorAll('section[aria-labelledby]'));

      expect(sections).toHaveLength(4);
      for (const section of sections) {
        const id = section.getAttribute('aria-labelledby')!;
        expect(section.querySelector(`h2#${id}`)).not.toBeNull();
      }
    });
  });
});
