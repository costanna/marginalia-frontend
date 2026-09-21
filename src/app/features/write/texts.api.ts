import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { HISTORY_PAGE_SIZE, TextPage } from '../history/history.models';
import { AnalysisResult, AnalyzeRequest, CefrLevel } from './analysis.models';

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

  /**
   * One page of the history, newest first, optionally only the texts of one level. Silent: the
   * history screen shows its own error state, with a retry button, instead of a toast.
   */
  list(page: number, level: CefrLevel | null): Observable<TextPage> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(HISTORY_PAGE_SIZE),
    });
    if (level) {
      params.set('level', level);
    }
    return this.api.get<TextPage>(`/texts?${params}`, { silent: true });
  }

  /** One saved text with its corrections (silent: the detail screen handles "not found"). */
  get(id: string): Observable<AnalysisResult> {
    return this.api.get<AnalysisResult>(`/texts/${encodeURIComponent(id)}`, { silent: true });
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/texts/${encodeURIComponent(id)}`);
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
