import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { makeUser } from '../../../testing/fixtures';
import { provideTestI18n } from '../../../testing/i18n-testing';
import { AuthService, TOKEN_STORAGE_KEY } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { ThemeService } from '../theme/theme.service';
import { PreferencesService } from './preferences.service';

const API = environment.apiUrl;

async function setup(signedIn: boolean) {
  localStorage.clear();
  if (signedIn) {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'tok');
  }
  TestBed.configureTestingModule({
    providers: [provideTestI18n(), provideHttpClient(), provideHttpClientTesting()],
  });
  await TestBed.inject(LanguageService).setLanguage('es');
  return {
    preferences: TestBed.inject(PreferencesService),
    theme: TestBed.inject(ThemeService),
    language: TestBed.inject(LanguageService),
    auth: TestBed.inject(AuthService),
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('PreferencesService', () => {
  beforeEach(() => document.documentElement.removeAttribute('data-theme'));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('anonymous visitor', () => {
    it('changes the theme locally without calling the API', async () => {
      const { preferences, theme, backend } = await setup(false);

      preferences.setTheme('dark');
      preferences.toggleTheme();

      expect(theme.preference()).toBe('light');
      backend.expectNone(`${API}/me`);
    });

    it('changes the language locally without calling the API', async () => {
      const { preferences, language, backend } = await setup(false);

      await preferences.setLanguage('ca');

      expect(language.language()).toBe('ca');
      backend.expectNone(`${API}/me`);
    });
  });

  describe('signed-in user', () => {
    it('saves a theme change to the profile', async () => {
      const { preferences, auth, backend } = await setup(true);

      preferences.setTheme('dark');
      const request = backend.expectOne(`${API}/me`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ theme_preference: 'dark' });
      request.flush(makeUser({ theme_preference: 'dark' }));

      expect(auth.user()?.theme_preference).toBe('dark');
    });

    it('saves the toggled theme (the one actually shown after the toggle)', async () => {
      const { preferences, backend } = await setup(true);

      preferences.toggleTheme();

      expect(backend.expectOne(`${API}/me`).request.body).toEqual({ theme_preference: 'dark' });
    });

    it('saves a language change to the profile', async () => {
      const { preferences, backend } = await setup(true);

      await preferences.setLanguage('ca');

      expect(backend.expectOne(`${API}/me`).request.body).toEqual({ ui_language: 'ca' });
    });

    it('does not save an unsupported language', async () => {
      const { preferences, backend, language } = await setup(true);

      await preferences.setLanguage('fr');

      expect(language.language()).toBe('es');
      // The current (unchanged) language is what gets saved, never the invalid one.
      expect(backend.expectOne(`${API}/me`).request.body).toEqual({ ui_language: 'es' });
    });

    it('ignores a failed save: the local change stays and nothing interrupts the user', async () => {
      const { preferences, theme, backend } = await setup(true);

      preferences.setTheme('dark');
      backend.expectOne(`${API}/me`).error(new ProgressEvent('error'));

      expect(theme.preference()).toBe('dark');
    });

    it('does not bounce the saved value back and forth (no echo loop)', async () => {
      const { preferences, theme, backend } = await setup(true);

      preferences.setTheme('dark');
      backend.expectOne(`${API}/me`).flush(makeUser({ theme_preference: 'dark' }));

      expect(theme.preference()).toBe('dark');
      backend.expectNone(`${API}/me`); // the response did not trigger another save
    });
  });

  describe('starting a session', () => {
    it("applies the profile's saved theme and language", async () => {
      const { preferences, theme, language, auth, backend } = await setup(true);
      expect(preferences).toBeTruthy(); // instantiating it subscribes to session starts

      auth.restoreSession().subscribe();
      backend
        .expectOne(`${API}/me`)
        .flush(makeUser({ theme_preference: 'dark', ui_language: 'ca' }));
      await vi.waitFor(() => expect(language.language()).toBe('ca'));

      expect(theme.preference()).toBe('dark');
    });
  });
});
