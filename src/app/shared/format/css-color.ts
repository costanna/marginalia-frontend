/**
 * Reads the current value of a CSS custom property (e.g. `--primary`) from the page.
 *
 * Chart.js draws to a `<canvas>`, so it cannot pick up colours from CSS the way the rest of the
 * app does: a chart's colours must be read explicitly, once per theme, and passed to Chart.js as
 * plain strings. `document` is only touched here, at call time, never cached across a render.
 */
export function cssColor(document: Document, name: string): string {
  return (
    document.defaultView
      ?.getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() ?? ''
  );
}
