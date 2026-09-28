import { fr, type Dict } from './fr';
import { en } from './en';

export const LANGS = ['fr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const DICTS: Record<Lang, Dict> = { fr, en };

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

export function otherLang(lang: Lang): Lang {
  return lang === 'fr' ? 'en' : 'fr';
}

export function langPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}
