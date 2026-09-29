// Word lists used to recognise people, places and ordinary words. They are plain text files served by the
// site (public/lexicon/), one normalised entry per line; see public/lexicon/SOURCES.md.

export interface Lexicon {
  firstNames: Set<string>;
  surnames: Set<string>;
  /** French communes. */
  places: Set<string>;
  /** French départements and régions. */
  territories: Set<string>;
  /** Ordinary French and English words, so they are not taken for names. */
  words: Set<string>;
}

export const LEXICON_FILES = {
  firstNames: ['prenoms.txt'],
  surnames: ['noms.txt'],
  places: ['communes.txt'],
  territories: ['territoires.txt'],
  words: ['mots.txt', 'mots-en.txt'],
} as const satisfies Record<keyof Lexicon, readonly string[]>;

/** Lower case, without accents: the form every list entry is stored in. */
export function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

/** Builds the lexicon from the content of its files, keyed by file name. */
export function parseLexicon(contents: Record<string, string>): Lexicon {
  const load = (files: readonly string[]) => {
    const set = new Set<string>();
    for (const file of files) {
      for (const line of (contents[file] ?? '').split(/\r?\n/)) if (line) set.add(line);
    }
    return set;
  };
  return {
    firstNames: load(LEXICON_FILES.firstNames),
    surnames: load(LEXICON_FILES.surnames),
    places: load(LEXICON_FILES.places),
    territories: load(LEXICON_FILES.territories),
    words: load(LEXICON_FILES.words),
  };
}

/** A lexicon from small inline lists, for tests. */
export function makeLexicon(lists: Partial<Record<keyof Lexicon, string[]>>): Lexicon {
  const set = (items: string[] = []) => new Set(items.map(normalizeKey));
  return {
    firstNames: set(lists.firstNames),
    surnames: set(lists.surnames),
    places: set(lists.places),
    territories: set(lists.territories),
    words: set(lists.words),
  };
}

/** An ordinary word: in the word lists, or a hyphenated compound made only of ordinary words. */
export function isCommonWord(lexicon: Lexicon, key: string): boolean {
  if (lexicon.words.has(key)) return true;
  return key.includes('-') && key.split('-').every((part) => part.length < 2 || lexicon.words.has(part));
}
