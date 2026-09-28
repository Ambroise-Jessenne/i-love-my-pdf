import { describe, expect, it } from 'vitest';
import type { Detection, PiiType } from '../detect/types';
import { planReplacements } from './labels';

const d = (id: string, type: PiiType, start: number, value: string): Detection => ({
  id,
  type,
  start,
  end: start + value.length,
  value,
});

describe('planReplacements', () => {
  it('numbers labels per type in reading order', () => {
    const plan = planReplacements([d('b', 'EMAIL', 20, 'b@x.fr'), d('a', 'EMAIL', 0, 'a@x.fr'), d('t', 'IP', 10, '1.2.3.4')]);
    expect(plan).toEqual([
      { start: 0, end: 6, label: '[EMAIL_1]' },
      { start: 10, end: 17, label: '[IP_1]' },
      { start: 20, end: 26, label: '[EMAIL_2]' },
    ]);
  });

  it('gives the same label to the same normalised value', () => {
    const plan = planReplacements([d('1', 'TELEPHONE', 0, '06 12 34 56 78'), d('2', 'TELEPHONE', 20, '0612345678')]);
    expect(plan.map((r) => r.label)).toEqual(['[TELEPHONE_1]', '[TELEPHONE_1]']);
  });

  it('absorbs the tail of a detection that overlaps the previous one', () => {
    const plan = planReplacements([d('2', 'MASQUE', 4, 'efgh'), d('1', 'MASQUE', 0, 'abcdef')]);
    expect(plan).toEqual([{ start: 0, end: 8, label: '[MASQUE_1]' }]);
  });

  it('ignores a detection contained in the previous one', () => {
    const plan = planReplacements([d('1', 'ADRESSE', 0, '12 rue de la Paix'), d('2', 'DATE', 3, 'rue')]);
    expect(plan).toEqual([{ start: 0, end: 17, label: '[ADRESSE_1]' }]);
  });
});
