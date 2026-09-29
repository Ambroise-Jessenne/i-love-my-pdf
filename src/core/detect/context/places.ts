import type { Candidate } from '../resolve';
import { isCommonWord, type Lexicon } from '../lexicon';
import { onlySpacesBetween, tokenAt, type Token } from '../tokens';

export const PLACE_PRIORITY = 33;
const MAX_PLACE_WORDS = 5;

/** Lower-case words allowed inside a place name: « Saint-Rémy de Provence », « Châlons en Champagne ». */
const CONNECTORS = new Set(['sur', 'sous', 'en', 'les', 'lès', 'le', 'la', 'de', 'du', 'des', 'd', 'aux', 'et', 'on', 'upon']);
/** Words after which a place name is expected. */
const PREPOSITIONS = new Set(['a', 'au', 'aux', 'en', 'de', 'd', 'vers', 'pres', 'sur', 'in', 'at', 'from', 'near']);

// Birth, residence and signature formulas: whatever capitalised name follows is a place, known or not.
const PLACE_FORMULA =
  /(?<![\p{L}])(?:n[ée]e?|n[ée]\(e\)|fait|domicili[ée]e?|demeurant|r[ée]sidant|habitant|originaire|lieu de naissance|ville de naissance|ville|commune|localit[ée]|born|residing|living)(?:[ \t ]+le[ \t ]+[^\n]{1,25}?)?[ \t ]*(?:(?:[àa]|au|aux|en|de|in|at)(?![\p{L}])|d['’]|:)[ \t ]*/giu;
// Dateline of a letter or a signature: « Rennes, le 5 janvier 2026 », « À Saint-Malo, le 1er mars ».
const DATELINE =
  /^[ \t]*(?:[àÀ][ \t]+)?(\p{Lu}[\p{L}'’-]*(?:[ \t]+(?:(?:sur|sous|en|les|le|la|de|du|des|aux)[ \t]+)?\p{Lu}[\p{L}'’-]*){0,3}),[ \t]+le[ \t]+(?:\d|1er|premier)/gmu;
// « ( DROME ) », « (69) » right after a place.
const PARENTHESIS = /^[ \t ]*\([^()\n]{1,40}\)/;

function isKnownPlace(token: Token, lexicon: Lexicon): boolean {
  return lexicon.places.has(token.key) || lexicon.territories.has(token.key);
}

/** Reads a place name from token `i`: capitalised words and connectors, then an optional bracket. */
function readPlace(text: string, tokens: Token[], i: number): { start: number; end: number } {
  let last = i;
  for (let j = i + 1; j < tokens.length && j - i < MAX_PLACE_WORDS; j++) {
    const token = tokens[j];
    if (!onlySpacesBetween(text, tokens[j - 1].end, token.start)) break;
    if (token.capitalized) last = j;
    else if (CONNECTORS.has(token.key)) {
      const next = tokens[j + 1];
      if (!next || !next.capitalized || !onlySpacesBetween(text, token.end, next.start)) break;
    } else break;
  }
  let end = tokens[last].end;
  const bracket = PARENTHESIS.exec(text.slice(end, end + 48));
  if (bracket) end += bracket[0].length;
  return { start: tokens[i].start, end };
}

function place(text: string, span: { start: number; end: number }): Candidate {
  return { id: `LIEU-${span.start}-${span.end}`, type: 'LIEU', start: span.start, end: span.end, value: text.slice(span.start, span.end), priority: PLACE_PRIORITY };
}

export function placeCandidates(text: string, tokens: Token[], lexicon: Lexicon): Candidate[] {
  const found: Candidate[] = [];

  for (const match of text.matchAll(PLACE_FORMULA)) {
    const after = match.index + match[0].length;
    const i = tokenAt(tokens, after);
    if (i >= 0 && tokens[i].start === after && tokens[i].capitalized) found.push(place(text, readPlace(text, tokens, i)));
  }

  for (const match of text.matchAll(DATELINE)) {
    const start = match.index + match[0].indexOf(match[1]);
    found.push(place(text, { start, end: start + match[1].length }));
  }

  tokens.forEach((token, i) => {
    if (!token.capitalized || !isKnownPlace(token, lexicon)) return;
    const previous = tokens[i - 1];
    const ordinaryWord = isCommonWord(lexicon, token.key);
    const afterPreposition =
      !!previous &&
      !previous.capitalized &&
      PREPOSITIONS.has(previous.key) &&
      // « de » and « d' » also introduce companies and things (« le devis d'Orange »): only for unambiguous names.
      (!ordinaryWord || (previous.key !== 'de' && previous.key !== 'd')) &&
      /^[ 	 '’]+$/.test(text.slice(previous.end, token.start));
    const unambiguous = !ordinaryWord && !token.sentenceStart;
    if (afterPreposition || unambiguous || (token.allCaps && !ordinaryWord)) {
      found.push(place(text, readPlace(text, tokens, i)));
    }
  });
  return found;
}
