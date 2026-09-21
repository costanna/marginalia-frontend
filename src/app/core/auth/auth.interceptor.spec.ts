import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, TOKEN_STORAGE_KEY } from './auth.service';
import { authInterceptor } from './auth.interceptor';

const API = environment.apiUrl;

function setup(token?: string, currentUrl = '/write') {
  localStorage.clear();
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'url', 'get').mockReturnValue(currentUrl);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  return {
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
    navigate,
  };
}

describe('authInterceptor', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('sends the Bearer token to the API', () => {
    const { http, backend } = setup('abc');

    http.get(`${API}/me`).subscribe();

    expect(backend.expectOne(`${API}/me`).request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('sends nothing when there is no token', () => {
    const { http, backend } = setup();

    http.get(`${API}/health`).subscribe();

    expect(backend.expectOne(`${API}/health`).request.headers.has('Authorization')).toBe(false);
  });

  it('never leaks the token to other origins or to the translation files', () => {
    const { http, backend } = setup('abc');

    http.get('assets/i18n/es.json').subscribe();
    http.get('https://evil.example.com/steal').subscribe();

    expect(backend.expectOne('assets/i18n/es.json').request.headers.has('Authorization')).toBe(
      false,
    );
    expect(
      backend.expectOne('https://evil.example.com/steal').request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('ends the session and goes to login, remembering the page, when the token is rejected', () => {
    const { http, backend, auth, navigate } = setup('expired', '/history');

    http.get(`${API}/texts`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/texts`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/history' } });
  });

  it('ends the session without redirecting when the visitor is on a public page', () => {
    const { http, backend, auth, navigate } = setup('expired', '/');

    http.get(`${API}/me`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not treat a 401 without a token (wrong password) as a dead session', () => {
    const { http, backend, navigate } = setup(undefined, '/login');

    http.post(`${API}/auth/login`, {}).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/auth/login`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the session on other errors', () => {
    const { http, backend, auth } = setup('abc');

    http.get(`${API}/texts`).subscribe({ error: () => undefined });
    backend.expectOne(`${API}/texts`).flush({}, { status: 500, statusText: 'Server Error' });

    expect(auth.isAuthenticated()).toBe(true);
  });

  it('still delivers the error to the caller', () => {
    const { http, backend } = setup('abc');
    let status = 0;

    http.get(`${API}/texts`).subscribe({ error: (error) => (status = error.status) });
    backend.expectOne(`${API}/texts`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });
});
