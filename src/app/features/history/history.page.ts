import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalDatePipe } from '../../shared/format/local-date.pipe';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { TextsApi } from '../write/texts.api';
import { CEFR_LEVELS, TextPage, isCefrLevel, pageCount, parsePage } from './history.models';

type View = { status: 'loading' } | { status: 'error' } | { status: 'ready'; page: TextPage };

/**
 * The user's saved texts, newest first: a grid of cards with the date, the estimated level and the
 * number of corrections, filterable by level and paginated.
 *
 * The page and the level live in the address (`/history?level=B1&page=2`), so the browser's back
 * button, a reload and a shared link all land where the user was. The screen resolves its four
 * states: loading (skeleton), error (with a retry), empty and the list.
 */
@Component({
  selector: 'app-history-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalDatePipe,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './history.page.html',
  styleUrl: './history.page.scss',
})
export class HistoryPage {
  private readonly texts = inject(TextsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService).language;

  protected readonly levels = CEFR_LEVELS;

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly page = computed(() => parsePage(this.params().get('page')));
  protected readonly level = computed(() => {
    const value = this.params().get('level');
    return isCefrLevel(value) ? value : null;
  });

  // Bumped by "Try again": the same query, asked once more.
  private readonly attempt = signal(0);

  protected readonly view = toSignal(
    toObservable(
      computed(() => ({ page: this.page(), level: this.level(), attempt: this.attempt() })),
    ).pipe(
      // switchMap: an answer that arrives late for an old page or filter is dropped.
      switchMap(({ page, level }) =>
        this.texts.list(page, level).pipe(
          map((data): View => ({ status: 'ready', page: data })),
          catchError((): Observable<View> => of({ status: 'error' })),
          startWith<View>({ status: 'loading' }),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as View },
  );

  protected readonly pages = computed(() => {
    const view = this.view();
    return view.status === 'ready' ? pageCount(view.page.total, view.page.page_size) : 1;
  });

  constructor() {
    // A page past the end (a stale link, or the last text of the last page was deleted) is not an
    // error: show the last page that exists.
    effect(() => {
      const view = this.view();
      if (
        view.status === 'ready' &&
        view.page.items.length === 0 &&
        view.page.total > 0 &&
        this.page() > 1
      ) {
        this.goTo(this.pages(), true);
      }
    });
  }

  protected setLevel(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    // A new filter starts from its first page.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { level: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected clearFilter(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { level: null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected goTo(page: number, replaceUrl = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }
}
