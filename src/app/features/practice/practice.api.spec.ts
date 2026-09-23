import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SILENT_ERRORS } from '../../core/api/api.service';
import { Exercise, ExerciseAttemptResult } from './practice.models';
import { PracticeApi } from './practice.api';

const API = environment.apiUrl;

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(PracticeApi), backend: TestBed.inject(HttpTestingController) };
}

describe('PracticeApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('asks for a batch and shows its own error instead of a toast', () => {
    const { api, backend } = setup();
    const batch: Exercise[] = [
      {
        id: 'ex-1',
        rule_tag: 'verb_tense',
        type: 'fill_blank',
        prompt: 'Yesterday I ___ home.',
        options: null,
        status: 'pending',
        created_at: '2026-09-22T10:00:00Z',
      },
    ];
    let received: Exercise[] | undefined;

    api.generate().subscribe((result) => (received = result));
    const request = backend.expectOne(`${API}/exercises/generate`);
    request.flush(batch);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
    expect(received).toEqual(batch);
  });

  it('sends an attempt and reports it silently too', () => {
    const { api, backend } = setup();
    const result: ExerciseAttemptResult = {
      is_correct: true,
      correct_answer: 'went',
      explanation: 'Past simple.',
    };
    let received: ExerciseAttemptResult | undefined;

    api.attempt('ex-1', 'went').subscribe((r) => (received = r));
    const request = backend.expectOne(`${API}/exercises/ex-1/attempt`);
    request.flush(result);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ user_answer: 'went' });
    expect(request.request.context.get(SILENT_ERRORS)).toBe(true);
    expect(received).toEqual(result);
  });

  it('encodes the exercise id in the attempt URL', () => {
    const { api, backend } = setup();

    api.attempt('has spaces/slash', 'x').subscribe();
    const request = backend.expectOne(`${API}/exercises/has%20spaces%2Fslash/attempt`);
    request.flush({ is_correct: false, correct_answer: 'x', explanation: 'x' });

    expect(request.request.url).not.toContain('has spaces/slash');
  });
});
