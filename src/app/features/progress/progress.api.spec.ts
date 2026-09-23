import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SILENT_ERRORS } from '../../core/api/api.service';
import { OverviewStats } from './progress.models';
import { ProgressApi } from './progress.api';

const API = environment.apiUrl;

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(ProgressApi), backend: TestBed.inject(HttpTestingController) };
}

describe('ProgressApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('asks for the overview and shows its own error instead of a toast', () => {
    const { api, backend } = setup();
    const stats: OverviewStats = {
      texts_count: 3,
      words_count: 120,
      errors_per_100_words: 5.5,
      current_level: 'B1',
      streak_days: 2,
    };
    let received: OverviewStats | undefined;

    api.overview().subscribe((s) => (received = s));
    const request = backend.expectOne(`${API}/stats/overview`);
    request.flush(stats);

    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
    expect(received).toEqual(stats);
  });

  it('asks progress with the given number of days', () => {
    const { api, backend } = setup();

    api.progress(90).subscribe();
    const request = backend.expectOne(`${API}/stats/progress?days=90`);
    request.flush([]);

    expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
  });

  it('asks errors-by-category with the given number of days', () => {
    const { api, backend } = setup();

    api.errorsByCategory(30).subscribe();
    backend.expectOne(`${API}/stats/errors-by-category?days=30`).flush([]);
  });

  it('asks top-rules with the given number of days', () => {
    const { api, backend } = setup();

    api.topRules(30).subscribe();
    backend.expectOne(`${API}/stats/top-rules?days=30`).flush([]);
  });
});
