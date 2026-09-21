import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { apiErrorBody, makeUser } from '../../../testing/fixtures';
import { SILENT_ERRORS } from '../api/api.service';
import { User } from './auth.models';
import { AuthService, TOKEN_STORAGE_KEY } from './auth.service';

const API = environment.apiUrl;

function setup(storedToken?: string) {
  localStorage.clear();
  if (storedToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, storedToken);
  }
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return { auth: TestBed.inject(AuthService), backend: TestBed.inject(HttpTestingController) };
}

describe('AuthService', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
  });

  it('starts signed out when nothing is stored', () => {
    const { auth } = setup();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(auth.user()).toBeNull();
  });

  describe('login', () => {
    it('stores the token, loads the profile and announces the session', () => {
      const { auth, backend } = setup();
      const started: User[] = [];
      auth.sessionStarted$.subscribe((user) => started.push(user));
      let result: User | undefined;

      auth.login('ana@example.com', 'secret-password').subscribe((user) => (result = user));
      const login = backend.expectOne(`${API}/auth/login`);
      expect(login.request.body).toEqual({ email: 'ana@example.com', password: 'secret-password' });
      login.flush({ access_token: 'tok', token_type: 'bearer' });
      backend.expectOne(`${API}/me`).flush(makeUser());

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.token()).toBe('tok');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('tok');
      expect(auth.user()?.display_name).toBe('Ana');
      expect(result?.email).toBe('ana@example.com');
      expect(started).toHaveLength(1);
    });

    it('lets the form show wrong credentials itself (no toast)', () => {
      const { auth, backend } = setup();

      auth.login('a@b.co', 'wrong').subscribe({ error: () => undefined });
      const request = backend.expectOne(`${API}/auth/login`);
      request.flush(apiErrorBody('invalid_credentials'), { status: 401, statusText: 'No' });

      expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
      expect(auth.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  describe('register', () => {
    it('creates the account and starts the session', () => {
      const { auth, backend } = setup();
      const payload = {
        email: 'ana@example.com',
        password: 'secret-password',
        display_name: 'Ana',
        ui_language: 'ca' as const,
      };

      auth.register(payload).subscribe();
      const request = backend.expectOne(`${API}/auth/register`);
      expect(request.request.body).toEqual(payload);
      request.flush({ access_token: 'new-tok', token_type: 'bearer' });
      backend.expectOne(`${API}/me`).flush(makeUser({ ui_language: 'ca' }));

      expect(auth.token()).toBe('new-tok');
      expect(auth.user()?.ui_language).toBe('ca');
    });
  });

  describe('logout', () => {
    it('forgets the token and the profile', () => {
      const { auth } = setup('tok');
      auth.updateUser(makeUser());

      auth.logout();

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.user()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  describe('restoreSession', () => {
    it('does nothing without a stored token', () => {
      const { auth, backend } = setup();
      let result: User | null | undefined;

      auth.restoreSession().subscribe((user) => (result = user));

      backend.expectNone(`${API}/me`);
      expect(result).toBeNull();
    });

    it('loads the profile of a stored token and announces the session', () => {
      const { auth, backend } = setup('tok');
      const started: User[] = [];
      auth.sessionStarted$.subscribe((user) => started.push(user));

      auth.restoreSession().subscribe();
      backend.expectOne(`${API}/me`).flush(makeUser({ display_name: 'Bea' }));

      expect(auth.user()?.display_name).toBe('Bea');
      expect(started).toHaveLength(1);
    });

    it('keeps the token when the server is unreachable (it may just be waking up)', () => {
      const { auth, backend } = setup('tok');
      let result: User | null | undefined;

      auth.restoreSession().subscribe((user) => (result = user));
      backend.expectOne(`${API}/me`).error(new ProgressEvent('error'));

      expect(result).toBeNull();
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  it('updateUser replaces the cached profile without announcing a new session', () => {
    const { auth } = setup('tok');
    const started: User[] = [];
    auth.sessionStarted$.subscribe((user) => started.push(user));

    auth.updateUser(makeUser({ theme_preference: 'dark' }));

    expect(auth.user()?.theme_preference).toBe('dark');
    expect(started).toHaveLength(0);
  });

  it('works when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
    const backend = TestBed.inject(HttpTestingController);

    auth.login('a@b.co', 'password1').subscribe();
    backend.expectOne(`${API}/auth/login`).flush({ access_token: 'tok', token_type: 'bearer' });
    backend.expectOne(`${API}/me`).flush(makeUser());

    expect(auth.isAuthenticated()).toBe(true); // lasts until reload
  });
});
