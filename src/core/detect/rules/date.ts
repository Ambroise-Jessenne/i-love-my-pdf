import type { Rule } from '../types';

const DAY = '(?:0?[1-9]|[12]\\d|3[01])';
const MONTH = '(?:0?[1-9]|1[0-2])';
const YEAR = '(?:19|20)\\d{2}';
const FR_MONTHS =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const EN_MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';

const date = (source: string, flags = 'g'): Rule => ({
  type: 'DATE',
  priority: 30,
  pattern: new RegExp(source, flags),
});

export const dateRules: Rule[] = [
  date(`\\b${DAY}[/.-]${MONTH}[/.-]${YEAR}\\b`),
  date(`\\b${YEAR}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b`),
  date(`\\b(?:1er|${DAY}) (?:${FR_MONTHS}) ${YEAR}\\b`, 'gi'),
  date(`\\b(?:${EN_MONTHS}) ${DAY}(?:st|nd|rd|th)?,? ${YEAR}\\b`, 'gi'),
];
