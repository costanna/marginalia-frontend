import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageSwitcherComponent } from '../../shared/ui/language-switcher/language-switcher.component';
import { LogoComponent } from '../../shared/ui/logo/logo.component';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';
import { PRIVATE_NAV_ITEMS } from '../nav-items';

/** Widths from which the horizontal navigation replaces the side panel (breakpoint md). */
const DESKTOP_QUERY = '(min-width: 768px)';

/**
 * Site header. From 768px: logo, horizontal navigation, language, theme and account actions.
 * Below that: logo and a menu button that opens a side panel (navigation, language and theme).
 * The panel is a native modal <dialog>: focus is trapped inside it, Escape closes it and the page
 * behind is inert, all provided by the browser.
 */
@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    LogoComponent,
    LanguageSwitcherComponent,
    ThemeToggleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly navItems = PRIVATE_NAV_ITEMS;
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly panel = viewChild.required<ElementRef<HTMLDialogElement>>('panel');

  protected readonly menuOpen = signal(false);

  constructor() {
    // Any navigation closes the menu.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMenu());

    afterNextRender(() => {
      // A click on the backdrop lands on the <dialog> element itself, not on its content.
      // (Escape and the close button are the keyboard routes; the dialog handles Escape natively.)
      const dialog = this.panel().nativeElement;
      const onBackdropClick = (event: MouseEvent) => event.target === dialog && this.closeMenu();
      dialog.addEventListener('click', onBackdropClick);
      this.destroyRef.onDestroy(() => dialog.removeEventListener('click', onBackdropClick));

      // Growing past the mobile width while the menu is open would leave a hidden modal behind.
      const query = this.document.defaultView?.matchMedia?.(DESKTOP_QUERY);
      const onChange = (event: { matches: boolean }) => event.matches && this.closeMenu();
      query?.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query?.removeEventListener('change', onChange));
    });
  }

  protected openMenu(): void {
    const dialog = this.panel().nativeElement;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    this.menuOpen.set(true);
  }

  protected closeMenu(): void {
    const dialog = this.panel().nativeElement;
    if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
