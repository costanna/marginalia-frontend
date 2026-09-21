import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiErrorBody, makeUser } from '../../../../testing/fixtures';
import { provideTestI18n } from '../../../../testing/i18n-testing';
import { errorInterceptor } from '../../../core/api/error.interceptor';
import { LanguageService } from '../../../core/i18n/language.service';
import { RegisterPage } from './register.page';

const API = environment.apiUrl;

async function render(lang = 'ca') {
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [RegisterPage],
    providers: [
      provideTestI18n(),
      provideRouter([]),
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  await TestBed.inject(LanguageService).setLanguage(lang);
  const fixture = TestBed.createComponent(RegisterPage);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const type = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const fillValid = () => {
    type('input[type="text"]', '  Ana  ');
    type('input[type="email"]', 'ana@example.com');
    type('input[type="password"]', 'correct-horse-battery');
  };
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  return {
    fixture,
    el,
    type,
    fillValid,
    submit,
    backend: TestBed.inject(HttpTestingController),
    navigate: vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true),
  };
}

describe('RegisterPage', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('uses the interface language for its texts and the password hint', async () => {
    const { el } = await render('ca');

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Crea el teu compte');
    expect(el.textContent).toContain('Almenys 8 caràcters.');
    expect(el.querySelector('input[type="password"]')?.getAttribute('autocomplete')).toBe(
      'new-password',
    );
  });

  it('validates everything before calling the API', async () => {
    const { fixture, el, submit, backend } = await render();

    submit();
    await fixture.whenStable();

    backend.expectNone(`${API}/auth/register`);
    expect(el.querySelectorAll('[role="alert"]')).toHaveLength(3);
  });

  it('asks for at least 8 characters in the password', async () => {
    const { fixture, el, fillValid, type, submit, backend } = await render('es');
    fillValid();
    type('input[type="password"]', 'short');

    submit();
    await fixture.whenStable();

    backend.expectNone(`${API}/auth/register`);
    expect(el.textContent).toContain('Debe tener al menos 8 caracteres.');
  });

  it('creates the account in the language the visitor is reading, then goes to the app', async () => {
    const { fillValid, submit, backend, navigate } = await render('ca');
    fillValid();

    submit();
    const request = backend.expectOne(`${API}/auth/register`);
    expect(request.request.body).toEqual({
      display_name: 'Ana', // trimmed
      email: 'ana@example.com',
      password: 'correct-horse-battery',
      ui_language: 'ca',
    });
    request.flush({ access_token: 'tok', token_type: 'bearer' });
    backend.expectOne(`${API}/me`).flush(makeUser({ ui_language: 'ca' }));

    expect(navigate).toHaveBeenCalledWith('/write');
  });

  it('tells the visitor when the email is already registered', async () => {
    const { fixture, el, fillValid, submit, backend } = await render('es');
    fillValid();

    submit();
    backend
      .expectOne(`${API}/auth/register`)
      .flush(apiErrorBody('email_taken'), { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(el.querySelector('form > .alert')?.textContent?.trim()).toBe(
      'Ya existe una cuenta con este correo.',
    );
  });

  it('does not send the form twice', async () => {
    const { fillValid, submit, backend } = await render();
    fillValid();

    submit();
    submit();

    backend.expectOne(`${API}/auth/register`); // throws if there were two
  });
});
