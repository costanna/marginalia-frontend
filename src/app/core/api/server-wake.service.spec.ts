import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ServerWakeService, WAKE_BANNER_DELAY_MS } from './server-wake.service';

const HEALTH = `${environment.apiUrl}/health`;

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  return {
    wake: TestBed.inject(ServerWakeService),
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('ServerWakeService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pings /health when the app starts', () => {
    const { wake, backend } = setup();

    wake.start();

    expect(backend.expectOne(HEALTH).request.method).toBe('GET');
  });

  it('shows no banner when the server answers quickly', () => {
    const { wake, backend } = setup();

    wake.start();
    vi.advanceTimersByTime(WAKE_BANNER_DELAY_MS - 1);
    backend.expectOne(HEALTH).flush({ status: 'ok' });
    vi.advanceTimersByTime(WAKE_BANNER_DELAY_MS * 2);

    expect(wake.waking()).toBe(false);
  });

  it('shows the banner once the wait passes 3 seconds, and hides it when the server answers', () => {
    const { wake, backend } = setup();

    wake.start();
    vi.advanceTimersByTime(WAKE_BANNER_DELAY_MS - 1);
    expect(wake.waking()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(wake.waking()).toBe(true);

    backend.expectOne(HEALTH).flush({ status: 'ok' });

    expect(wake.waking()).toBe(false);
  });

  it('keeps trying while the server is still waking up', () => {
    const { wake, backend } = setup();

    wake.start();
    backend.expectOne(HEALTH).error(new ProgressEvent('error')); // the host is still asleep
    vi.advanceTimersByTime(3000);
    backend.expectOne(HEALTH).flush('gateway timeout', { status: 504, statusText: 'Timeout' });
    vi.advanceTimersByTime(3000);
    expect(wake.waking()).toBe(true);
    backend.expectOne(HEALTH).flush({ status: 'ok' });

    expect(wake.waking()).toBe(false);
  });
});
