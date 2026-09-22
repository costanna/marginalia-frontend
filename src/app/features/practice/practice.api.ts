import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { Exercise, ExerciseAttemptResult } from './practice.models';

/**
 * Both calls are `silent`: the practice screen shows its own states (loading, error, inline
 * feedback) instead of a toast, the same way the writing screen handles `/texts/analyze`.
 */
@Injectable({ providedIn: 'root' })
export class PracticeApi {
  private readonly api = inject(ApiService);

  /** A fresh batch built from the user's worst rules, or the still-pending one reused. */
  generate(): Observable<Exercise[]> {
    return this.api.post<Exercise[]>('/exercises/generate', {}, { silent: true });
  }

  attempt(exerciseId: string, userAnswer: string): Observable<ExerciseAttemptResult> {
    return this.api.post<ExerciseAttemptResult>(
      `/exercises/${encodeURIComponent(exerciseId)}/attempt`,
      { user_answer: userAnswer },
      { silent: true },
    );
  }
}
