import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { errorTranslationKey } from '../../core/api/error.interceptor';
import { LanguageService } from '../../core/i18n/language.service';
import { codePointLengthBetween } from '../../shared/forms/code-point-length.validator';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { AnalysisResult, MAX_TEXT_CHARS, MIN_TEXT_CHARS } from '../write/analysis.models';
import { AnalysisResultComponent } from '../write/analysis-result.component';
import { TextsApi } from '../write/texts.api';

/**
 * Try-it-now box for the landing page: same analysis, no account, nothing saved (3 a day per IP).
 * It lets a visitor see the product working in seconds.
 */
@Component({
  selector: 'app-demo-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    FormFieldComponent,
    ButtonComponent,
    SkeletonComponent,
    AnalysisResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo-editor.component.html',
  styleUrl: './demo-editor.component.scss',
})
export class DemoEditorComponent {
  private readonly textsApi = inject(TextsApi);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  protected readonly maxChars = MAX_TEXT_CHARS;
  protected readonly form = new FormGroup({
    text: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, codePointLengthBetween(MIN_TEXT_CHARS, MAX_TEXT_CHARS)],
    }),
  });

  protected readonly loading = signal(false);
  protected readonly result = signal<AnalysisResult | null>(null);
  private readonly error = signal<ApiError | null>(null);
  protected readonly errorKey = computed(() => {
    const error = this.error();
    return error ? errorTranslationKey(error.code) : null;
  });
  protected readonly errorParams = computed(() => this.error()?.details ?? {});

  /** Fills the box with a short text that has a few typical mistakes. */
  protected useSample(): void {
    this.form.controls.text.setValue(this.transloco.translate('home.demo.sample'));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.loading()) {
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.textsApi
      .analyzeDemo({ text: this.form.getRawValue().text, ui_language: this.language.language() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: ApiError) => this.error.set(error),
      });
  }

  protected tryAgain(): void {
    this.result.set(null);
  }
}
