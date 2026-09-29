import { normalizeKey } from './lexicon';

export interface Token {
  text: string;
  /** Normalised form, as stored in the word lists. */
  key: string;
  start: number;
  end: number;
  /** Starts with a capital letter (also true for words written entirely in capitals). */
  capitalized: boolean;
  /** Two letters or more, all capitals. */
  allCaps: boolean;
  /** First word of the text, of a line or of a sentence — where a capital says nothing about the word. */
  sentenceStart: boolean;
}

// Words are runs of letters, possibly joined by hyphens (Jean-Pierre, Saint-Denis); apostrophes split them (d'Orsay).
const WORD = /\p{L}+(?:-\p{L}+)*/gu;
const UPPER = /^\p{Lu}/u;
const LOWER = /\p{Ll}/u;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(WORD)) {
    const word = match[0];
    const start = match.index;
    tokens.push({
      text: word,
      key: normalizeKey(word),
      start,
      end: start + word.length,
      capitalized: UPPER.test(word),
      allCaps: word.length >= 2 && !LOWER.test(word),
      sentenceStart: isSentenceStart(text, start),
    });
  }
  return tokens;
}

function isSentenceStart(text: string, start: number): boolean {
  for (let i = start - 1; i >= 0; i--) {
    const char = text[i];
    if (char === '\n' || char === '.' || char === '!' || char === '?' || char === '…') return true;
    // Skip spacing, quotes, bullets and opening brackets that may precede the first word.
    if (!/[\s"«»“”'(\[•*·–—-]/u.test(char)) return false;
  }
  return true;
}

/** Index of the first token starting at or after `position` (binary search), or -1. */
export function tokenAt(tokens: Token[], position: number): number {
  let low = 0;
  let high = tokens.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (tokens[middle].start < position) low = middle + 1;
    else high = middle;
  }
  return low < tokens.length ? low : -1;
}

/** Only spaces (no line break, no punctuation) between two positions. */
export function onlySpacesBetween(text: string, from: number, to: number): boolean {
  return /^[ \t ]+$/.test(text.slice(from, to));
}
