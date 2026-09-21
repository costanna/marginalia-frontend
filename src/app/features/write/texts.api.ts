import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { AnalysisResult, AnalyzeRequest } from './analysis.models';

/**
 * Text analysis endpoints. Both are `silent`: the screen shows the error next to the text (with a
 * translated message and the limits from `details`) instead of a toast that disappears.
 */
@Injectable({ providedIn: 'root' })
export class TextsApi {
  private readonly api = inject(ApiService);

  /** Analyse and SAVE a text of the signed-in user. */
  analyze(request: AnalyzeRequest): Observable<AnalysisResult> {
    const title = request.title?.trim();
    return this.api.post<AnalysisResult>(
      '/texts/analyze',
      { text: request.text, ui_language: request.ui_language, title: title ? title : null },
      { silent: true },
    );
  }

  /** Analyse without an account and without saving (limited per IP by the API). */
  analyzeDemo(request: Pick<AnalyzeRequest, 'text' | 'ui_language'>): Observable<AnalysisResult> {
    return this.api.post<AnalysisResult>(
      '/demo/analyze',
      { text: request.text, ui_language: request.ui_language },
      { silent: true },
    );
  }
}
