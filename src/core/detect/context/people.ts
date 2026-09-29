import type { Candidate } from '../resolve';
import { isCommonWord, type Lexicon } from '../lexicon';
import { onlySpacesBetween, tokenAt, type Token } from '../tokens';
import { ACRONYMS } from './acronyms';

export const PERSON_PRIORITY = 35;
const MAX_NAME_WORDS = 5;

const CIVILITIES = new Set([
  'm', 'mr', 'mme', 'mlle', 'madame', 'monsieur', 'mademoiselle', 'dr', 'docteur', 'me', 'maitre', 'pr', 'professeur',
  'mrs', 'ms', 'miss', 'mister', 'sir',
]);
/** Lower-case words allowed inside a name: « Charles de Gaulle », « Ludwig van Beethoven ». */
export const PARTICLES = new Set(['de', 'du', 'des', 'd', 'le', 'la', 'van', 'von', 'der', 'den', 'di', 'da', 'del', 'dos', 'ben', 'bin', 'el', 'al', 'ibn']);

/** Very frequent small words that also appear in the first-name list. */
const FUNCTION_WORDS = new Set([
  'les', 'des', 'une', 'aux', 'par', 'pour', 'sur', 'sous', 'avec', 'sans', 'mais', 'donc', 'car', 'est', 'son', 'sa', 'ses', 'mon', 'ton', 'nos', 'vos', 'leur',
  'the', 'and', 'for', 'with', 'from', 'not', 'but', 'you', 'all', 'any', 'can', 'may', 'will', 'his', 'her', 'our',
]);

// « Nom : Dupont », « Signataire : Estelle Iacona »…: whatever follows is a person's name.
const NAME_LABEL =
  /(?<![\p{L}])(?:nom(?: de famille| d['’]usage| de naissance| marital| et pr[ée]noms?)?|pr[ée]noms?|signataire|sign[ée] par|destinataire|exp[ée]dit(?:eur|rice)|titulaire|[ée]l[èe]ve|[ée]tudiante?|patiente?|salari[ée]e?|b[ée]n[ée]ficiaire|assur[ée]e?|locataire|bailleu(?:r|resse)|propri[ée]taire|interlocut(?:eur|rice)|repr[ée]sentante?(?: l[ée]gale?)?|responsable|conseill[èe]re?|m[ée]decin(?: traitant)?|praticienn?e?|conjointe?|p[èe]re|m[èe]re|tut(?:eur|rice)|[àa] l['’]attention de|full name|first name|last name|surname|name)\s*:[ \t ]*/giu;

function person(text: string, from: Token, to: Token): Candidate {
  return { id: `PERSONNE-${from.start}-${to.end}`, type: 'PERSONNE', start: from.start, end: to.end, value: text.slice(from.start, to.end), priority: PERSON_PRIORITY };
}

/** A word that can be part of a person's name here. */
function nameLike(token: Token, lexicon: Lexicon): boolean {
  if (!token.capitalized || token.key.length < 2 || ACRONYMS.has(token.key)) return false;
  if (!isCommonWord(lexicon, token.key)) return true;
  const known = lexicon.surnames.has(token.key) || lexicon.firstNames.has(token.key);
  // A known name that is also an ordinary word (Lombard, Pierre) only counts in capitals or mid-sentence.
  return known && (token.allCaps || !token.sentenceStart);
}

/** Extends a name forwards from `index` over neighbouring name-like words and particles. Returns the last index. */
function extendForward(text: string, tokens: Token[], index: number, lexicon: Lexicon, strictFirst: boolean): number {
  let last = index;
  for (let j = index + 1; j < tokens.length && j - index < MAX_NAME_WORDS; j++) {
    const token = tokens[j];
    if (!onlySpacesBetween(text, tokens[j - 1].end, token.start)) break;
    if (PARTICLES.has(token.key) && !token.capitalized) {
      const next = tokens[j + 1];
      if (next && onlySpacesBetween(text, token.end, next.start) && nameLike(next, lexicon)) continue;
      break;
    }
    // Right after a first name, any capitalised word is taken as the surname (Paul Grant, Marie Blanc).
    const surnameAfterFirstName = strictFirst && j === last + 1 && token.capitalized && !token.sentenceStart;
    if (!nameLike(token, lexicon) && !surnameAfterFirstName) break;
    last = j;
  }
  return last;
}

function extendBackward(text: string, tokens: Token[], index: number, lexicon: Lexicon): number {
  let first = index;
  for (let j = index - 1; j >= 0 && index - j < MAX_NAME_WORDS; j--) {
    const token = tokens[j];
    if (!onlySpacesBetween(text, token.end, tokens[j + 1].start)) break;
    if (CIVILITIES.has(token.key) || !nameLike(token, lexicon)) break;
    first = j;
  }
  return first;
}

export function peopleCandidates(text: string, tokens: Token[], lexicon: Lexicon): Candidate[] {
  const found: Candidate[] = [];

  tokens.forEach((token, i) => {
    // Civility: Madame Dupont, M. Jean Martin, Dr House — the civility itself stays visible.
    if (token.capitalized && CIVILITIES.has(token.key)) {
      const next = tokens[i + 1];
      const gap = next ? text.slice(token.end, next.start) : '';
      if (next && /^\.?[ \t ]+$/.test(gap) && next.capitalized && next.key.length >= 2) {
        found.push(person(text, next, tokens[extendForward(text, tokens, i + 1, lexicon, true)]));
      }
      return;
    }
    // Known first name: Estelle IACONA, LOMBARD ALICIA, Jean-Pierre Martin. The official list also holds
    // « De », « Le » or « Or »: very short entries and function words never start a name on their own.
    if (!token.capitalized || !lexicon.firstNames.has(token.key)) return;
    if (token.key.length < 3 || PARTICLES.has(token.key) || FUNCTION_WORDS.has(token.key) || ACRONYMS.has(token.key)) return;
    const next = tokens[i + 1];
    const followedByName = !!next && onlySpacesBetween(text, token.end, next.start) && nameLike(next, lexicon);
    const previous = tokens[i - 1];
    const precededByName = !!previous && onlySpacesBetween(text, previous.end, token.start) && previous.allCaps && nameLike(previous, lexicon);
    const ordinaryWord = isCommonWord(lexicon, token.key);
    if (ordinaryWord && token.sentenceStart && !token.allCaps && !followedByName) return; // « Rose était… »
    if (ordinaryWord && !followedByName && !precededByName && !token.allCaps && token.sentenceStart) return;
    const first = extendBackward(text, tokens, i, lexicon);
    const last = extendForward(text, tokens, i, lexicon, true);
    found.push(person(text, tokens[first], tokens[last]));
  });

  // Value after a label: « Nom : Dupont », « Signataire : Estelle Iacona ».
  for (const match of text.matchAll(NAME_LABEL)) {
    const valueStart = match.index + match[0].length;
    const i = tokenAt(tokens, valueStart);
    if (i < 0 || tokens[i].start !== valueStart || !tokens[i].capitalized) continue;
    let last = i;
    for (let j = i + 1; j < tokens.length && j - i < MAX_NAME_WORDS; j++) {
      const token = tokens[j];
      if (!onlySpacesBetween(text, tokens[j - 1].end, token.start)) break;
      if (token.capitalized) last = j;
      else if (!PARTICLES.has(token.key)) break;
    }
    found.push(person(text, tokens[i], tokens[last]));
  }
  return found;
}
