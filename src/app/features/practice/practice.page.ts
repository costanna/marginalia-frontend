import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { errorTranslationKey } from '../../core/api/error.interceptor';
import { codePointLengthBetween } from '../../shared/forms/code-point-length.validator';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PracticeApi } from './practice.api';
import { Exercise, ExerciseAttemptResult } from './practice.models';

type Status = 'loading' | 'error' | 'empty' | 'active';
type Phase = 'answering' | 'feedback' | 'summary';

// A fill-in-the-blank answer is short (a word or a short phrase); this only stops something absurd.
const MAX_ANSWER_CHARS = 200;

/**
 * One exercise at a time, built from the rules the user fails most, with feedback right after each
 * answer and a score at the end of the batch. A batch is generated once and reused across visits
 * (and across a reload) until every exercise in it has been answered; "Practice more" then asks the
 * API for a fresh one.
 */
@Component({
  selector: 'app-practice-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonComponent,
    EmptyStateComponent,
    FormFieldComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './practice.page.html',
  styleUrl: './practice.page.scss',
})
export class PracticePage {
  private readonly practiceApi = inject(PracticeApi);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

  // A FormGroup, even with a single control, because (ngSubmit) is FormGroupDirective's output:
  // with ReactiveFormsModule alone (no [formGroup]), it never binds to a real 'submit' event.
  protected readonly fillBlankForm = new FormGroup({
    answer: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, codePointLengthBetween(1, MAX_ANSWER_CHARS)],
    }),
  });

  protected readonly status = signal<Status>('loading');
  private readonly batch = signal<Exercise[]>([]);
  protected readonly index = signal(0);
  private readonly attempts = signal<Record<string, ExerciseAttemptResult>>({});
  protected readonly submitting = signal(false);
  private readonly attemptError = signal<ApiError | null>(null);
  /** The multiple_choice option the user picked, so the wrong one (if any) can be marked red
   * without also marking every other unpicked option. */
  protected readonly lastChosen = signal<string | null>(null);

  protected readonly current = computed<Exercise | null>(() => this.batch()[this.index()] ?? null);
  protected readonly currentAttempt = computed<ExerciseAttemptResult | undefined>(() => {
    const exercise = this.current();
    return exercise ? this.attempts()[exercise.id] : undefined;
  });
  protected readonly phase = computed<Phase>(() => {
    if (this.index() >= this.batch().length) {
      return 'summary';
    }
    return this.currentAttempt() ? 'feedback' : 'answering';
  });
  protected readonly total = computed(() => this.batch().length);
  protected readonly correctCount = computed(
    () => Object.values(this.attempts()).filter((a) => a.is_correct).length,
  );

  protected readonly errorKey = computed(() => {
    const error = this.attemptError();
    return error ? errorTranslationKey(error.code) : null;
  });
  protected readonly errorParams = computed(() => this.attemptError()?.details ?? {});

  constructor() {
    this.load();
  }

  protected load(): void {
    this.status.set('loading');
    this.attemptError.set(null);
    this.practiceApi.generate().subscribe({
      next: (exercises) => {
        this.batch.set(exercises);
        this.index.set(0);
        this.attempts.set({});
        this.fillBlankForm.reset({ answer: '' });
        this.lastChosen.set(null);
        this.status.set(exercises.length > 0 ? 'active' : 'empty');
        this.focusHeading();
      },
      error: () => this.status.set('error'),
    });
  }

  protected chooseOption(option: string): void {
    if (this.phase() !== 'answering' || this.submitting()) {
      return;
    }
    this.lastChosen.set(option);
    this.submitAnswer(option);
  }

  protected submitFillBlank(): void {
    if (this.fillBlankForm.invalid) {
      this.fillBlankForm.markAllAsTouched();
      return;
    }
    this.submitAnswer(this.fillBlankForm.controls.answer.value.trim());
  }

  protected continue(): void {
    this.index.update((i) => i + 1);
    this.fillBlankForm.reset({ answer: '' });
    this.attemptError.set(null);
    this.lastChosen.set(null);
    this.focusHeading();
  }

  private submitAnswer(userAnswer: string): void {
    const exercise = this.current();
    if (!exercise || this.phase() !== 'answering' || this.submitting()) {
      return; // a repeated click while the request runs, or after it already answered
    }
    this.attemptError.set(null);
    this.submitting.set(true);
    this.practiceApi
      .attempt(exercise.id, userAnswer)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (result) => this.attempts.update((all) => ({ ...all, [exercise.id]: result })),
        error: (error: ApiError) => this.attemptError.set(error),
      });
  }

  private focusHeading(): void {
    afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
  }
}
