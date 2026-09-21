import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { apiErrorBody, makeUser } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/toast/toast.service';
import { AnalysisResult } from './analysis.models';
import { WritePage } from './write.page';

const API = environment.apiUrl;
const TEXT = 'Yesterday I go to the cinema with my friends.';

const RESULT: AnalysisResult = {
  id: 'abc',
  title: 'My weekend',
  original_text: TEXT,
  corrected_text: 'Yesterday I went to the cinema with my friends.',
  cefr_level: 'A2',
  word_count: 9,
  summary: 'Buen comienzo.',
  ui_language: 'es',
  created_at: '2026-09-21T10:15:00Z',
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

async function render(lang = 'es') {
  localStorage.clear();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  TestBed.configureTestingModule({
    imports: [WritePage],
    providers: [
      provideTestI18n(),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  TestBed.inject(AuthService).updateUser(makeUser({ display_name: 'Marta' }));
  const fixture = TestBed.createComponent(WritePage);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const area = () => el.querySelector<HTMLTextAreaElement>('textarea')!;
  const type = (value: string, field: 'textarea' | 'input' = 'textarea') => {
    const control = el.querySelector<HTMLTextAreaElement | HTMLInputElement>(field)!;
    control.value = value;
    control.dispatchEvent(new Event('input'));
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  return {
    fixture,
    el,
    area,
    type,
    submit,
    backend: TestBed.inject(HttpTestingController),
    async settle() {
      fixture.detectChanges();
      await fixture.whenStable();
    },
    alert: () => el.querySelector('form > .alert'),
  };
}

describe('WritePage', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.unstubAllGlobals();
  });

  describe('the form', () => {
    it('greets the user and has one heading, a title, a text area and a counter', async () => {
      const { el } = await render();

      expect(el.querySelectorAll('h1')).toHaveLength(1);
      expect(el.querySelector('h1')?.textContent?.trim()).toBe('Escribir');
      expect(el.querySelector('.write__welcome')?.textContent?.trim()).toBe('¡Hola, Marta!');
      expect(el.querySelector('input[type="text"]')).not.toBeNull();
      expect(el.querySelector('textarea')?.getAttribute('aria-required')).toBe('true');
      expect(el.querySelector('.counter')?.textContent?.trim()).toBe('0 / 3000');
    });

    it('tells the user the text goes to an AI provider', async () => {
      const { el } = await render();

      expect(el.querySelector('.write__privacy')?.textContent).toContain('proveedor de IA');
    });

    it('does not call the API and shows the error when the text is empty', async () => {
      const { el, submit, backend } = await render();

      await submit();

      backend.expectNone(`${API}/texts/analyze`);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('obligatorio');
    });

    it('asks for at least 20 characters, without calling the API', async () => {
      const { el, type, submit, backend } = await render();
      type('Too short.');

      await submit();

      backend.expectNone(`${API}/texts/analyze`);
      expect(el.textContent).toContain('Debe tener al menos 20 caracteres.');
    });

    it('asks for at most 3000 characters, counting like the API', async () => {
      const { el, type, submit, backend, settle } = await render();
      type('x'.repeat(3001));
      await settle();

      await submit();

      backend.expectNone(`${API}/texts/analyze`);
      expect(el.textContent).toContain('Puede tener como máximo 3000 caracteres.');
      expect(el.querySelector('.counter')?.classList).toContain('counter--over');
    });

    it('counts an emoji as one character, so a text of emoji within the limit is accepted', async () => {
      const { type, submit, backend, settle } = await render();
      type('😀'.repeat(25)); // 25 code points, 50 UTF-16 units

      await submit();
      await settle();

      backend.expectOne(`${API}/texts/analyze`).flush(RESULT);
    });

    it('rejects a title over 200 characters', async () => {
      const { el, type, submit, backend } = await render();
      type('t'.repeat(201), 'input');
      type(TEXT);

      await submit();

      backend.expectNone(`${API}/texts/analyze`);
      expect(el.textContent).toContain('Puede tener como máximo 200 caracteres.');
    });
  });

  describe('analysing', () => {
    it('sends the text, the trimmed title and the interface language', async () => {
      const { type, submit, backend } = await render('ca');
      type('  My weekend ', 'input');
      type(TEXT);

      await submit();
      const request = backend.expectOne(`${API}/texts/analyze`);

      expect(request.request.body).toEqual({
        text: TEXT,
        title: 'My weekend',
        ui_language: 'ca',
      });
      request.flush({ ...RESULT, ui_language: 'ca' });
    });

    it('shows a busy button and a skeleton (announced) while waiting, and sends only one request', async () => {
      const { el, type, submit, backend } = await render();
      type(TEXT);

      await submit();
      await submit(); // impatient second click

      const request = backend.expectOne(`${API}/texts/analyze`); // throws if there were two
      expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
      expect(el.querySelector('.write__loading')?.getAttribute('role')).toBe('status');
      expect(el.querySelector('.write__loading')?.textContent).toContain('Analizando tu texto…');
      expect(el.querySelector('app-skeleton')).not.toBeNull();
      request.flush(RESULT);
    });

    it('shows the annotated result and hides the form when it arrives', async () => {
      const { el, type, submit, backend, settle } = await render();
      type(TEXT);
      await submit();

      backend.expectOne(`${API}/texts/analyze`).flush(RESULT);
      await settle();

      expect(el.querySelector('form')).toBeNull();
      expect(el.querySelector('app-analysis-result')).not.toBeNull();
      expect(el.querySelector('.mark')?.textContent).toBe('go');
      expect(el.textContent).toContain('Nivel estimado: A2');
    });

    it('moves focus to the result so screen-reader users land on it', async () => {
      const { el, type, submit, backend, settle } = await render();
      type(TEXT);
      await submit();

      backend.expectOne(`${API}/texts/analyze`).flush(RESULT);
      await settle();

      await vi.waitFor(() => expect(document.activeElement).toBe(el.querySelector('.result')));
    });
  });

  describe('after the result', () => {
    async function withResult() {
      const page = await render();
      page.type(TEXT);
      await page.submit();
      page.backend.expectOne(`${API}/texts/analyze`).flush(RESULT);
      await page.settle();
      return page;
    }

    it('"Edit text" goes back to the form with the text kept', async () => {
      const { el, settle, area } = await withResult();

      (el.querySelector('.write__bar .btn--secondary') as HTMLButtonElement).click();
      await settle();

      expect(el.querySelector('app-analysis-result')).toBeNull();
      expect(area().value).toBe(TEXT);
    });

    it('"New text" starts from scratch', async () => {
      const { el, settle, area } = await withResult();

      (el.querySelector('.write__bar .btn--ghost') as HTMLButtonElement).click();
      await settle();

      expect(el.querySelector('app-analysis-result')).toBeNull();
      expect(area().value).toBe('');
      expect(el.querySelector('.counter')?.textContent?.trim()).toBe('0 / 3000');
    });

    it('offers both actions in the current language', async () => {
      const { el } = await withResult();

      expect(
        [...el.querySelectorAll('.write__bar .btn')].map((b) => b.textContent?.trim()),
      ).toEqual(['Editar texto', 'Texto nuevo']);
    });
  });

  describe('when the API refuses', () => {
    async function failWith(code: string, status: number, details: Record<string, unknown> = {}) {
      const page = await render();
      page.type(TEXT);
      await page.submit();
      page.backend
        .expectOne(`${API}/texts/analyze`)
        .flush(apiErrorBody(code, details), { status, statusText: 'Error' });
      await page.settle();
      return page;
    }

    it.each([
      ['daily_quota_exceeded', 429, 'Has llegado al límite diario de análisis. Vuelve mañana.'],
      [
        'llm_unavailable',
        503,
        'El servicio de análisis no está disponible ahora mismo. Inténtalo de nuevo en un rato.',
      ],
      [
        'llm_invalid_response',
        502,
        'No hemos podido entender la respuesta del análisis. Inténtalo de nuevo.',
      ],
      [
        'rate_limit_exceeded',
        429,
        'Demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
      ],
    ])(
      'shows %s in Spanish next to the form, keeps the text and can be retried',
      async (code, status, message) => {
        const { alert, area, el } = await failWith(code, status);

        expect(alert()?.textContent?.trim()).toBe(message);
        expect(area().value).toBe(TEXT);
        expect(el.querySelector('button[type="submit"]')?.hasAttribute('aria-busy')).toBe(false);
      },
    );

    it('fills the message with the limit the API reports', async () => {
      const { alert } = await failWith('text_too_long', 422, { min: 20, max: 3000, length: 3100 });

      expect(alert()?.textContent?.trim()).toBe(
        'El texto es demasiado largo (máximo 3000 caracteres).',
      );
    });

    it('shows no toast: the error stays next to the text', async () => {
      await failWith('llm_unavailable', 503);

      expect(TestBed.inject(ToastService).toasts()).toEqual([]);
    });

    it('translates the error again if the language changes', async () => {
      const { alert, settle } = await failWith('daily_quota_exceeded', 429);

      await TestBed.inject(LanguageService).setLanguage('en');
      await settle();

      expect(alert()?.textContent?.trim()).toBe(
        "You've reached the daily analysis limit. Come back tomorrow.",
      );
    });

    it('lets the user try again after an error', async () => {
      const { submit, backend } = await failWith('llm_unavailable', 503);

      await submit();

      backend.expectOne(`${API}/texts/analyze`).flush(RESULT);
    });

    it('clears the previous error when a new attempt starts', async () => {
      const { submit, backend, alert, settle } = await failWith('llm_unavailable', 503);
      expect(alert()).not.toBeNull();

      await submit();

      expect(alert()).toBeNull();
      backend.expectOne(`${API}/texts/analyze`).flush(RESULT);
      await settle();
    });
  });
});
