import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../environments/environment';
import { apiErrorBody } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { errorInterceptor } from '../../core/api/error.interceptor';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/toast/toast.service';
import { Exercise, ExerciseAttemptResult } from './practice.models';
import { PracticePage } from './practice.page';

const API = environment.apiUrl;

@Component({ template: '' })
class Stub {}

const MC: Exercise = {
  id: 'mc-1',
  rule_tag: 'articles',
  type: 'multiple_choice',
  prompt: 'She is ___ engineer.',
  options: ['a', 'an', 'the'],
  status: 'pending',
  created_at: '2026-09-22T10:00:00Z',
};

const FB: Exercise = {
  id: 'fb-1',
  rule_tag: 'verb_tense',
  type: 'fill_blank',
  prompt: 'Yesterday I ___ home.',
  options: null,
  status: 'pending',
  created_at: '2026-09-22T10:01:00Z',
};

async function render(lang = 'es') {
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
        { path: 'practice', component: PracticePage },
        { path: 'write', component: Stub },
      ]),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const backend = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/practice', PracticePage);
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
    /** Answer the pending POST /exercises/generate. */
    generate: async (batch: Exercise[] | 'error' = []) => {
      const request = backend.expectOne(`${API}/exercises/generate`);
      if (batch === 'error') {
        request.flush(apiErrorBody('unknown'), { status: 500, statusText: 'Server Error' });
      } else {
        request.flush(batch);
      }
      await settle();
    },
    /** Answer the pending POST /exercises/{id}/attempt. */
    attempt: async (exerciseId: string, result: ExerciseAttemptResult | 'error', status = 500) => {
      const request = backend.expectOne(`${API}/exercises/${exerciseId}/attempt`);
      if (result === 'error') {
        request.flush(apiErrorBody('unknown'), { status, statusText: 'Error' });
      } else {
        request.flush(result);
      }
      await settle();
    },
  };
}

