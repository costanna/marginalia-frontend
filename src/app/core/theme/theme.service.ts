import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'marginalia.theme';
export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

const DARK_QUERY = '(prefers-color-scheme: dark)';
// Used for <meta name="theme-color"> when the CSS token cannot be read (e.g. in tests).
const FALLBACK_THEME_COLOR: Record<ResolvedTheme, string> = { light: '#fbf8f3', dark: '#0e1120' };

/**
 * Light / dark / system theme.
 *
 * The theme is the `data-theme` attribute on <html>; an inline script in index.html sets it before
 * the first paint (no flash), and this service keeps it in sync afterwards. The choice is stored in
 * localStorage. While the preference is "system" it follows the operating system live.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly darkQuery = this.document.defaultView?.matchMedia?.(DARK_QUERY) ?? null;

  private readonly preferenceState = signal<ThemePreference>(this.readStoredPreference());
  private readonly systemPrefersDark = signal(this.darkQuery?.matches ?? false);

  readonly preference = this.preferenceState.asReadonly();
  /** The theme actually shown ("system" resolved to light or dark). */
  readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preferenceState();
    if (preference === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return preference;
  });

  constructor() {
    this.darkQuery?.addEventListener('change', (event) => {
      this.systemPrefersDark.set(event.matches);
      this.apply();
    });
    this.apply();
  }

  setPreference(preference: ThemePreference): void {
    if (!THEME_PREFERENCES.includes(preference)) {
      return;
    }
    this.preferenceState.set(preference);
    this.store(preference);
    this.apply();
  }

  /** Switches between light and dark from whatever is currently shown (header sun/moon button). */
  toggle(): void {
    this.setPreference(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private apply(): void {
    const theme = this.resolved();
    const root = this.document.documentElement;
    root.setAttribute('data-theme', theme);
    this.updateThemeColorMeta(theme);
  }

  /** Keeps the browser UI colour (mobile address bar) in line with the page background. */
  private updateThemeColorMeta(theme: ResolvedTheme): void {
    let meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'theme-color';
      this.document.head.appendChild(meta);
    }
    const background = this.document.defaultView
      ?.getComputedStyle(this.document.documentElement)
      .getPropertyValue('--bg')
      .trim();
    meta.content = background || FALLBACK_THEME_COLOR[theme];
  }

  // Storage can throw (private mode, blocked site data): the theme must still work without it.
  private readStoredPreference(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return THEME_PREFERENCES.includes(stored as ThemePreference)
        ? (stored as ThemePreference)
        : 'system';
    } catch {
      return 'system';
    }
  }

  private store(preference: ThemePreference): void {
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Ignored on purpose: the choice just will not persist.
    }
  }
}
