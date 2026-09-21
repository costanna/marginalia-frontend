import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { retry } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Show the banner only if the server has not answered after this long (a healthy one is faster). */
export const WAKE_BANNER_DELAY_MS = 3000;
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 40; // about two minutes: more than a cold start of the free hosting plan

/**
 * The free hosting plan puts the API to sleep after a while without traffic, and the first request
 * can take close to a minute. This pings `/health` when the app starts (which also wakes it up)
 * and shows a banner if the wait is noticeable.
 */
@Injectable({ providedIn: 'root' })
export class ServerWakeService {
  private readonly http = inject(HttpClient);
  private readonly wakingState = signal(false);

  /** True while the server is not answering and the wait is long enough to be worth a message. */
  readonly waking = this.wakingState.asReadonly();

  /** Fire and forget: never blocks the first render. */
  start(): void {
    const timer = setTimeout(() => this.wakingState.set(true), WAKE_BANNER_DELAY_MS);
    const finish = () => {
      clearTimeout(timer);
      this.wakingState.set(false);
    };
    this.http
      .get(`${environment.apiUrl}/health`)
      .pipe(retry({ count: MAX_RETRIES, delay: RETRY_DELAY_MS }))
      .subscribe({ next: finish, error: finish });
  }
}
