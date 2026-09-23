import { vi } from 'vitest';

/**
 * jsdom implements neither 2D canvas drawing nor `ResizeObserver`, so mounting a Chart.js chart
 * under it throws ("Failed to create chart: can't acquire context from the given item", or a bare
 * `ResizeObserver is not defined`) before a single test assertion runs. This stubs both with
 * permissive no-op fakes so a chart mounts and receives its real `data`/`options` inputs; it draws
 * nothing, which is fine here because these are logic/DOM tests, not pixel tests — actual chart
 * rendering is checked separately with Playwright against a real browser.
 *
 * Call once per test (inside `render()`); call the returned function in `afterEach` to undo it —
 * together with `vi.unstubAllGlobals()` for the `ResizeObserver` stub. Restoring only this one spy
 * (rather than a blanket `vi.restoreAllMocks()`) avoids reverting mocks the test harness itself
 * relies on for TestBed's own per-test reset.
 */
export function stubChartEnvironment(): () => void {
  const noop = () => undefined;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = noop;
      unobserve = noop;
      disconnect = noop;
    },
  );

  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    const store: Record<string, unknown> = { canvas: this };
    return new Proxy(store, {
      get: (target, prop: string) => {
        if (prop in target) {
          return target[prop];
        }
        if (prop === 'measureText') {
          return () => ({ width: 0 });
        }
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return () => ({ addColorStop: noop });
        }
        return noop;
      },
      set: (target, prop: string, value) => {
        target[prop] = value;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
  });

  return () => spy.mockRestore();
}
