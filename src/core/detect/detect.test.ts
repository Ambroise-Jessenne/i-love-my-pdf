import { describe, expect, it } from 'vitest';
import type { Rule } from './types';
import { runRules } from './detect';

describe('runRules', () => {
  const digits: Rule = {
    type: 'IP',
    priority: 1,
    pattern: /\d+/g,
    validate: (m) => m !== '0',
  };

  it('returns one detection per validated match, with positions', () => {
    expect(runRules('a 12 b 0 c 345', [digits])).toEqual([
      { id: 'IP-2-4', type: 'IP', start: 2, end: 4, value: '12' },
      { id: 'IP-11-14', type: 'IP', start: 11, end: 14, value: '345' },
    ]);
  });

  it('returns nothing for an empty text', () => {
    expect(runRules('', [digits])).toEqual([]);
  });
});
