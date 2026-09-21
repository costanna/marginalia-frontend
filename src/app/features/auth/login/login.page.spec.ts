import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorBody, makeUser } from '../../../../testing/fixtures';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/toast/toast.service';
import { LoginPage } from './login.page';

const API = environment.apiUrl;

async function render(returnUrl: string | null = null) {
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      provideTestI18n(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
        },
      },
    ],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  const fixture = TestBed.createComponent(LoginPage);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const input = (type: string) => el.querySelector<HTMLInputElement>(`input[type="${type}"]`)!;
  const fill = (type: string, value: string) => {
    input(type).value = value;
    input(type).dispatchEvent(new Event('input'));
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return {
    fixture,
    el,
    fill,
    submit,
    backend: TestBed.inject(HttpTestingController),
    navigate: vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true),
    alert: () => el.querySelector('form > .alert'),
  };
}

function loginSucceeds(backend: HttpTestingController) {
  backend.expectOne(`${API}/auth/login`).flush({ access_token: 'tok', token_type: 'bearer' });
  backend.expectOne(`${API}/me`).flush(makeUser());
}

describe('LoginPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('has one heading and translated, autofill-friendly fields', async () => {
    const { el } = await render();

    expect(el.querySelectorAll('h1')).toHaveLength(1);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Iniciar sesión');
    expect(el.querySelector('input[type="email"]')?.getAttribute('autocomplete')).toBe('email');
    expect(el.querySelector('input[type="password"]')?.getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });

  it('does not call the API and shows the errors when the form is invalid', async () => {
    const { fixture, el, submit, backend } = await render();

    submit();
    await fixture.whenStable();

    backend.expectNone(`${API}/auth/login`);
    expect(el.querySelectorAll('[role="alert"]')).toHaveLength(2);
    expect(el.textContent).toContain('Este campo es obligatorio.');
  });

  it('rejects a malformed email before calling the API', async () => {
    const { fixture, el, fill, submit, backend } = await render();

    fill('email', 'not-an-email');
    fill('password', 'whatever1');
    submit();
    await fixture.whenStable();

    backend.expectNone(`${API}/auth/login`);
    expect(el.textContent).toContain('Escribe un correo electrónico válido.');
  });

  it('logs in and goes to the writing page', async () => {
    const { fill, submit, backend, navigate } = await render();

    fill('email', '  ana@example.com ');
    fill('password', 'correct-horse-battery');
    submit();
    const request = backend.expectOne(`${API}/auth/login`);
    expect(request.request.body).toEqual({
      email: 'ana@example.com', // trimmed
      password: 'correct-horse-battery',
    });
    request.flush({ access_token: 'tok', token_type: 'bearer' });
    backend.expectOne(`${API}/me`).flush(makeUser());

    expect(navigate).toHaveBeenCalledWith('/write');
  });

  it('goes back to the page the visitor wanted', async () => {
    const { fill, submit, backend, navigate } = await render('/history?page=2');

    fill('email', 'ana@example.com');
    fill('password', 'correct-horse-battery');
    submit();
    loginSucceeds(backend);

    expect(navigate).toHaveBeenCalledWith('/history?page=2');
  });

  it('ignores a returnUrl that points to another site', async () => {
    const { fill, submit, backend, navigate } = await render('//evil.example.com');

    fill('email', 'ana@example.com');
    fill('password', 'correct-horse-battery');
    submit();
    loginSucceeds(backend);

    expect(navigate).toHaveBeenCalledWith('/write');
  });

  it('shows wrong credentials in the form itself, translated, without a toast', async () => {
    const { fixture, fill, submit, backend, alert } = await render();
    fill('email', 'ana@example.com');
    fill('password', 'wrong-password');

    submit();
    backend
      .expectOne(`${API}/auth/login`)
      .flush(apiErrorBody('invalid_credentials'), { status: 401, statusText: 'No' });
    await fixture.whenStable();

    expect(alert()?.textContent?.trim()).toBe('El correo o la contraseña no son correctos.');
    expect(TestBed.inject(ToastService).toasts()).toEqual([]);
  });

  it('shows the error again in another language when the language changes', async () => {
    const { fixture, fill, submit, backend, alert } = await render();
    fill('email', 'ana@example.com');
    fill('password', 'wrong-password');
    submit();
    backend
      .expectOne(`${API}/auth/login`)
      .flush(apiErrorBody('invalid_credentials'), { status: 401, statusText: 'No' });
    await fixture.whenStable();

    await TestBed.inject(LanguageService).setLanguage('en');
    fixture.detectChanges();

    expect(alert()?.textContent?.trim()).toBe('The email or the password is incorrect.');
  });

  it('shows a busy button while waiting and ignores a second submit', async () => {
    const { fixture, el, fill, submit, backend } = await render();
    fill('email', 'ana@example.com');
    fill('password', 'correct-horse-battery');

    submit();
    submit(); // impatient double click

    const request = backend.expectOne(`${API}/auth/login`); // throws if there were TWO requests
    expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');
    request.flush(apiErrorBody('invalid_credentials'), { status: 401, statusText: 'No' });
    await fixture.whenStable();
  });

  it('links to sign-up', async () => {
    const { el } = await render();

    expect(el.querySelector('a[href="/register"]')?.textContent?.trim()).toBe('Crea una');
  });
});
