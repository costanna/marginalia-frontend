import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { apiErrorBody } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { LanguageService } from '../../core/i18n/language.service';
import { AnalysisResult } from '../write/analysis.models';
import { DemoEditorComponent } from './demo-editor.component';

const API = environment.apiUrl;

// What the anonymous demo returns: nothing was saved, so no id, no title and no date.
const RESULT: AnalysisResult = {
  original_text: 'Yesterday I go to the cinema with friends.',
  corrected_text: 'Yesterday I went to the cinema with friends.',
  cefr_level: 'A2',
  word_count: 8,
  summary: 'Buen comienzo.',
  ui_language: 'es',
  corrections: [
    {
      start: 12,
      end: 14,
      original: 'go',
      suggestion: 'went',
      category: 'grammar',
      rule_tag: 'verb_tense',
      explanation: 'Pasado simple.',
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
    imports: [DemoEditorComponent],
    providers: [
      provideTestI18n(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const fixture = TestBed.createComponent(DemoEditorComponent);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    el,
    area: () => el.querySelector<HTMLTextAreaElement>('textarea')!,
    backend: TestBed.inject(HttpTestingController),
    async submit() {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();
    },
    async settle() {
      fixture.detectChanges();
      await fixture.whenStable();
    },
    type(value: string) {
      const area = el.querySelector<HTMLTextAreaElement>('textarea')!;
      area.value = value;
      area.dispatchEvent(new Event('input'));
    },
  };
}

describe('DemoEditorComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.unstubAllGlobals();
  });

  it('invites the visitor to try it, saying the limit', async () => {
    const { el } = await render('es');

    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Pruébalo ahora');
    expect(el.textContent).toContain('Hasta 3 análisis al día.');
  });

  it.each([
    ['es', 'Yesterday I go to the cinema with my friends.'],
    ['ca', 'Yesterday I go to the cinema with my friends.'],
    ['en', 'Yesterday I go to the cinema with my friends.'],
  ])('fills an English example on request (%s)', async (lang, start) => {
    const { el, area, settle } = await render(lang);

    (el.querySelector('.demo__actions .btn--secondary') as HTMLButtonElement).click();
    await settle();

    expect(area().value.startsWith(start)).toBe(true);
  });

  it('checks the length before calling the API', async () => {
    const { el, submit, backend, type } = await render();
    type('Too short.');

    await submit();

    backend.expectNone(`${API}/demo/analyze`);
    expect(el.textContent).toContain('Debe tener al menos 20 caracteres.');
  });

  it('analyses without an account: no title, the current language, nothing saved', async () => {
    const { submit, backend, type } = await render('ca');
    type('Yesterday I go to the cinema with friends.');

    await submit();
    const request = backend.expectOne(`${API}/demo/analyze`);

    expect(request.request.body).toEqual({
      text: 'Yesterday I go to the cinema with friends.',
      ui_language: 'ca',
    });
    request.flush(RESULT);
  });

  it('shows the annotated result with an invitation to sign up', async () => {
    const { el, submit, backend, type, settle } = await render();
    type('Yesterday I go to the cinema with friends.');
    await submit();

    backend.expectOne(`${API}/demo/analyze`).flush(RESULT);
    await settle();

    expect(el.querySelector('.mark')?.textContent).toBe('go');
    expect(el.querySelector('.demo__cta p')?.textContent).toContain('Crea una cuenta');
    expect(el.querySelector('.demo__cta a')?.getAttribute('href')).toBe('/register');
  });

  it('keeps the heading order: its own <h2>, then <h3> inside the result', async () => {
    const { el, submit, backend, type, settle } = await render();
    type('Yesterday I go to the cinema with friends.');
    await submit();
    backend.expectOne(`${API}/demo/analyze`).flush(RESULT);
    await settle();

    expect(el.querySelector('h2')?.textContent?.trim()).toBe('Pruébalo ahora');
    expect(
      [...el.querySelectorAll('app-analysis-result [role="heading"]')].map((h) =>
        h.getAttribute('aria-level'),
      ),
    ).toEqual(['3', '3']);
  });

  it('works with corrections that have no id (the demo saves nothing)', async () => {
    const { el, submit, backend, type, settle } = await render();
    type('Yesterday I go to the cinema with friends.');
    await submit();
    backend.expectOne(`${API}/demo/analyze`).flush(RESULT);
    await settle();

    (el.querySelector('.panel .apply') as HTMLButtonElement).click();
    await settle();

    expect(el.querySelector('.mark')?.textContent).toBe('went');
  });

  it('goes back to the box to try another text', async () => {
    const { el, submit, backend, type, settle, area } = await render();
    type('Yesterday I go to the cinema with friends.');
    await submit();
    backend.expectOne(`${API}/demo/analyze`).flush(RESULT);
    await settle();

    (el.querySelector('.demo__cta .btn--secondary') as HTMLButtonElement).click();
    await settle();

    expect(el.querySelector('app-analysis-result')).toBeNull();
    expect(area().value).toBe('Yesterday I go to the cinema with friends.');
  });

  it('explains when the free daily limit is reached, right in the box', async () => {
    const { el, submit, backend, type, settle } = await render('es');
    type('Yesterday I go to the cinema with friends.');
    await submit();

    backend
      .expectOne(`${API}/demo/analyze`)
      .flush(apiErrorBody('daily_quota_exceeded', { limit: 3, period: 'day' }), {
        status: 429,
        statusText: 'Too Many',
      });
    await settle();

    expect(el.querySelector('form > .alert')?.textContent?.trim()).toBe(
      'Has llegado al límite diario de análisis. Vuelve mañana.',
    );
  });

  it('shows a busy button and only sends one request', async () => {
    const { el, submit, backend, type } = await render();
    type('Yesterday I go to the cinema with friends.');

    await submit();
    await submit();

    const request = backend.expectOne(`${API}/demo/analyze`);
    expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    request.flush(RESULT);
  });
});