describe('PracticePage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('loading, error and empty states', () => {
    it('shows the loading state until the batch arrives', async () => {
      const { q, generate } = await render();

      expect(q('[role="status"]')?.textContent).toContain('Preparando tus ejercicios');
      expect(q('app-skeleton')).not.toBeNull();

      await generate([MC]);

      expect(q('[role="status"].practice__state')).toBeNull();
    });

    it('shows an error and can retry, without a toast', async () => {
      const { q, generate, toasts } = await render();

      await generate('error');

      expect(q('[role="alert"]')?.textContent).toContain('No hemos podido cargar tus ejercicios');
      expect(toasts.toasts()).toEqual([]);

      q<HTMLButtonElement>('app-button button')!.click();
      await generate([MC]);

      expect(q('[role="alert"]')).toBeNull();
      expect(q('.exercise__prompt')?.textContent).toBe(MC.prompt);
    });

    it('invites the user to write their first text when there is nothing to practise', async () => {
      const { q, generate } = await render();

      await generate([]);

      expect(q('.empty__title')?.textContent).toContain('Todavía no tienes ejercicios');
      expect(q<HTMLAnchorElement>('.empty a')?.getAttribute('href')).toBe('/write');
    });
  });

  describe('a multiple-choice exercise', () => {
    it('shows the rule, the prompt and the progress', async () => {
      const { q, generate } = await render();
      await generate([MC, FB]);

      expect(q('.chip')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Regla: Artículos');
      expect(q('.exercise__prompt')?.textContent).toBe(MC.prompt);
      expect(q('.practice__progress')?.textContent?.trim()).toBe('Ejercicio 1 de 2');
      expect(q('.practice__progress')?.getAttribute('aria-live')).toBe('polite');
    });

    it('renders one full-width button per option', async () => {
      const { qa, generate } = await render();
      await generate([MC]);

      const options = qa<HTMLButtonElement>('.option');
      expect(options.map((b) => b.textContent?.trim())).toEqual(['a', 'an', 'the']);
      expect(options.every((b) => b.type === 'button')).toBe(true);
    });

    it('submits the chosen option and shows correct feedback', async () => {
      const { qa, q, generate, settle } = await render();
      await generate([MC]);

      qa<HTMLButtonElement>('.option')[1].click(); // "an"

      const req = TestBed.inject(HttpTestingController).expectOne(`${API}/exercises/mc-1/attempt`);
      expect(req.request.body).toEqual({ user_answer: 'an' });
      req.flush({
        is_correct: true,
        correct_answer: 'an',
        explanation: "Before a vowel, use 'an'.",
      });
      await settle();

      expect(q('.feedback__verdict')?.textContent?.trim()).toBe('¡Correcto!');
      expect(q('.feedback__explanation')?.textContent?.trim()).toBe("Before a vowel, use 'an'.");
      expect(q('.feedback__answer')).toBeNull(); // only shown when wrong
    });

    it('marks the chosen wrong option, the real answer, and disables the rest', async () => {
      const { qa, q, generate, attempt } = await render();
      await generate([MC]);
      qa<HTMLButtonElement>('.option')[0].click(); // "a", wrong

      await attempt('mc-1', { is_correct: false, correct_answer: 'an', explanation: 'x' });

      const options = qa<HTMLButtonElement>('.option');
      expect(options[0].classList).toContain('option--wrong');
      expect(options[1].classList).toContain('option--correct'); // "an"
      expect(options[2].classList).not.toContain('option--wrong');
      expect(options.every((b) => b.disabled)).toBe(true);
      expect(q('.feedback__verdict')?.textContent?.trim()).toBe('No es correcto.');
      expect(q('.feedback__answer')?.textContent).toContain('an');
    });

    it('ignores a second click once it is already answered', async () => {
      const { qa, generate, attempt } = await render();
      await generate([MC]);
      qa<HTMLButtonElement>('.option')[1].click();
      await attempt('mc-1', { is_correct: true, correct_answer: 'an', explanation: 'x' });

      qa<HTMLButtonElement>('.option')[0].click(); // no second request: expectOne below proves it

      TestBed.inject(HttpTestingController).verify();
    });
  });

  describe('a fill-in-the-blank exercise', () => {
    it('shows a labelled input and a check button, no options', async () => {
      const { q, generate } = await render();
      await generate([FB]);

      expect(q('input')).not.toBeNull();
      expect(q('.option')).toBeNull();
      expect(q('label')?.textContent).toBe('Tu respuesta');
      expect(q('app-button button')?.textContent?.trim()).toBe('Comprobar');
    });

    it('does not submit an empty answer', async () => {
      const { q, generate, settle } = await render();
      await generate([FB]);

      q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await settle();

      TestBed.inject(HttpTestingController).verify(); // nothing was sent
      expect(q('.error')?.textContent).toContain('obligatorio');
    });

    it('trims and submits the typed answer, and shows the correct feedback', async () => {
      const { q, generate, settle } = await render();
      await generate([FB]);
      const input = q<HTMLInputElement>('input')!;
      input.value = '  went  ';
      input.dispatchEvent(new Event('input'));
      q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await settle();

      const req = TestBed.inject(HttpTestingController).expectOne(`${API}/exercises/fb-1/attempt`);
      expect(req.request.body).toEqual({ user_answer: 'went' });
      req.flush({ is_correct: true, correct_answer: 'went', explanation: 'Past simple.' });
      await settle();

      expect(q('.feedback__verdict')?.textContent?.trim()).toBe('¡Correcto!');
    });

    it('ignores a second submit while the first attempt is still in flight', async () => {
      const { q, generate, settle } = await render();
      await generate([FB]);
      const input = q<HTMLInputElement>('input')!;
      input.value = 'went';
      input.dispatchEvent(new Event('input'));
      const form = q<HTMLFormElement>('form')!;

      form.dispatchEvent(new Event('submit'));
      form.dispatchEvent(new Event('submit')); // ignored: a request is already running
      await settle();

      // expectOne throws if more than one request matches, proving only the first was sent.
      const req = TestBed.inject(HttpTestingController).expectOne(`${API}/exercises/fb-1/attempt`);
      req.flush({ is_correct: true, correct_answer: 'went', explanation: 'x' });
    });

    it('shows an inline error and keeps the input if the API refuses', async () => {
      const { q, generate, attempt, toasts } = await render();
      await generate([FB]);
      const input = q<HTMLInputElement>('input')!;
      input.value = 'went';
      input.dispatchEvent(new Event('input'));
      q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

      await attempt('fb-1', 'error');

      expect(q('.alert.alert--error')).not.toBeNull();
      expect(toasts.toasts()).toEqual([]); // shown inline, not as a toast
      expect(input.value).toBe('went');
    });
  });

  describe('a full session', () => {
    it('moves to the next exercise on Continue, and to the summary after the last one', async () => {
      const { q, qa, generate, attempt, settle } = await render();
      await generate([MC, FB]);
      qa<HTMLButtonElement>('.option')[1].click();
      await attempt('mc-1', { is_correct: true, correct_answer: 'an', explanation: 'x' });

      q<HTMLButtonElement>('.feedback app-button button')!.click();
      await settle();

      expect(q('.practice__progress')?.textContent?.trim()).toBe('Ejercicio 2 de 2');
      expect(q('input')).not.toBeNull(); // the fill_blank exercise now

      const input = q<HTMLInputElement>('input')!;
      input.value = 'went';
      input.dispatchEvent(new Event('input'));
      q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
      await attempt('fb-1', { is_correct: false, correct_answer: 'went', explanation: 'x' });

      q<HTMLButtonElement>('.feedback app-button button')!.click();
      await settle();

      expect(q('.session__title')?.textContent).toContain('Resumen de la sesión');
      expect(q('.session__score')?.textContent?.trim()).toBe('Has acertado 1 de 2.');
    });

    it('asks for a fresh batch from "practice more", and links back to writing', async () => {
      const { q, qa, generate, attempt, settle } = await render();
      await generate([MC]);
      qa<HTMLButtonElement>('.option')[1].click();
      await attempt('mc-1', { is_correct: true, correct_answer: 'an', explanation: 'x' });
      q<HTMLButtonElement>('.feedback app-button button')!.click();
      await settle();

      expect(q<HTMLAnchorElement>('.session a')?.getAttribute('href')).toBe('/write');

      q<HTMLButtonElement>('.session__actions app-button button')!.click();
      await generate([FB]);

      expect(q('.exercise__prompt')?.textContent).toBe(FB.prompt);
    });
  });

  describe('accessibility and focus', () => {
    it('moves focus to the exercise prompt once a batch loads', async () => {
      const { q, generate } = await render();
      await generate([MC]);

      expect(document.activeElement).toBe(q('.exercise__prompt'));
    });

    it('moves focus to the next prompt after Continue', async () => {
      const { q, qa, generate, attempt, settle } = await render();
      await generate([MC, FB]);
      qa<HTMLButtonElement>('.option')[1].click();
      await attempt('mc-1', { is_correct: true, correct_answer: 'an', explanation: 'x' });

      q<HTMLButtonElement>('.feedback app-button button')!.click();
      await settle();

      expect(document.activeElement).toBe(q('.exercise__prompt'));
    });

    it('announces feedback through a status region', async () => {
      const { qa, q, generate, attempt } = await render();
      await generate([MC]);
      qa<HTMLButtonElement>('.option')[1].click();

      await attempt('mc-1', { is_correct: true, correct_answer: 'an', explanation: 'x' });

      expect(q('.feedback')?.getAttribute('role')).toBe('status');
    });
  });
});
