import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { ibanRule, isValidIban } from './iban';

const values = (text: string) => runRules(text, [ibanRule]).map((d) => d.value);

describe('isValidIban', () => {
  it('accepts valid IBANs', () => {
    expect(isValidIban('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
    expect(isValidIban('DE89370400440532013000')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(isValidIban('FR76 3000 6000 0112 3456 7890 188')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidIban('FR76')).toBe(false);
  });
});

describe('ibanRule', () => {
  it('finds a spaced IBAN and stops before the next word', () => {
    expect(values('IBAN : FR76 3000 6000 0112 3456 7890 189 EUR')).toEqual(['FR76 3000 6000 0112 3456 7890 189']);
  });

  it('finds a compact IBAN', () => {
    expect(values('iban FR7630006000011234567890189.')).toEqual(['FR7630006000011234567890189']);
  });

  it('finds a German IBAN', () => {
    expect(values('Konto DE89 3704 0044 0532 0130 00')).toEqual(['DE89 3704 0044 0532 0130 00']);
  });

  it('ignores an IBAN with a wrong check digit', () => {
    expect(values('FR76 3000 6000 0112 3456 7890 188')).toEqual([]);
  });
});
