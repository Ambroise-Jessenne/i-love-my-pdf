import type { Rule } from '../types';

export function isValidNir(raw: string): boolean {
  const nir = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[12]\d{4}(?:\d{2}|2A|2B)\d{8}$/.test(nir)) return false;
  // Corsican départements 2A/2B are replaced by 19/18 to compute the key.
  const body = nir.slice(0, 13).replace('2A', '19').replace('2B', '18');
  let remainder = 0;
  for (const digit of body) remainder = (remainder * 10 + Number(digit)) % 97;
  return 97 - remainder === Number(nir.slice(13));
}

export const nirRule: Rule = {
  type: 'NIR',
  priority: 70,
  pattern: /\b[12] ?\d{2} ?\d{2} ?(?:\d{2}|2[AB]) ?\d{3} ?\d{3} ?\d{2}\b/g,
  validate: isValidNir,
};
