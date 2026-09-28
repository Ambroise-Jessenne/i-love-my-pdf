import { describe, expect, it } from 'vitest';
import type { PiiType } from './types';
import { detect } from './detect';

const CORPUS = [
  'Bonjour, je suis joignable à jean.dupont@exemple.fr ou au 06 12 34 56 78.',
  'Mon collègue : +44 20 7946 0958.',
  'IBAN : FR76 3000 6000 0112 3456 7890 189.',
  'N° de sécurité sociale : 1 85 05 78 006 084 91.',
  'Carte : 4111 1111 1111 1111.',
  'Né le 12/03/1985, embauché le 1er janvier 2010.',
  'Adresse : 12 rue de la Paix, 75002 Paris.',
  'Serveur : 192.168.1.42, site : https://exemple.fr/contact.',
].join('\n');

const EXPECTED: Array<{ type: PiiType; value: string }> = [
  { type: 'EMAIL', value: 'jean.dupont@exemple.fr' },
  { type: 'TELEPHONE', value: '06 12 34 56 78' },
  { type: 'TELEPHONE', value: '+44 20 7946 0958' },
  { type: 'IBAN', value: 'FR76 3000 6000 0112 3456 7890 189' },
  { type: 'NIR', value: '1 85 05 78 006 084 91' },
  { type: 'CARTE_BANCAIRE', value: '4111 1111 1111 1111' },
  { type: 'DATE', value: '12/03/1985' },
  { type: 'DATE', value: '1er janvier 2010' },
  { type: 'ADRESSE', value: '12 rue de la Paix, 75002 Paris' },
  { type: 'IP', value: '192.168.1.42' },
  { type: 'URL', value: 'https://exemple.fr/contact' },
];

const PATHOLOGICAL: Array<[string, string]> = [
  ['letters', 'a'.repeat(200_000)],
  ['digits', '1'.repeat(200_000)],
  ['digits and spaces', '12 '.repeat(70_000)],
  ['dotted token', 'a.b-c_d'.repeat(30_000)],
  ['capitals', 'ABCD '.repeat(40_000)],
  ['unfinished addresses', '12 rue '.repeat(30_000)],
];

describe('detect on the synthetic corpus', () => {
  const found = detect(CORPUS).map(({ type, value }) => ({ type, value }));

  it.each(EXPECTED)('finds $type $value', (expected) => {
    expect(found).toContainEqual(expected);
  });

  it('finds nothing else', () => {
    expect(found).toHaveLength(EXPECTED.length);
  });
});

describe('detect performance', () => {
  it.each(PATHOLOGICAL)('stays fast on %s', (_, text) => {
    const started = performance.now();
    detect(text);
    expect(performance.now() - started).toBeLessThan(1500);
  });
});
