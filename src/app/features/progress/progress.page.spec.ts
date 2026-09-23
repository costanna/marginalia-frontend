import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { stubChartEnvironment } from '../../../testing/canvas-stub';
import { apiErrorBody } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/toast/toast.service';
import { CategoryCount, OverviewStats, ProgressPoint, RuleCount } from './progress.models';
import { ProgressPage } from './progress.page';

const API = environment.apiUrl;

const OVERVIEW: OverviewStats = {
  texts_count: 12,
  words_count: 840,
  errors_per_100_words: 4.3,
  current_level: 'B1',
  streak_days: 3,
};

const PROGRESS_POINTS: ProgressPoint[] = [
  { day: '2026-09-20', errors_per_100_words: 6, word_count: 100 },
  { day: '2026-09-21', errors_per_100_words: 4, word_count: 120 },
];

const CATEGORIES: CategoryCount[] = [
  { category: 'grammar', count: 5 },
  { category: 'spelling', count: 2 },
  { category: 'vocabulary', count: 0 },
  { category: 'punctuation', count: 0 },
  { category: 'style', count: 1 },
];

const ZERO_CATEGORIES: CategoryCount[] = CATEGORIES.map((c) => ({ ...c, count: 0 }));

const RULES: RuleCount[] = [
  { rule_tag: 'articles', count: 4 },
  { rule_tag: 'verb_tense', count: 3 },
];

interface Responses {
  overview?: OverviewStats;
  progress?: ProgressPoint[];
  categories?: CategoryCount[];
  rules?: RuleCount[];
}

let restoreCanvas: () => void = () => undefined;

async function render(lang = 'es') {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  restoreCanvas = stubChartEnvironment();
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      // Chart.js registration comes from ProgressPage's own @Component providers, not from here.
      provideRouter([{ path: 'progress', component: ProgressPage }]),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/progress', ProgressPage);
  const el = harness.routeNativeElement as HTMLElement;
  const settle = () => harness.fixture.whenStable();
  const q = <T extends Element>(selector: string) => el.querySelector<T>(selector);
  const qa = <T extends Element>(selector: string) => Array.from(el.querySelectorAll<T>(selector));
  return {
    backend,
    el,
    q,
    qa,
    settle,
    toasts: TestBed.inject(ToastService),
    /** Answers all four pending GET /stats/* requests with success bodies. */
    respond: async (data: Responses = {}) => {
      backend.expectOne(`${API}/stats/overview`).flush(data.overview ?? OVERVIEW);
      backend.expectOne(`${API}/stats/progress?days=90`).flush(data.progress ?? PROGRESS_POINTS);
      backend
        .expectOne(`${API}/stats/errors-by-category?days=30`)
        .flush(data.categories ?? CATEGORIES);
      backend.expectOne(`${API}/stats/top-rules?days=30`).flush(data.rules ?? RULES);
      await settle();
    },
    /**
     * Fails the overview request. Whether `forkJoin` manages to cancel the sibling requests before
     * this returns isn't guaranteed, so drain whatever of the other three is still open too —
     * otherwise a later retry's fresh requests would collide with these leftover ones.
     */
    fail: async () => {
      backend
        .expectOne(`${API}/stats/overview`)
        .flush(apiErrorBody('unknown'), { status: 500, statusText: 'Server Error' });
      for (const url of [
        `${API}/stats/progress?days=90`,
        `${API}/stats/errors-by-category?days=30`,
        `${API}/stats/top-rules?days=30`,
      ]) {
        backend.match(url).forEach((request) => {
          if (!request.cancelled) {
            request.flush([]);
          }
        });
      }
      await settle();
    },
  };
}

