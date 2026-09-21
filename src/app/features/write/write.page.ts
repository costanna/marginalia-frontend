import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { errorTranslationKey } from '../../core/api/error.interceptor';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { codePointLengthBetween } from '../../shared/forms/code-point-length.validator';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { AnalysisResult, MAX_TEXT_CHARS, MAX_TITLE_CHARS, MIN_TEXT_CHARS } from './analysis.models';
import { AnalysisResultComponent } from './analysis-result.component';
import { TextsApi } from './texts.api';

type ScreenState = 'editing' | 'loading' | 'result';

/**
 * The writing screen: type an English text, get it analysed, read the annotated result.
 * "Edit text" goes back to the form with the text kept; "New text" starts from scratch.
 */
@Component({
  selector: 'app-write-page',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    FormFieldComponent,
    ButtonComponent,
    SkeletonComponent,
    AnalysisResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './write.page.html',
  styleUrl: './write.page.scss',
})
export class WritePage {
  protected readonly auth = inject(AuthService);
  private readonly textsApi = inject(TextsApi);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly resultView = viewChild(AnalysisResultComponent);

  protected readonly maxChars = MAX_TEXT_CHARS;

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(MAX_TITLE_CHARS)],
    }),
    text: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, codePointLengthBetween(MIN_TEXT_CHARS, MAX_TEXT_CHARS)],
    }),
  });

  protected readonly state = signal<ScreenState>('editing');
  private readonly result = signal<AnalysisResult | null>(null);
  protected readonly shownResult = computed(() =>
    this.state() === 'result' ? this.result() : null,
  );

  // The error is kept as a code and translated in the template, so it follows a language change.
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
    if (this.state() === 'loading') {
      return; // a second click while waiting must not send a second request (or use a second analysis)
    }
    this.error.set(null);
    this.state.set('loading');
    const { title, text } = this.form.getRawValue();
    this.textsApi
      .analyze({ text, title, ui_language: this.language.language() })
      .pipe(finalize(() => this.state() === 'loading' && this.state.set('editing')))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.state.set('result');
          // Move focus to the result once it is on screen, so keyboard and screen-reader users land on it.
          afterNextRender(() => this.resultView()?.focus(), { injector: this.injector });
        },
        error: (error: ApiError) => this.error.set(error),
      });
  }

  /** Back to the form; the text is kept so it can be improved and checked again. */
  protected edit(): void {
    this.state.set('editing');
  }

  protected startNew(): void {
    this.form.reset();
    this.result.set(null);
    this.error.set(null);
    this.state.set('editing');
  }
}
