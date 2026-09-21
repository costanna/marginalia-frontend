import { DEFAULT_RETURN_URL, safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it.each(['/history', '/history?page=2', '/write#top', '/settings/profile'])(
    'accepts the in-app path %s',
    (path) => {
      expect(safeReturnUrl(path)).toBe(path);
    },
  );

  it.each([
    null,
    undefined,
    '',
    'history', // not absolute
    'https://evil.example.com',
    '//evil.example.com', // protocol-relative: would leave the site
    '/\\evil.example.com', // browsers read "/\" as "//"
    'javascript:alert(1)',
  ])('rejects %s and falls back to the default page', (raw) => {
    expect(safeReturnUrl(raw)).toBe(DEFAULT_RETURN_URL);
  });
});
