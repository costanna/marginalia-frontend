import { TestBed } from '@angular/core/testing';
import { BreakpointService, DESKTOP_MEDIA_QUERY } from './breakpoint.service';

function mockMediaQuery(initiallyMatches: boolean) {
  let matches = initiallyMatches;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const matchMedia = vi.fn(() => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, listener: (event: { matches: boolean }) => void) =>
      listeners.add(listener),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    resize(desktop: boolean) {
      matches = desktop;
      listeners.forEach((listener) => listener({ matches: desktop }));
    },
  };
}

describe('BreakpointService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for the desktop breakpoint (1024px)', () => {
    const { matchMedia } = mockMediaQuery(true);

    TestBed.inject(BreakpointService);

    expect(matchMedia).toHaveBeenCalledWith(DESKTOP_MEDIA_QUERY);
    expect(DESKTOP_MEDIA_QUERY).toBe('(min-width: 1024px)');
  });

  it.each([true, false])('starts with what the window says (desktop=%s)', (desktop) => {
    mockMediaQuery(desktop);

    expect(TestBed.inject(BreakpointService).isDesktop()).toBe(desktop);
  });

  it('follows the window as it is resized', () => {
    const media = mockMediaQuery(true);
    const breakpoint = TestBed.inject(BreakpointService);

    media.resize(false);
    expect(breakpoint.isDesktop()).toBe(false);
    media.resize(true);
    expect(breakpoint.isDesktop()).toBe(true);
  });

  it('assumes desktop where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);

    expect(TestBed.inject(BreakpointService).isDesktop()).toBe(true);
  });
});
