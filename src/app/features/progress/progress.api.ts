import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { CategoryCount, OverviewStats, ProgressPoint, RuleCount } from './progress.models';

/** All four calls are `silent`: the progress screen shows its own loading/error/empty states. */
@Injectable({ providedIn: 'root' })
export class ProgressApi {
  private readonly api = inject(ApiService);

  overview(): Observable<OverviewStats> {
    return this.api.get<OverviewStats>('/stats/overview', { silent: true });
  }

  progress(days: number): Observable<ProgressPoint[]> {
    return this.api.get<ProgressPoint[]>(`/stats/progress?days=${days}`, { silent: true });
  }

  errorsByCategory(days: number): Observable<CategoryCount[]> {
    return this.api.get<CategoryCount[]>(`/stats/errors-by-category?days=${days}`, {
      silent: true,
    });
  }

  topRules(days: number): Observable<RuleCount[]> {
    return this.api.get<RuleCount[]>(`/stats/top-rules?days=${days}`, { silent: true });
  }
}
