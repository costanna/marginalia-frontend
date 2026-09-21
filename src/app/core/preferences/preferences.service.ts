import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../api/api.service';
import { User } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { LanguageService } from '../i18n/language.service';
import { isSupportedLang } from '../i18n/supported-languages';
import { ThemePreference, ThemeService } from '../theme/theme.service';

/**
 * Keeps theme and language in sync between this browser and the user's profile.
 *
 * - When a session STARTS, the profile's saved theme and language are applied here.
 * - When a signed-in user CHANGES one, it is also saved to the profile.
 *
 * Saving is triggered by explicit user actions, not by watching signals: the language loads
 * asynchronously, and watching it would let the not-yet-switched value overwrite the profile.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly language = inject(LanguageService);

  constructor() {
    this.auth.sessionStarted$
      .pipe(takeUntilDestroyed())
      .subscribe((user) => this.applyFromProfile(user));
  }

  setTheme(preference: ThemePreference): void {
    this.theme.setPreference(preference);
    this.saveToProfile({ theme_preference: preference });
  }

  toggleTheme(): void {
    this.theme.toggle();
    this.saveToProfile({ theme_preference: this.theme.preference() });
  }

  async setLanguage(lang: string): Promise<void> {
    await this.language.setLanguage(lang);
    this.saveToProfile({ ui_language: this.language.language() });
  }

  private applyFromProfile(user: User): void {
    this.theme.setPreference(user.theme_preference);
    if (isSupportedLang(user.ui_language)) {
      void this.language.setLanguage(user.ui_language);
    }
  }

  private saveToProfile(changes: Partial<Pick<User, 'theme_preference' | 'ui_language'>>): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    // Silent: a failed preference save must not interrupt the user with an error.
    this.api.patch<User>('/me', changes, { silent: true }).subscribe({
      next: (user) => this.auth.updateUser(user),
      error: () => undefined,
    });
  }
}
