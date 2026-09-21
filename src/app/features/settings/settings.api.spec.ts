import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { makeUser } from '../../../testing/fixtures';
import { SILENT_ERRORS } from '../../core/api/api.service';
import { SettingsApi } from './settings.api';

const API = environment.apiUrl;

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return { api: TestBed.inject(SettingsApi), backend: TestBed.inject(HttpTestingController) };
}

describe('SettingsApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('updates the profile with only the fields it is given', () => {
    const { api, backend } = setup();
    const updated = makeUser({ display_name: 'Marta', target_level: 'B2' });
    let received: unknown;

    api
      .updateProfile({ display_name: 'Marta', target_level: 'B2' })
      .subscribe((u) => (received = u));
    const request = backend.expectOne(`${API}/me`);
    request.flush(updated);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ display_name: 'Marta', target_level: 'B2' });
    expect(received).toEqual(updated);
  });

  it('can clear the target level (an explicit null)', () => {
    const { api, backend } = setup();

    api.updateProfile({ target_level: null }).subscribe();
    const request = backend.expectOne(`${API}/me`);
    request.flush(makeUser());

    expect(request.request.body).toEqual({ target_level: null });
  });

  it('asks for the export, with the error shown as a toast', () => {
    const { api, backend } = setup();
    const data = { exported_at: '2026-09-21T12:00:00Z', profile: makeUser(), texts: [], usage: [] };
    let received: unknown;

    api.exportData().subscribe((d) => (received = d));
    const request = backend.expectOne(`${API}/me/export`);
    request.flush(data);

    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(SILENT_ERRORS)).toBe(false);
    expect(received).toEqual(data);
  });

  it('deletes the account', () => {
    const { api, backend } = setup();
    let done = false;

    api.deleteAccount().subscribe(() => (done = true));
    const request = backend.expectOne(`${API}/me`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    expect(request.request.context.get(SILENT_ERRORS)).toBe(false);
    expect(done).toBe(true);
  });
});
