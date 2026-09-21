import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs';
import { ApiError } from '../../../core/api/api-error';
import { errorTranslationKey } from '../../../core/api/error.interceptor';
import { AuthService } from '../../../core/auth/auth.service';
import { DEFAULT_RETURN_URL } from '../../../core/auth/return-url';
import { LanguageService } from '../../../core/i18n/language.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field/form-field.component';

// Mirrors the API's limits (display name up to 80 characters; password 8 to 128).
const NAME_MAX = 80;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoPipe, FormFieldComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
  styleUrl: '../auth-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  protected readonly form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(NAME_MAX)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(PASSWORD_MIN),
        Validators.maxLength(PASSWORD_MAX),
      ],
    }),
  });

  protected readonly submitting = signal(false);
  private readonly error = signal<ApiError | null>(null);
  protected readonly errorKey = computed(() => {
    const error = this.error();
    return error ? errorTranslationKey(error.code) : null;
  });
  protected readonly errorParams = computed(() => this.error()?.details ?? {});

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) {
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    const { displayName, email, password } = this.form.getRawValue();
    this.auth
      .register({
        display_name: displayName.trim(),
        email: email.trim(),
        password,
        // The new account starts in the language the visitor is already reading.
        ui_language: this.language.language(),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl(DEFAULT_RETURN_URL),
        error: (error: ApiError) => this.error.set(error),
      });
  }
}
