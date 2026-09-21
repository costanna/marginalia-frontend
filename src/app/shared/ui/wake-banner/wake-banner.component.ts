import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ServerWakeService } from '../../../core/api/server-wake.service';

/** "Waking up the server…" notice, shown only while the free-tier API is starting up. */
@Component({
  selector: 'app-wake-banner',
  imports: [TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (wake.waking()) {
      <div class="banner" role="status">
        <span class="banner__spinner" aria-hidden="true"></span>
        <p>{{ 'server.waking' | transloco }}</p>
      </div>
    }
  `,
  styles: `
    .banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-12);
      padding: var(--sp-8) var(--sp-16);
      background: var(--primary-soft);
      color: var(--text);
      font-size: 0.9375rem;
      text-align: center;
    }

    .banner__spinner {
      flex: none;
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--primary);
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 800ms linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class WakeBannerComponent {
  protected readonly wake = inject(ServerWakeService);
}
