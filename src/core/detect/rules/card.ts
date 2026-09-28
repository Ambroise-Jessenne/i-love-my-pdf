import type { Rule } from '../types';

export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const cardRule: Rule = {
  type: 'CARTE_BANCAIRE',
  priority: 60,
  pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
  validate: (match) => {
    const digits = match.replace(/\D/g, '');
    return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits);
  },
};
