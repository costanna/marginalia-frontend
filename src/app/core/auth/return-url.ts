export const DEFAULT_RETURN_URL = '/write';

/**
 * Where to go after logging in. Only in-app paths are accepted: a `returnUrl` pointing to another
 * site ("https://evil.example" or "//evil.example") would turn the login page into an open
 * redirect that phishing links could abuse.
 */
export function safeReturnUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return DEFAULT_RETURN_URL;
  }
  return raw;
}
