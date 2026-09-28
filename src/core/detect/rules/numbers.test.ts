import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { isValidNir, nirRule } from './nir';
import { cardRule, passesLuhn } from './card';

describe('isValidNir', () => {
  it('accepts a NIR whose key matches', () => {
    expect(isValidNir('1 85 05 78 006 084 91')).toBe(true);
  });

  it('rejects a wrong key', () => {
    expect(isValidNir('1 85 05 78 006 084 36')).toBe(false);
  });
});

describe('nirRule', () => {
  const values = (text: string) => runRules(text, [nirRule]).map((d) => d.value);

  it('finds a spaced NIR', () => {
    expect(values('N° SS : 1 85 05 78 006 084 91.')).toEqual(['1 85 05 78 006 084 91']);
  });

  it('finds a compact NIR', () => {
    expect(values('nir 185057800608491')).toEqual(['185057800608491']);
  });

  it('ignores a NIR with a wrong key', () => {
    expect(values('1 85 05 78 006 084 36')).toEqual([]);
  });
});

describe('passesLuhn', () => {
  it('accepts a valid card number', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
  });

  it('rejects an invalid card number', () => {
    expect(passesLuhn('4111111111111112')).toBe(false);
  });
});

describe('cardRule', () => {
  const values = (text: string) => runRules(text, [cardRule]).map((d) => d.value);

  it.each([
    ['Carte 4111 1111 1111 1111 exp', '4111 1111 1111 1111'],
    ['Carte 4111-1111-1111-1111', '4111-1111-1111-1111'],
    ['MC 5555555555554444', '5555555555554444'],
  ])('finds the card in %j', (text, expected) => {
    expect(values(text)).toEqual([expected]);
  });

  it('ignores a number failing the Luhn check', () => {
    expect(values('4111 1111 1111 1112')).toEqual([]);
  });
});
