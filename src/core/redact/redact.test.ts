import { describe, expect, it } from 'vitest';
import type { Detection, PiiType } from '../detect/types';
import { detect } from '../detect/detect';
import { addManual, redact } from './redact';

const at = (text: string, type: PiiType, value: string, from = 0): Detection => {
  const start = text.indexOf(value, from);
  return { id: `${type}-${start}`, type, start, end: start + value.length, value };
};

describe('redact', () => {
  it('replaces detections with numbered labels per type', () => {
    const text = 'a@x.fr puis b@x.fr et 06 12 34 56 78';
    const detections = [at(text, 'EMAIL', 'a@x.fr'), at(text, 'EMAIL', 'b@x.fr'), at(text, 'TELEPHONE', '06 12 34 56 78')];
    expect(redact(text, detections)).toBe('[EMAIL_1] puis [EMAIL_2] et [TELEPHONE_1]');
  });

  it('gives the same label to the same value', () => {
    const text = 'A@x.fr, a@x.fr, 06 12 34 56 78 et 0612345678';
    const detections = [
      at(text, 'EMAIL', 'A@x.fr'),
      at(text, 'EMAIL', 'a@x.fr'),
      at(text, 'TELEPHONE', '06 12 34 56 78'),
      at(text, 'TELEPHONE', '0612345678'),
    ];
    expect(redact(text, detections)).toBe('[EMAIL_1], [EMAIL_1], [TELEPHONE_1] et [TELEPHONE_1]');
  });

  it('returns the text unchanged without detections', () => {
    expect(redact('rien à masquer', [])).toBe('rien à masquer');
  });

  it('also masks the tail of a detection that overlaps an earlier one', () => {
    const text = 'abcdefghij';
    const first: Detection = { id: '1', type: 'MASQUE', start: 0, end: 6, value: 'abcdef' };
    const second: Detection = { id: '2', type: 'MASQUE', start: 4, end: 8, value: 'efgh' };
    expect(redact(text, [second, first])).toBe('[MASQUE_1]ij');
  });

  it('leaves none of the detected values in the output', () => {
    const text = 'Mail jean@exemple.fr, IBAN FR76 3000 6000 0112 3456 7890 189, tel 06 12 34 56 78.';
    const detections = detect(text);
    const output = redact(text, detections);
    for (const d of detections) expect(output).not.toContain(d.value);
    expect(output).toBe('Mail [EMAIL_1], IBAN [IBAN_1], tel [TELEPHONE_1].');
  });
});

describe('addManual', () => {
  const text = 'Rendez-vous avec Marie Curie demain';

  it('adds a MASQUE detection for the selected range', () => {
    const start = text.indexOf('Marie');
    const result = addManual([], text, start, start + 'Marie Curie'.length);
    expect(result).toEqual([
      { id: `MASQUE-${start}-${start + 11}`, type: 'MASQUE', start, end: start + 11, value: 'Marie Curie' },
    ]);
  });

  it('accepts a reversed selection', () => {
    const start = text.indexOf('Marie');
    const [manual] = addManual([], text, start + 5, start);
    expect(manual.value).toBe('Marie');
  });

  it('ignores an empty selection', () => {
    expect(addManual([], text, 4, 4)).toEqual([]);
  });

  it('absorbs detections it overlaps', () => {
    const existing: Detection = { id: 'x', type: 'DATE', start: 5, end: 10, value: text.slice(5, 10) };
    const result = addManual([existing], text, 8, 15);
    expect(result).toEqual([
      { id: 'MASQUE-5-15', type: 'MASQUE', start: 5, end: 15, value: text.slice(5, 15) },
    ]);
  });
});
