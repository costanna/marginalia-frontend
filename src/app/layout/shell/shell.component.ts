import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastContainerComponent } from '../../shared/ui/toast-container/toast-container.component';
import { WakeBannerComponent } from '../../shared/ui/wake-banner/wake-banner.component';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';

/**
 * The frame around every page: skip link, server-waking banner, header, main content, footer and
 * toasts. The footer sits at the bottom of the viewport even when the page is short.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    TranslocoPipe,
    HeaderComponent,
    FooterComponent,
    WakeBannerComponent,
    ToastContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main" (click)="skipToContent($event)">
      {{ 'nav.skip' | transloco }}
    </a>
    <app-wake-banner />
    <app-header />
    <main id="main" #main tabindex="-1">
      <router-outlet />
    </main>
    <app-footer />
    <app-toast-container />
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 100dvh;
    }

    main {
      flex: 1;
    }

    main:focus {
      outline: none;
    }

    // Off-screen until it receives keyboard focus.
    .skip-link {
      position: absolute;
      inset-inline-start: var(--sp-8);
      top: -4rem;
      z-index: 200;
      padding: var(--sp-8) var(--sp-16);
      border-radius: var(--radius-input);
      background: var(--primary);
      color: var(--on-primary);
      font-weight: 600;
      text-decoration: none;
    }

    .skip-link:focus {
      top: var(--sp-8);
    }
  `,
})
export class ShellComponent {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  // A plain "#main" link would be resolved against <base href="/"> and navigate away from the
  // current route; moving focus by hand is the reliable way in a single-page app.
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
