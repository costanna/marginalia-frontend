import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from '../../core/i18n/language.service';
import { TextPage, TextSummary } from './history.models';
import { HistoryPage } from './history.page';

const API = environment.apiUrl;
const LIST = (query: string) => `${API}/texts?${query}`;

@Component({ template: '' })
class Stub {}

function summary(n: number, overrides: Partial<TextSummary> = {}): TextSummary {
  return {
    id: `id-${n}`,
    title: `Text ${n}`,
    cefr_level: 'B1',
    word_count: 12,
    corrections_count: 3,
    created_at: '2026-09-21T12:00:00Z',
    ...overrides,
  };
}

function pageOf(items: TextSummary[], total = items.length, page = 1): TextPage {
  return { items, page, page_size: 12, total };
}

async function render(url = '/history', lang = 'es') {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([
        { path: 'history', component: HistoryPage },
        { path: 'write', component: Stub },
        { path: 'history/:id', component: Stub },
      ]),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url, HistoryPage);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = () => harness.fixture.whenStable();
  return {
    backend,
    router: TestBed.inject(Router),
    el,
    settle,
    q: <T extends Element>(selector: string) => el.querySelector<T>(selector),
    qa: <T extends Element>(selector: string) => Array.from(el.querySelectorAll<T>(selector)),
    /** Answer the request currently pending with a page (or an error) and let the screen update. */
    answer: async (query: string, body: TextPage | 'error') => {
      const request: TestRequest = backend.expectOne(LIST(query));
      if (body === 'error') {
        request.flush({}, { status: 500, statusText: 'Server Error' });
      } else {
        request.flush(body);
      }
      await settle();
    },
    url: () => TestBed.inject(Router).url,
  };
}

