import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { apiErrorBody } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/toast/toast.service';
import { AnalysisResult } from '../write/analysis.models';
import { HistoryDetailPage } from './history-detail.page';

const API = environment.apiUrl;

@Component({ template: '' })
class Stub {}

const TEXT: AnalysisResult = {
  id: 'abc',
  title: 'My weekend',
  original_text: 'Yesterday I go to the cinema.',
  corrected_text: 'Yesterday I went to the cinema.',
  cefr_level: 'A2',
  word_count: 6,
  summary: 'Buen comienzo.',
  ui_language: 'es',
  created_at: '2026-09-21T12:00:00Z',
  corrections: [
    {
      id: 'c1',
      start: 12,
      end: 14,
      original: 'go',
      suggestion: 'went',
      category: 'grammar',
      rule_tag: 'verb_tense',
      explanation: "Con 'yesterday' se usa el pasado simple.",
    },
  ],
};

async function render(id = 'abc') {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'history/:id', component: HistoryDetailPage },
        { path: 'history', component: Stub },
      ]),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(`/history/${id}`, HistoryDetailPage);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = () => harness.fixture.whenStable();
  const q = <T extends Element>(selector: string) => el.querySelector<T>(selector);
  return {
    backend,
    el,
    settle,
    q,
    toasts: TestBed.inject(ToastService),
    url: () => TestBed.inject(Router).url,
    dialog: () => q<HTMLDialogElement>('app-confirm-dialog dialog')!,
    /** The buttons of the confirmation dialog: [cancel, confirm]. */
    dialogButtons: () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('app-confirm-dialog button')),
    load: async (path = id, body: object = TEXT, status = 200) => {
      const request = backend.expectOne(`${API}/texts/${path}`);
      if (status === 200) {
        request.flush(body);
      } else {
        request.flush(body, { status, statusText: 'Error' });
      }
      await settle();
    },
  };
}

