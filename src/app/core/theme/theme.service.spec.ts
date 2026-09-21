import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

/** A controllable stand-in for the OS colour-scheme setting (jsdom has no matchMedia). */
function mockSystemTheme(initiallyDark: boolean) {
  let matches = initiallyDark;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
        listeners.delete(listener),
    })),
  );
  return {
    change(dark: boolean) {
      matches = dark;
      listeners.forEach((listener) => listener({ matches: dark }));
    },
  };
}

const attribute = () => document.documentElement.getAttribute('data-theme');
const themeColor = () =>
  document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockSystemTheme(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
  });

  it('defaults to the system preference', () => {
    const theme = TestBed.inject(ThemeService);

    expect(theme.preference()).toBe('system');
    expect(theme.resolved()).toBe('light');
    expect(attribute()).toBe('light');
  });

  it('follows a dark operating system while the preference is "system"', () => {
    mockSystemTheme(true);

    const theme = TestBed.inject(ThemeService);

    expect(theme.resolved()).toBe('dark');
    expect(attribute()).toBe('dark');
  });

  it('reacts live to the operating system changing, only in "system" mode', () => {
    const system = mockSystemTheme(false);
    const theme = TestBed.inject(ThemeService);

    system.change(true);
    expect(attribute()).toBe('dark');
    system.change(false);
    expect(attribute()).toBe('light');

    theme.setPreference('light');
    system.change(true);
    expect(attribute()).toBe('light'); // an explicit choice wins over the system
  });

  it('persists the choice and applies it', () => {
    const theme = TestBed.inject(ThemeService);

    theme.setPreference('dark');

    expect(attribute()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores the stored choice on the next visit', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    const theme = TestBed.inject(ThemeService);

    expect(theme.preference()).toBe('dark');
    expect(attribute()).toBe('dark');
  });

  it('ignores an invalid stored value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple');

    expect(TestBed.inject(ThemeService).preference()).toBe('system');
  });

  it('ignores an invalid preference', () => {
    const theme = TestBed.inject(ThemeService);

    theme.setPreference('purple' as never);

    expect(theme.preference()).toBe('system');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('toggles between light and dark from what is shown', () => {
    const theme = TestBed.inject(ThemeService);

    theme.toggle();
    expect(theme.resolved()).toBe('dark');
    theme.toggle();
    expect(theme.resolved()).toBe('light');
  });

  it('toggling in "system" mode leaves system mode', () => {
    mockSystemTheme(true);
    const theme = TestBed.inject(ThemeService);

    theme.toggle();

    expect(theme.preference()).toBe('light');
  });

  it('updates the browser theme-color', () => {
    const theme = TestBed.inject(ThemeService);
    expect(themeColor()).toBe('#fbf8f3');

    theme.setPreference('dark');

    expect(themeColor()).toBe('#0e1120');
  });

  it('keeps working when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const theme = TestBed.inject(ThemeService);
    theme.setPreference('dark');

    expect(theme.preference()).toBe('dark');
    expect(attribute()).toBe('dark');
  });
});
