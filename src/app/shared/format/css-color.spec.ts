import { cssColor } from './css-color';

describe('cssColor', () => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--test-color');
  });

  it('reads the current value of a CSS custom property, trimmed', () => {
    document.documentElement.style.setProperty('--test-color', ' #4f46e5 ');

    expect(cssColor(document, '--test-color')).toBe('#4f46e5');
  });

  it('returns an empty string for a property that is not set', () => {
    expect(cssColor(document, '--does-not-exist')).toBe('');
  });
});
