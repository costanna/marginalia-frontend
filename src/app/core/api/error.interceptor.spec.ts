import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { apiErrorBody } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { LanguageService } from '../i18n/language.service';
import { ToastService } from '../toast/toast.service';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { ApiError } from './api-error';
import { errorInterceptor } from './error.interceptor';

const API = environment.apiUrl;

async function setup(lang = 'es') {
  localStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideTestI18n(),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  return {
    api: TestBed.inject(ApiService),
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    toasts: TestBed.inject(ToastService),
  };
}

function fail(
  backend: HttpTestingController,
  url: string,
  status: number,
  body: object | string,
): void {
  backend.expectOne(`${API}${url}`).flush(body, { status, statusText: 'Error' });
}

describe('errorInterceptor', () => {
  it('turns a failure into an ApiError carrying the stable code', async () => {
    const { api, backend } = await setup();
    let caught: unknown;

    api.get('/x').subscribe({ error: (error) => (caught = error) });
    fail(backend, '/x', 401, apiErrorBody('invalid_credentials'));

    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe('invalid_credentials');
    expect((caught as ApiError).status).toBe(401);
  });

  it('shows a toast translated from the error code, never the server message', async () => {
    const { api, backend, toasts } = await setup('es');

    api.get('/x').subscribe({ error: () => undefined });
    fail(backend, '/x', 401, apiErrorBody('invalid_credentials'));

    const [toast] = toasts.toasts();
    expect(toast.message).toBe('El correo o la contraseña no son correctos.');
    expect(toast.kind).toBe('error');
  });

  it('follows the interface language', async () => {
    const { api, backend, toasts } = await setup('ca');

    api.get('/x').subscribe({ error: () => undefined });
    fail(backend, '/x', 409, apiErrorBody('email_taken'));

    expect(toasts.toasts()[0].message).toBe('Ja existeix un compte amb aquest correu.');
  });

  it('fills the message with the details returned by the API', async () => {
    const { api, backend, toasts } = await setup('es');

    api.get('/x').subscribe({ error: () => undefined });
    fail(backend, '/x', 422, apiErrorBody('text_too_short', { min: 20, max: 3000, length: 5 }));

    expect(toasts.toasts()[0].message).toBe('El texto es demasiado corto (mínimo 20 caracteres).');
  });

  it('reports an unreachable server as a network error', async () => {
    const { api, backend, toasts } = await setup('en');
    let caught: ApiError | undefined;

    api.get('/x').subscribe({ error: (error) => (caught = error) });
    backend.expectOne(`${API}/x`).error(new ProgressEvent('error'));

    expect(caught?.code).toBe('network');
    expect(toasts.toasts()[0].message).toBe(
      "We couldn't connect. Check your connection and try again.",
    );
  });

  it('falls back to a generic message for a code the frontend does not know', async () => {
    const { api, backend, toasts } = await setup('en');

    api.get('/x').subscribe({ error: () => undefined });
    fail(backend, '/x', 400, apiErrorBody('some_future_code'));

    expect(toasts.toasts()[0].message).toBe('Something went wrong. Please try again.');
  });

  it('treats a non-standard error body (for example an HTML gateway page) as unknown', async () => {
    const { api, backend } = await setup();
    let caught: ApiError | undefined;

    api.get('/x').subscribe({ error: (error) => (caught = error) });
    fail(backend, '/x', 502, '<html>Bad gateway</html>');

    expect(caught?.code).toBe('unknown');
    expect(caught?.status).toBe(502);
  });

  it('shows no toast when the caller asked to handle the error itself', async () => {
    const { api, backend, toasts } = await setup();
    let caught: ApiError | undefined;

    api.get('/x', { silent: true }).subscribe({ error: (error) => (caught = error) });
    fail(backend, '/x', 401, apiErrorBody('invalid_credentials'));

    expect(caught?.code).toBe('invalid_credentials'); // still converted...
    expect(toasts.toasts()).toEqual([]); // ...but not announced
  });

  it('leaves errors from other origins alone', async () => {
    const { http, backend, toasts } = await setup();
    let caught: unknown;

    http.get('assets/i18n/es.json').subscribe({ error: (error) => (caught = error) });
    backend
      .expectOne('assets/i18n/es.json')
      .flush('nope', { status: 404, statusText: 'Not found' });

    expect(caught).not.toBeInstanceOf(ApiError);
    expect(toasts.toasts()).toEqual([]);
  });
});
