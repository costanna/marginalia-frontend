import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SILENT_ERRORS } from '../../core/api/api.service';
import { AnalysisResult } from './analysis.models';
import { TextsApi } from './texts.api';

const API = environment.apiUrl;
const RESULT: AnalysisResult = {
  original_text: 'Yesterday I go to the cinema.',
  corrected_text: 'Yesterday I went to the cinema.',
  cefr_level: 'A2',
  word_count: 6,
  summary: 'Nice.',
  ui_language: 'es',
  corrections: [],
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(TextsApi), backend: TestBed.inject(HttpTestingController) };
}

describe('TextsApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('analyses a text for the signed-in user', () => {
    const { api, backend } = setup();
    let received: AnalysisResult | undefined;

    api
      .analyze({ text: 'Yesterday I go.', title: 'My day', ui_language: 'es' })
      .subscribe((result) => (received = result));
    const request = backend.expectOne(`${API}/texts/analyze`);
    request.flush(RESULT);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      text: 'Yesterday I go.',
      ui_language: 'es',
      title: 'My day',
    });
    expect(received).toEqual(RESULT);
  });

  it.each([undefined, null, '', '   '])('sends no title when it is blank (%j)', (title) => {
    const { api, backend } = setup();

    api.analyze({ text: 'Yesterday I go.', title, ui_language: 'en' }).subscribe();
    const request = backend.expectOne(`${API}/texts/analyze`);
    request.flush(RESULT);

    expect(request.request.body.title).toBeNull();
  });

  it('trims the title', () => {
    const { api, backend } = setup();

    api.analyze({ text: 'Yesterday I go.', title: '  My day ', ui_language: 'en' }).subscribe();
    const request = backend.expectOne(`${API}/texts/analyze`);
    request.flush(RESULT);

    expect(request.request.body.title).toBe('My day');
  });

  it('shows errors on the screen itself, not as a toast', () => {
    const { api, backend } = setup();

    api.analyze({ text: 'x', ui_language: 'es' }).subscribe({ error: () => undefined });
    const request = backend.expectOne(`${API}/texts/analyze`);
    request.flush({}, { status: 422, statusText: 'Unprocessable' });

    expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
  });

  it('runs the anonymous demo without a title and without saving', () => {
    const { api, backend } = setup();

    api.analyzeDemo({ text: 'Yesterday I go.', ui_language: 'ca' }).subscribe();
    const request = backend.expectOne(`${API}/demo/analyze`);
    request.flush(RESULT);

    expect(request.request.body).toEqual({ text: 'Yesterday I go.', ui_language: 'ca' });
    expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
  });

  describe('history', () => {
    const PAGE = { items: [], page: 2, page_size: 12, total: 0 };

    it('asks for a page of the history', () => {
      const { api, backend } = setup();
      let received: unknown;

      api.list(2, null).subscribe((page) => (received = page));
      const request = backend.expectOne(`${API}/texts?page=2&page_size=12`);
      request.flush(PAGE);

      expect(request.request.method).toBe('GET');
      expect(received).toEqual(PAGE);
    });

    it('can ask for only one level', () => {
      const { api, backend } = setup();

      api.list(1, 'B1').subscribe();
      const request = backend.expectOne(`${API}/texts?page=1&page_size=12&level=B1`);
      request.flush(PAGE);

      expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
    });

    it('reads one saved text, leaving "not found" for the screen to explain', () => {
      const { api, backend } = setup();
      let received: AnalysisResult | undefined;

      api.get('abc-123').subscribe((result) => (received = result));
      const request = backend.expectOne(`${API}/texts/abc-123`);
      request.flush(RESULT);

      expect(request.request.method).toBe('GET');
      expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
      expect(received).toEqual(RESULT);
    });

    it('cannot be tricked into calling another path through the id', () => {
      const { api, backend } = setup();

      api.get('../me').subscribe({ error: () => undefined });
      const request = backend.expectOne(`${API}/texts/..%2Fme`);
      request.flush({}, { status: 404, statusText: 'Not Found' });

      expect(request.request.url).not.toContain('/../');
    });

    it('deletes a text, with the normal error toast if it fails', () => {
      const { api, backend } = setup();
      let done = false;

      api.remove('abc-123').subscribe(() => (done = true));
      const request = backend.expectOne(`${API}/texts/abc-123`);
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(request.request.method).toBe('DELETE');
      expect(request.request.context.get(SILENT_ERRORS)).toBe(false);
      expect(done).toBe(true);
    });
  });
});
