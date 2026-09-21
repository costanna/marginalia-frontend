import { API_ERROR_CODES } from '../api/error-codes';
import ca from '../../../assets/i18n/ca.json';
import en from '../../../assets/i18n/en.json';
import es from '../../../assets/i18n/es.json';

interface Tree {
  [key: string]: string | Tree;
}

/** Flattens the nested JSON into `{ 'nav.write': 'Escribir', ... }`. */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((flat, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...flat, [path]: value }
      : { ...flat, ...flatten(value, path) };
  }, {});
}

const files: Record<string, Record<string, string>> = {
  ca: flatten(ca),
  es: flatten(es),
  en: flatten(en),
};
const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('translation files', () => {
  it('have exactly the same set of keys', () => {
    const reference = Object.keys(files['es']).sort();

    for (const [lang, entries] of Object.entries(files)) {
      const keys = Object.keys(entries).sort();
      const missing = reference.filter((key) => !keys.includes(key));
      const extra = keys.filter((key) => !reference.includes(key));
      expect({ lang, missing, extra }).toEqual({ lang, missing: [], extra: [] });
    }
  });

  it('use the same interpolation parameters in every language', () => {
    for (const [key, text] of Object.entries(files['es'])) {
      for (const lang of ['ca', 'en']) {
        expect({ key, lang, params: placeholders(files[lang][key]) }).toEqual({
          key,
          lang,
          params: placeholders(text),
        });
      }
    }
  });

  it('have no empty texts', () => {
    for (const [lang, entries] of Object.entries(files)) {
      const empty = Object.entries(entries).filter(([, text]) => text.trim() === '');
      expect({ lang, empty }).toEqual({ lang, empty: [] });
    }
  });

  it('translate every stable error code of the API', () => {
    for (const [lang, entries] of Object.entries(files)) {
      const missing = API_ERROR_CODES.filter((code) => !entries[`errors.api.${code}`]);
      expect({ lang, missing }).toEqual({ lang, missing: [] });
    }
  });

  it('follow the examples fixed by the specification', () => {
    expect(files['es']['nav.write']).toBe('Escribir');
    expect(files['ca']['nav.write']).toBe('Escriure');
    expect(files['en']['nav.write']).toBe('Write');
    expect(files['es']['theme.light']).toBe('Claro');
    expect(files['ca']['theme.dark']).toBe('Fosc');
    expect(files['en']['theme.system']).toBe('System');
    expect(files['es']['footer.rights']).toBe('Todos los derechos reservados.');
    expect(files['ca']['footer.rights']).toBe('Tots els drets reservats.');
    expect(files['en']['footer.rights']).toBe('All rights reserved.');
    expect(files['es']['home.tagline']).toBe('Aprende inglés escribiendo.');
    expect(files['ca']['home.tagline']).toBe('Aprèn anglès escrivint.');
    expect(files['en']['home.tagline']).toBe('Learn English by writing.');
  });
});
