export const SUPPORTED_LANGS = ['ca', 'es', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

/** Used when nothing is stored and the browser language is not one of the three. */
export const DEFAULT_LANG: SupportedLang = 'es';

export const LANG_STORAGE_KEY = 'marginalia.lang';

export function isSupportedLang(value: unknown): value is SupportedLang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}
