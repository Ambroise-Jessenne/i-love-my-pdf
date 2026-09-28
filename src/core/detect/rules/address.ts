import type { Rule } from '../types';

const NUMBER = '\\b\\d{1,4}(?: ?(?:bis|ter|BIS|TER))?,? ';
const STREET_TYPE =
  '(?:[Rr]ue|[Aa]venue|[Aa]v\\.|[Bb]oulevard|[Bb]d|[Pp]lace|[Cc]hemin|[Aa]ll[ée]e|[Ii]mpasse|[Rr]oute|[Qq]uai|[Cc]ours|[Ss]quare)';
const STREET_TYPE_CAPS = '(?:RUE|AVENUE|AV\\.|BOULEVARD|BD|PLACE|CHEMIN|ALL[ÉE]E|IMPASSE|ROUTE|QUAI|COURS|SQUARE)';
const WORD = "[A-Za-zÀ-ÿ''-]+";
const WORD_CAPS = "[A-ZÀ-Þ''-]+";
const CITY = `[A-ZÀ-Þ]${WORD}(?: [A-ZÀ-Þ]${WORD})*`;
const CITY_CAPS = `${WORD_CAPS}(?: ${WORD_CAPS})*`;

const address = (source: string): Rule => ({
  type: 'ADRESSE',
  priority: 90,
  pattern: new RegExp(source, 'g'),
});

export const addressRules: Rule[] = [
  // Full address: street, postcode and city.
  address(`${NUMBER}${STREET_TYPE} [^\\n,]{2,60}?,? \\d{5} ${CITY}`),
  address(`${NUMBER}${STREET_TYPE_CAPS} [^\\n,]{2,60}?,? \\d{5} ${CITY_CAPS}`),
  // Street only: number, street type and up to four words.
  address(`${NUMBER}${STREET_TYPE} ${WORD}(?: ${WORD}){0,3}`),
  address(`${NUMBER}${STREET_TYPE_CAPS} ${WORD_CAPS}(?: ${WORD_CAPS}){0,3}`),
];
