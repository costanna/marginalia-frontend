import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';
import { TargetLevel } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { PreferencesService } from '../../core/preferences/preferences.service';
import { THEME_PREFERENCES, ThemePreference, ThemeService } from '../../core/theme/theme.service';
import { ToastService } from '../../core/toast/toast.service';
import { downloadJson } from '../../shared/download/download-json';
import { codePointLengthBetween } from '../../shared/forms/code-point-length.validator';
import { notBlank } from '../../shared/forms/not-blank.validator';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { SettingsApi } from './settings.api';

// Mirrors the API's limit for the display name.
const NAME_MAX = 80;

const SECTIONS = ['profile', 'preferences', 'data', 'account'] as const;
type Section = (typeof SECTIONS)[number];

/**
 * Settings: profile (name, target level), appearance and language, a copy of the user's data, and
 * account deletion. On a phone the sections are stacked; from 1024px a side menu jumps between
 * them. Theme and language are saved to the account as soon as they change; the profile has a
 * save button.
 */
@Component({
  selector: 'app-settings-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    ButtonComponent,
    ConfirmDialogComponent,
    FormFieldComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss',
})
export class SettingsPage {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly language = inject(LanguageService);
  private readonly api = inject(SettingsApi);
  private readonly preferences = inject(PreferencesService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly confirm = viewChild.required(ConfirmDialogComponent);

  protected readonly sections = SECTIONS;
  protected readonly levels: readonly TargetLevel[] = ['A2', 'B1', 'B2', 'C1', 'C2'];
  protected readonly themes = THEME_PREFERENCES;

  protected readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, notBlank, codePointLengthBetween(1, NAME_MAX)],
    }),
    // '' stands for "not set": a <select> cannot hold null.
    targetLevel: new FormControl<TargetLevel | ''>('', { nonNullable: true }),
  });

  protected readonly saving = signal(false);
  protected readonly exporting = signal(false);
  protected readonly deleting = signal(false);

  constructor() {
    // The profile arrives after the page on a cold start: fill the form when it does, but never
    // over something the user has already started typing.
    effect(() => {
      const user = this.auth.user();
      if (user && this.form.pristine) {
        this.form.reset({ displayName: user.display_name, targetLevel: user.target_level ?? '' });
      }
    });
  }

  protected saveProfile(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return; // a second click while the first request runs
    }
    const { displayName, targetLevel } = this.form.getRawValue();
    this.saving.set(true);
    this.api
      .updateProfile({ display_name: displayName.trim(), target_level: targetLevel || null })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (user) => {
          this.auth.updateUser(user);
          this.form.reset({ displayName: user.display_name, targetLevel: user.target_level ?? '' });
          this.toasts.show(this.transloco.translate('settings.profile.saved'), 'success');
        },
        // The error interceptor has already explained why; what was typed stays in the form.
        error: () => undefined,
      });
  }

  protected setTheme(event: Event): void {
    this.preferences.setTheme((event.target as HTMLSelectElement).value as ThemePreference);
  }

  protected setLanguage(event: Event): void {
    void this.preferences.setLanguage((event.target as HTMLSelectElement).value);
  }

  protected exportData(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.api
      .exportData()
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (data) => {
          // The file is named after the day the API produced it, like its own download header.
          downloadJson(
            this.document,
            `marginalia-export-${data.exported_at.slice(0, 10)}.json`,
            data,
          );
          this.toasts.show(this.transloco.translate('settings.data.exported'), 'success');
        },
        // The error interceptor has already explained why (for example, too many exports).
        error: () => undefined,
      });
  }

  protected askToDeleteAccount(): void {
    this.confirm().open();
  }

  protected deleteAccount(): void {
    if (this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.api
      .deleteAccount()
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => {
          this.confirm().close();
          this.auth.logout();
          this.toasts.show(this.transloco.translate('settings.account.deleted'), 'success');
          void this.router.navigateByUrl('/');
        },
        // The error interceptor has already explained why; the account is still there.
        error: () => this.confirm().close(),
      });
  }

  /** Side menu: scroll to a section and move focus to its heading (a "#id" link would be resolved
   * against <base href="/"> and leave the page). */
  protected goTo(section: Section): void {
    const heading = this.document.getElementById(`settings-${section}`);
    if (!heading) {
      return;
    }
    if (typeof heading.scrollIntoView === 'function') {
      const reduce = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
      heading.scrollIntoView({ behavior: reduce?.matches ? 'auto' : 'smooth', block: 'start' });
    }
    heading.focus({ preventScroll: true });
  }
}
