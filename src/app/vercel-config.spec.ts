import vercel from '../../vercel.json';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const headerRules = vercel.headers as HeaderRule[];
const valueOf = (source: string, key: string) =>
  headerRules.find((rule) => rule.source === source)?.headers.find((h) => h.key === key)?.value;

/** A slip in vercel.json only shows up in production, so its important rules are pinned here. */
describe('vercel.json', () => {
  it('sends every route to index.html so a reload on /history does not 404', () => {
    expect(vercel.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
  });

  it('sets the basic security headers on every response', () => {
    expect(valueOf('/(.*)', 'X-Content-Type-Options')).toBe('nosniff');
    expect(valueOf('/(.*)', 'X-Frame-Options')).toBe('DENY');
    expect(valueOf('/(.*)', 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it.each(['/(main|chunk|styles|polyfills)-(.*)', '/media/(.*)'])(
    'caches the hashed build files (%s) for a year as immutable',
    (source) => {
      expect(valueOf(source, 'Cache-Control')).toBe('public, max-age=31536000, immutable');
    },
  );

  it('never caches the translation files or index.html forever (their names are not hashed)', () => {
    const forever = headerRules
      .filter((rule) => rule.headers.some((h) => /immutable/.test(h.value)))
      .map((rule) => rule.source);

    for (const source of forever) {
      expect(
        new RegExp(`^${source.replace(/\(\.\*\)/g, '.*')}$`).test('/assets/i18n/es.json'),
      ).toBe(false);
      expect(new RegExp(`^${source.replace(/\(\.\*\)/g, '.*')}$`).test('/index.html')).toBe(false);
    }
  });
});
