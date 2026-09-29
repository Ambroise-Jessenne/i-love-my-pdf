import type { Candidate } from '../resolve';
import { isCommonWord, type Lexicon } from '../lexicon';
import { onlySpacesBetween, type Token } from '../tokens';

export const PROPER_NOUN_PRIORITY = 10;

/** Usual acronyms and abbreviations, written in capitals but carrying no personal information. */
const ACRONYMS = new Set([
  'pdf', 'docx', 'txt', 'iban', 'bic', 'rib', 'tva', 'ttc', 'ht', 'siret', 'siren', 'ape', 'naf', 'rcs', 'sas', 'sasu', 'sarl', 'eurl', 'sa', 'sci', 'scop',
  'cdi', 'cdd', 'rh', 'drh', 'pdg', 'dg', 'ceo', 'cto', 'cfo', 'ia', 'ai', 'api', 'url', 'sms', 'mms', 'faq', 'rgpd', 'gdpr', 'cnil', 'ue', 'eu', 'usa', 'uk',
  'ok', 'nb', 'ps', 'cv', 'pme', 'tpe', 'eti', 'sncf', 'ratp', 'edf', 'urssaf', 'caf', 'cpam', 'mdph', 'ars', 'chu', 'chr', 'ehpad', 'samu', 'smic', 'rsa',
  'apl', 'bac', 'bts', 'dut', 'but', 'du', 'dea', 'dess', 'licence', 'master', 'phd', 'mba', 'ine', 'nir', 'rdv', 'tel', 'fax', 'cedex', 'bp', 'cs', 'zi', 'za',
  'zac', 'hlm', 'id', 'n', 'no', 'num', 'ref', 'mr', 'mme', 'mlle', 'dr', 'pr', 'st', 'ste', 'cie', 'etc', 'am', 'pm', 'utc', 'gmt', 'eur', 'usd', 'gbp', 'chf',
]);

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