describe('HistoryDetailPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('showing a text', () => {
    it('shows the loading state, then the title, the date and the analysis', async () => {
      const { q, load } = await render();
      expect(q('[role="status"]')?.textContent).toContain('Cargando');

      await load();

      expect(q('[role="status"]')).toBeNull();
      expect(q('h1')?.textContent).toBe('My weekend');
      expect(q('.detail__date')?.textContent?.trim()).toBe('Escrito el 21 de septiembre de 2026');
      // The same result component as right after writing: marks in the text, and the corrections.
      expect(q('app-analysis-result')).not.toBeNull();
      expect(q('.annotated .mark')?.textContent).toBe('go');
      expect(q('.result')?.textContent).toContain('Buen comienzo.');
    });

    it('gives a text saved without a title a name', async () => {
      const { q, load } = await render();

      await load('abc', { ...TEXT, title: null });

      expect(q('h1')?.textContent).toBe('Texto sin título');
    });

    it('does not use the title as markup', async () => {
      const { q, load } = await render();

      await load('abc', { ...TEXT, title: '<img src=x onerror=alert(1)>' });

      expect(q('h1 img')).toBeNull();
      expect(q('h1')?.textContent).toContain('<img src=x');
    });

    it('links back to the history', async () => {
      const { q, load } = await render();
      await load();

      expect(q<HTMLAnchorElement>('.detail__back')?.getAttribute('href')).toBe('/history');
      expect(q('.detail__back')?.textContent).toContain('Volver al historial');
    });

    it('keeps the outline of the page in order: h1 for the title, h2 below it', async () => {
      const { el, load } = await render();

      await load();

      const levels = Array.from(el.querySelectorAll('h1, h2, h3, [role="heading"]')).map(
        (heading) => heading.getAttribute('aria-level') ?? heading.tagName.slice(1),
      );
      expect(levels[0]).toBe('1');
      expect(levels.slice(1).every((level) => Number(level) >= 2)).toBe(true);
    });
  });

  describe('when it cannot be shown', () => {
    it.each([
      ['404', 404, apiErrorBody('not_found')],
      ['a malformed id (422)', 422, apiErrorBody('validation_error')],
    ])('explains that the text does not exist (%s)', async (_name, status, body) => {
      const { q, load } = await render('nope');

      await load('nope', body, status);

      expect(q('.empty__title')?.textContent).toContain('No hemos encontrado este texto');
      expect(q<HTMLAnchorElement>('.empty a')?.getAttribute('href')).toBe('/history');
      expect(q('h1')).toBeNull();
    });

    it('says so on a server error and can try again', async () => {
      const { q, load, settle } = await render();

      await load('abc', apiErrorBody('unknown'), 500);
      expect(q('[role="alert"]')?.textContent).toContain('No hemos podido cargar tus textos');

      q<HTMLButtonElement>('app-button button')!.click();
      await settle();
      await load();

      expect(q('h1')?.textContent).toBe('My weekend');
    });

    it('does not show an error toast: the screen explains it itself', async () => {
      const { load, toasts } = await render('nope');

      await load('nope', apiErrorBody('not_found'), 404);

      expect(toasts.toasts()).toEqual([]);
    });
  });

  describe('deleting', () => {
    it('asks first, and does nothing until the user confirms', async () => {
      const { q, load, dialog, dialogButtons, settle, backend } = await render();
      await load();

      q<HTMLButtonElement>('.detail__head button')!.click();
      await settle();

      expect(dialog().open).toBe(true);
      expect(dialog().querySelector('h2')?.textContent).toBe('¿Eliminar este texto?');
      backend.expectNone(`${API}/texts/abc`); // nothing was sent yet
      expect(dialogButtons()[0].textContent?.trim()).toBe('Cancelar');
    });

    it('does not delete when the user cancels', async () => {
      const { q, load, dialog, dialogButtons, settle, backend, url } = await render();
      await load();
      q<HTMLButtonElement>('.detail__head button')!.click();
      await settle();

      dialogButtons()[0].click();
      await settle();

      expect(dialog().open).toBe(false);
      backend.expectNone(`${API}/texts/abc`);
      expect(url()).toBe('/history/abc');
    });

    it('deletes the text, says so and goes back to the history', async () => {
      const { q, load, dialog, dialogButtons, settle, backend, toasts, url } = await render();
      await load();
      q<HTMLButtonElement>('.detail__head button')!.click();
      await settle();

      dialogButtons()[1].click();
      await settle();
      const request = backend.expectOne(`${API}/texts/abc`);
      request.flush(null, { status: 204, statusText: 'No Content' });
      await settle();

      expect(request.request.method).toBe('DELETE');
      expect(dialog().open).toBe(false);
      expect(toasts.toasts().map((t) => [t.kind, t.message])).toEqual([
        ['success', 'Texto eliminado.'],
      ]);
      expect(url()).toBe('/history');
    });

    it('sends one request even if the button is pressed twice', async () => {
      const { q, load, dialogButtons, settle, backend } = await render();
      await load();
      q<HTMLButtonElement>('.detail__head button')!.click();
      await settle();

      dialogButtons()[1].click();
      await settle();
      dialogButtons()[1].click(); // the button is disabled while busy: this click does nothing
      await settle();

      backend.expectOne(`${API}/texts/abc`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('cannot be dismissed while the request runs', async () => {
      const { q, load, dialog, dialogButtons, settle, backend } = await render();
      await load();
      q<HTMLButtonElement>('.detail__head button')!.click();
      await settle();

      dialogButtons()[1].click();
      await settle();

      expect(dialogButtons()[0].disabled).toBe(true);
      dialog().click(); // the backdrop
      expect(dialog().open).toBe(true);
      backend.expectOne(`${API}/texts/abc`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('stays on the text and explains when the deletion fails', async () => {
      const { q, load, dialog, dialogButtons, settle, backend, toasts, url } = await render();
      await load();
      q<HTMLButtonElement>('.detail__head button')!.click();
      await settle();

      dialogButtons()[1].click();
      await settle();
      backend
        .expectOne(`${API}/texts/abc`)
        .flush(apiErrorBody('unknown'), { status: 500, statusText: 'Server Error' });
      await settle();

      expect(dialog().open).toBe(false);
      expect(toasts.toasts().map((t) => t.kind)).toEqual(['error']);
      expect(url()).toBe('/history/abc');
      expect(q('h1')?.textContent).toBe('My weekend'); // still there: it was not deleted
    });
  });
});