describe('ProgressPage', () => {
  // A try/finally: if verify() finds a leftover request and throws, the globals below must still
  // be un-stubbed, or the framework's own TestBed teardown (registered after this hook) never
  // runs, wrongly failing every later test with "test module already instantiated".
  afterEach(() => {
    try {
      TestBed.inject(HttpTestingController).verify();
    } finally {
      vi.unstubAllGlobals();
      restoreCanvas();
    }
  });

  describe('loading, error and empty states', () => {
    it('shows the loading state until the data arrives', async () => {
      const { q, respond } = await render();

      expect(q('[role="status"]')?.textContent).toContain('Cargando tu progreso');
      expect(q('app-skeleton')).not.toBeNull();

      await respond();

      expect(q('[role="status"].progress__state')).toBeNull();
    });

    it('shows an error and can retry, without a toast', async () => {
      const { q, fail, respond, toasts } = await render();

      await fail();

      expect(q('[role="alert"]')?.textContent).toContain('No hemos podido cargar tu progreso');
      expect(toasts.toasts()).toEqual([]);

      q<HTMLButtonElement>('app-button button')!.click();
      await respond();

      expect(q('[role="alert"]')).toBeNull();
      expect(q('.kpis')).not.toBeNull();
    });

    it('invites a fresh account to write its first text instead of showing empty charts', async () => {
      const { q, respond } = await render();

      await respond({ overview: { ...OVERVIEW, texts_count: 0 } });

      expect(q('.empty__title')?.textContent).toContain('Todavía no hay datos suficientes');
      expect(q<HTMLAnchorElement>('.empty a')?.getAttribute('href')).toBe('/write');
      expect(q('.kpis')).toBeNull();
    });
  });

  describe('KPIs', () => {
    it('shows the overview totals', async () => {
      const { el, respond } = await render();
      await respond();

      const dd = kpiValues(el);
      expect(dd).toEqual(['12', '840', '4.3', 'B1', '3 días']);
    });

    it('shows an em dash for a level not estimated yet', async () => {
      const { el, respond } = await render();
      await respond({ overview: { ...OVERVIEW, current_level: null } });

      expect(kpiValues(el)[3]).toBe('—');
    });
  });

  describe('charts', () => {
    it('renders the line chart with a describing label', async () => {
      const { q, respond } = await render();
      await respond();

      const canvas = q('#chart-line-title')?.parentElement?.querySelector('canvas');
      expect(canvas).not.toBeNull();
      expect(canvas?.getAttribute('role')).toBe('img');
      expect(canvas?.getAttribute('aria-label')).toBe(
        'Gráfico de líneas con los errores cada 100 palabras por día',
      );
    });

    it('renders the category donut when there is at least one error', async () => {
      const { q, respond } = await render();
      await respond();

      expect(q('.chart__canvas--donut canvas')).not.toBeNull();
      expect(q('.chart__empty')).toBeNull();
    });

    it('shows a message instead of an empty donut when no errors are recorded yet', async () => {
      const { q, respond } = await render();
      await respond({ categories: ZERO_CATEGORIES });

      expect(q('.chart__canvas--donut')).toBeNull();
      expect(q('#chart-donut-title')?.parentElement?.textContent).toContain(
        'Todavía no hay errores registrados',
      );
    });

    it('renders the top-rules bar chart when there are rules', async () => {
      const { q, respond } = await render();
      await respond();

      expect(q('.chart__canvas--bar canvas')).not.toBeNull();
    });

    it('shows a message instead of an empty bar chart when there are no rules yet', async () => {
      const { q, respond } = await render();
      await respond({ rules: [] });

      expect(q('.chart__canvas--bar')).toBeNull();
      expect(q('#chart-bar-title')?.parentElement?.textContent).toContain(
        'Todavía no hay suficientes datos',
      );
    });
  });

  describe('translations', () => {
    it('renders in English when the language is English', async () => {
      const { q, el, respond } = await render('en');
      await respond();

      expect(q('h1')?.textContent).toBe('Your progress');
      expect(kpiValues(el)[4]).toBe('3 days');
    });
  });
});

/** The text of every <dd> inside the KPI list, in order. */
function kpiValues(el: HTMLElement): (string | undefined)[] {
  return [...el.querySelectorAll('.kpis dd')].map((dd) => dd.textContent?.trim());
}
