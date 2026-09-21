import { LocalDatePipe } from './local-date.pipe';

// Noon UTC: the same calendar day in every time zone the tests may run in.
const NOON = '2026-09-21T12:00:00Z';

describe('LocalDatePipe', () => {
  const pipe = new LocalDatePipe();

  it('writes the date in the language asked for', () => {
    expect(pipe.transform(NOON, 'en')).toMatch(/Sep 21, 2026/);
    expect(pipe.transform(NOON, 'es')).toMatch(/21 sept\.? 2026/);
    expect(pipe.transform(NOON, 'ca')).toMatch(/21 de set\.? (de )?2026/);
  });

  it('can write the long form', () => {
    expect(pipe.transform(NOON, 'en', 'long')).toBe('September 21, 2026');
  });

  it.each([null, undefined, '', 'not a date'])('shows nothing for %j', (value) => {
    expect(pipe.transform(value, 'en')).toBe('');
  });
});