describe('HistoryPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('the list', () => {
    it('shows the loading state until the answer arrives', async () => {
      const { q, answer } = await render();

      expect(q('[role="status"]')?.textContent).toContain('Cargando tus textos');
      expect(q('app-skeleton')).not.toBeNull();

      await answer('page=1&page_size=12', pageOf([summary(1)]));

      expect(q('[role="status"]')).toBeNull();
    });

    it('shows a card per text with the title, the date, the level and the counts', async () => {
      const { qa, q, answer } = await render();

      await answer('page=1&page_size=12', pageOf([summary(1), summary(2, { title: null })]));

      const cards = qa('.history-card');
      expect(cards).toHaveLength(2);
      expect(cards[0].querySelector('.history-card__link')?.textContent?.trim()).toBe('Text 1');
      expect(cards[0].querySelector('.history-card__date')?.textContent).toMatch(/21 sept\.? 2026/);
      expect(cards[0].querySelector('.chip')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Nivel estimado: B1',
      );
      expect(cards[0].textContent).toContain('Palabras: 12');
      expect(cards[0].textContent).toContain('Correcciones: 3');
      // A text saved without a title still gets a name to click on.
      expect(cards[1].querySelector('.history-card__link')?.textContent?.trim()).toBe(
        'Texto sin título',
      );
      expect(q('h1')?.textContent).toBe('Historial');
    });

    it('links every card to its own detail page', async () => {
      const { qa, answer } = await render();

      await answer('page=1&page_size=12', pageOf([summary(1), summary(2)]));

      expect(
        qa<HTMLAnchorElement>('.history-card__link').map((a) => a.getAttribute('href')),
      ).toEqual(['/history/id-1', '/history/id-2']);
    });

    it('writes the texts in the language of the interface, and follows a change of language', async () => {
      const { q, answer, settle } = await render();
      await answer('page=1&page_size=12', pageOf([summary(1)]));

      await TestBed.inject(LanguageService).setLanguage('en');
      await settle();

      expect(q('.history-card')?.textContent).toContain('Words: 12');
      expect(q('.history-card__date')?.textContent).toMatch(/Sep 21, 2026/);
    });

    it('does not use text from the server as markup', async () => {
      const { q, answer } = await render();

      await answer(
        'page=1&page_size=12',
        pageOf([summary(1, { title: '<img src=x onerror=alert(1)>' })]),
      );

      expect(q('.history-card img')).toBeNull();
      expect(q('.history-card__link')?.textContent).toContain('<img src=x');
    });
  });

  describe('when there is nothing to show', () => {
    it('invites the user to write their first text', async () => {
      const { q, answer } = await render();

      await answer('page=1&page_size=12', pageOf([]));

      expect(q('.empty__title')?.textContent).toContain('Todavía no has guardado ningún texto');
      expect(q<HTMLAnchorElement>('.empty a')?.getAttribute('href')).toBe('/write');
      expect(q('.history-card')).toBeNull();
    });

    it('explains that a level has no texts, and can clear the filter', async () => {
      const { q, answer, settle, url } = await render('/history?level=C2');
      await answer('page=1&page_size=12&level=C2', pageOf([]));

      expect(q('.empty__title')?.textContent).toContain('Ningún texto de este nivel');

      q<HTMLButtonElement>('.empty button')!.click();
      await settle();
      await answer('page=1&page_size=12', pageOf([summary(1)]));

      expect(url()).toBe('/history');
    });
  });

  describe('when it cannot load', () => {
    it('says so and can try again', async () => {
      const { q, answer, settle } = await render();

      await answer('page=1&page_size=12', 'error');
      expect(q('[role="alert"]')?.textContent).toContain('No hemos podido cargar tus textos');
      expect(q('.history-card')).toBeNull();

      q<HTMLButtonElement>('app-button button')!.click();
      await settle();
      await answer('page=1&page_size=12', pageOf([summary(1)]));

      expect(q('[role="alert"]')).toBeNull();
      expect(q('.history-card')).not.toBeNull();
    });
  });

  describe('the level filter', () => {
    const chooseLevel = async (
      select: HTMLSelectElement,
      value: string,
      settle: () => Promise<unknown>,
    ) => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      await settle();
    };

    it('offers every level, and "all" when none is chosen', async () => {
      const { qa, q, answer } = await render();
      await answer('page=1&page_size=12', pageOf([summary(1)]));

      const options = qa<HTMLOptionElement>('#history-level option');

      expect(options.map((o) => o.textContent?.trim())).toEqual([
        'Todos los niveles',
        'A1',
        'A2',
        'B1',
        'B2',
        'C1',
        'C2',
      ]);
      expect(q<HTMLSelectElement>('#history-level')?.value).toBe('');
      expect(q('label[for="history-level"]')?.textContent).toBe('Nivel');
    });

    it('asks for that level only, restarts from the first page and keeps it in the address', async () => {
      const { q, answer, settle, url } = await render('/history?page=3');
      await answer('page=3&page_size=12', pageOf([summary(1)], 50, 3));

      await chooseLevel(q<HTMLSelectElement>('#history-level')!, 'B1', settle);
      await answer('page=1&page_size=12&level=B1', pageOf([summary(2)]));

      expect(url()).toBe('/history?level=B1');
    });

    it('can go back to all levels', async () => {
      const { q, answer, settle, url } = await render('/history?level=B1');
      await answer('page=1&page_size=12&level=B1', pageOf([summary(1)]));
      expect(q<HTMLSelectElement>('#history-level')?.value).toBe('B1');

      await chooseLevel(q<HTMLSelectElement>('#history-level')!, '', settle);
      await answer('page=1&page_size=12', pageOf([summary(1)]));

      expect(url()).toBe('/history');
    });

    it('reads the level and the page from the address', async () => {
      const { answer } = await render('/history?level=B2&page=2');

      await answer('page=2&page_size=12&level=B2', pageOf([summary(1)], 20, 2));
    });

    it('ignores a level or a page that make no sense', async () => {
      const { q, answer } = await render('/history?level=Z9&page=abc');

      await answer('page=1&page_size=12', pageOf([summary(1)]));

      expect(q<HTMLSelectElement>('#history-level')?.value).toBe('');
    });

    it('drops the answer to a filter the user has already left', async () => {
      const { qa, q, backend, answer, settle } = await render();
      const first = backend.expectOne(LIST('page=1&page_size=12'));

      await chooseLevel(q<HTMLSelectElement>('#history-level')!, 'B1', settle);
      await answer('page=1&page_size=12&level=B1', pageOf([summary(9, { title: 'Only B1' })]));

      expect(first.cancelled).toBe(true);
      expect(qa('.history-card__link').map((a) => a.textContent?.trim())).toEqual(['Only B1']);
    });
  });

  describe('paging', () => {
    const twelve = () => Array.from({ length: 12 }, (_, i) => summary(i + 1));
    const buttons = (qa: (s: string) => HTMLButtonElement[]) => qa('.pager button');

    it('is not shown when everything fits on one page', async () => {
      const { q, answer } = await render();

      await answer('page=1&page_size=12', pageOf([summary(1)]));

      expect(q('.pager')).toBeNull();
    });

    it('tells the page the user is on, and cannot go before the first', async () => {
      const { q, qa, answer } = await render();

      await answer('page=1&page_size=12', pageOf(twelve(), 30));

      expect(q('.pager__status')?.textContent?.trim()).toBe('Página 1 de 3');
      const [previous, next] = buttons(qa);
      expect(previous.disabled).toBe(true);
      expect(next.disabled).toBe(false);
      expect(q('.pager')?.getAttribute('aria-label')).toBe('Páginas');
      expect(q('.pager__status')?.getAttribute('aria-live')).toBe('polite');
    });

    it('goes to the next page, and back, through the address', async () => {
      const { qa, answer, settle, url } = await render();
      await answer('page=1&page_size=12', pageOf(twelve(), 30));

      buttons(qa)[1].click();
      await settle();
      await answer('page=2&page_size=12', pageOf(twelve(), 30, 2));
      expect(url()).toBe('/history?page=2');

      buttons(qa)[0].click();
      await settle();
      await answer('page=1&page_size=12', pageOf(twelve(), 30));
      expect(url()).toBe('/history'); // the first page has no page parameter
    });

    it('cannot go past the last page', async () => {
      const { qa, answer } = await render('/history?page=3');

      await answer('page=3&page_size=12', pageOf([summary(1)], 25, 3));

      expect(buttons(qa)[1].disabled).toBe(true);
    });

    it('shows the last page that exists when the address asks for one beyond the end', async () => {
      const { answer, url } = await render('/history?page=9');

      await answer('page=9&page_size=12', pageOf([], 30, 9));
      await answer('page=3&page_size=12', pageOf([summary(1)], 30, 3));

      expect(url()).toBe('/history?page=3');
    });
  });
});
