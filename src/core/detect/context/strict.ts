import type { Candidate } from '../resolve';
import { isCommonWord, type Lexicon } from '../lexicon';
import { onlySpacesBetween, type Token } from '../tokens';
import { ACRONYMS } from './acronyms';

export const PROPER_NOUN_PRIORITY = 10;

/** Strict mode: any capitalised word that is neither an ordinary word nor a usual acronym is taken for a name. */
export function strictProperNouns(text: string, tokens: Token[], lexicon: Lexicon): Candidate[] {
  const found: Candidate[] = [];
  let run: { start: number; end: number } | null = null;
  const flush = () => {
    if (run) found.push({ id: `NOM_PROPRE-${run.start}-${run.end}`, type: 'NOM_PROPRE', start: run.start, end: run.end, value: text.slice(run.start, run.end), priority: PROPER_NOUN_PRIORITY });
    run = null;
  };
  tokens.forEach((token, i) => {
    const flagged = token.capitalized && token.key.length >= 2 && !ACRONYMS.has(token.key) && !isCommonWord(lexicon, token.key);
    if (!flagged) return flush();
    if (run && onlySpacesBetween(text, tokens[i - 1].end, token.start) && run.end === tokens[i - 1].end) run.end = token.end;
    else {
      flush();
      run = { start: token.start, end: token.end };
    }
  });
  flush();
  return found;
}
