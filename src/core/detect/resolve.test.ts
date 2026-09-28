import { describe, expect, it } from 'vitest';
import type { PiiType } from './types';
import { resolveOverlaps, type Candidate } from './resolve';

const c = (type: PiiType, start: number, end: number, priority = 0): Candidate => ({
  id: `${type}-${start}-${end}`,
  type,
  start,
  end,
  value: 'x'.repeat(end - start),
  priority,
});

describe('resolveOverlaps', () => {
  it('keeps non-overlapping candidates sorted by position', () => {
    const result = resolveOverlaps([c('EMAIL', 10, 20), c('IP', 0, 5)]);
    expect(result.map((d) => d.id)).toEqual(['IP-0-5', 'EMAIL-10-20']);
  });

  it('keeps the longest candidate when two overlap', () => {
    const result = resolveOverlaps([c('CARTE_BANCAIRE', 5, 21, 99), c('IBAN', 0, 27, 1)]);
    expect(result.map((d) => d.id)).toEqual(['IBAN-0-27']);
  });

  it('uses priority when overlapping candidates have the same length', () => {
    const result = resolveOverlaps([c('CARTE_BANCAIRE', 0, 15, 60), c('NIR', 0, 15, 70)]);
    expect(result.map((d) => d.id)).toEqual(['NIR-0-15']);
  });

  it('keeps candidates that only touch each other', () => {
    const result = resolveOverlaps([c('EMAIL', 0, 5), c('URL', 5, 9)]);
    expect(result).toHaveLength(2);
  });

  it('removes the priority field from the output', () => {
    const [only] = resolveOverlaps([c('EMAIL', 0, 5)]);
    expect(only).toEqual({ id: 'EMAIL-0-5', type: 'EMAIL', start: 0, end: 5, value: 'xxxxx' });
  });
});
