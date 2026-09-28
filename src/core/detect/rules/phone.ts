import type { Rule } from '../types';

const FRENCH = String.raw`(?<![\w+])(?:(?:\+|00)33[\s.-]?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}(?!\d)`;
const INTERNATIONAL = String.raw`(?<![\w+])\+(?!33)[1-9]\d{0,2}(?:[\s.-]?\d{2,4}){2,5}(?!\d)`;

export const phoneRule: Rule = {
  type: 'TELEPHONE',
  priority: 40,
  pattern: new RegExp(`${FRENCH}|${INTERNATIONAL}`, 'g'),
};
