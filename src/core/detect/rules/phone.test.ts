import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { phoneRule } from './phone';

const values = (text: string) => runRules(text, [phoneRule]).map((d) => d.value);

describe('phoneRule', () => {
  it.each([
    ['Appelez le 06 12 34 56 78 demain', '06 12 34 56 78'],
    ['Tél : +33 6 12 34 56 78', '+33 6 12 34 56 78'],
    ['Fixe 01.23.45.67.89', '01.23.45.67.89'],
    ['Portable 0612345678', '0612345678'],
    ['Depuis la Belgique : 0033 1 23 45 67 89', '0033 1 23 45 67 89'],
    ['Londres : +44 20 7946 0958', '+44 20 7946 0958'],
    ['San Francisco : +1 415 555 2671', '+1 415 555 2671'],
  ])('finds the number in %j', (text, expected) => {
    expect(values(text)).toEqual([expected]);
  });

  it('ignores short numbers', () => {
    expect(values('Commande 12345, lot 06 12')).toEqual([]);
  });
});
