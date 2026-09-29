import type { Detection, Rule } from './types';
import { mergeOverlaps, resolveOverlaps, type Candidate } from './resolve';
import { RULES } from './rules';
import type { Lexicon } from './lexicon';
import { tokenize } from './tokens';
import { labelledIdentifiers, strictIdentifiers } from './context/identifiers';
import { peopleCandidates } from './context/people';
import { placeCandidates } from './context/places';
import { strictProperNouns } from './context/strict';

export interface DetectOptions {
  /** Word lists: enables people, places and identifiers. Without them, only the format rules run. */
  lexicon?: Lexicon;
  /** Also mask every unknown proper noun, long number and code. */
  strict?: boolean;
}

function ruleCandidates(text: string, rules: Rule[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      const value = match[0];
      if (rule.validate && !rule.validate(value)) continue;
      const start = match.index ?? 0;
      const end = start + value.length;
      candidates.push({ id: `${rule.type}-${start}-${end}`, type: rule.type, start, end, value, priority: rule.priority });
    }
  }
  return candidates;
}

export function runRules(text: string, rules: Rule[]): Detection[] {
  return resolveOverlaps(ruleCandidates(text, rules));
}

export function detect(text: string, options: DetectOptions = {}): Detection[] {
  const { lexicon, strict = false } = options;
  if (!lexicon) return runRules(text, RULES);

  const tokens = tokenize(text);
  const candidates = [
    ...ruleCandidates(text, RULES),
    ...labelledIdentifiers(text),
    ...peopleCandidates(text, tokens, lexicon),
    ...placeCandidates(text, tokens, lexicon),
  ];
  if (strict) candidates.push(...strictIdentifiers(text), ...strictProperNouns(text, tokens, lexicon));
  // Overlapping detections are merged rather than dropped, so no part of any of them is left visible.
  return mergeOverlaps(text, candidates);
}
