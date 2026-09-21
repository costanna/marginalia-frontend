import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Observable, catchError, finalize, map, of, startWith, switchMap } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/toast/toast.service';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { AnalysisResult } from '../write/analysis.models';
import { AnalysisResultComponent } from '../write/analysis-result.component';
import { TextsApi } from '../write/texts.api';

type View =
  | { status: 'loading' }
  | { status: 'notFound' }
  | { status: 'error' }
  | { status: 'ready'; text: AnalysisResult };

/**
 * One saved text, shown exactly like the result right after writing it (annotated text,
 * corrections, teacher's note), plus its date and a delete button that asks first.
 */
@Component({
  selector: 'app-history-detail-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalDatePipe,
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    SkeletonComponent,
    AnalysisResultComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history-detail.page.html',
  styleUrl: './history-detail.page.scss',
})
export class HistoryDetailPage {
  private readonly texts = inject(TextsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  protected readonly language = inject(LanguageService).language;
  private readonly confirm = viewChild.required(ConfirmDialogComponent);

  private readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    {
      requireSync: true,
    },
  );
  private readonly attempt = signal(0);

  protected readonly view = toSignal(
    toObservable(computed(() => ({ id: this.id(), attempt: this.attempt() }))).pipe(
      switchMap(({ id }) =>
        this.texts.get(id).pipe(
          map((text): View => ({ status: 'ready', text })),
          // An id that is not even a valid id (422) is as "not found" as one that does not exist.
          catchError((error: ApiError): Observable<View> => {
            const missing = error.code === 'not_found' || error.code === 'validation_error';
            return of({ status: missing ? 'notFound' : 'error' });
          }),
          startWith<View>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as View },
  );

  protected readonly deleting = signal(false);

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  protected askToDelete(): void {
    this.confirm().open();
  }

  protected delete(): void {
    if (this.deleting()) {
      return; // a second click while the first request runs must not send a second one
    }
    this.deleting.set(true);
    this.texts
      .remove(this.id())
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => {
          this.confirm().close();
          this.toasts.show(this.transloco.translate('history.detail.deleted'), 'success');
          void this.router.navigateByUrl('/history');
        },
        // The error interceptor has already shown why; the user can try again from the page.
        error: () => this.confirm().close(),
      });
  }
}
