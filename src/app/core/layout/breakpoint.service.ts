import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

/** The width from which the screens use their desktop layout (breakpoint lg). */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

/**
 * Tells components whether the desktop layout is active, and follows the window as it resizes.
 * CSS handles most layout by itself; this is only for behaviour that differs (for example, a
 * correction opens in a bottom sheet on a phone but only highlights on a wide screen).
 */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  private readonly query = inject(DOCUMENT).defaultView?.matchMedia?.(DESKTOP_MEDIA_QUERY) ?? null;
  private readonly desktop = signal(this.query?.matches ?? true);

  readonly isDesktop = this.desktop.asReadonly();

  constructor() {
    this.query?.addEventListener('change', (event) => this.desktop.set(event.matches));
  }
}
