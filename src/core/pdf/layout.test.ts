import { describe, expect, it } from 'vitest';
import { boxesFor, buildPdfText, type PdfPageText, type PdfTextItem } from './layout';

const item = (str: string, left: number, top: number, extra: Partial<PdfTextItem> = {}): PdfTextItem => ({
  str,
  left,
  top,
  width: str.length * 10,
  height: 20,
  hasEOL: false,
  horizontal: true,
  ...extra,
});

const pages: PdfPageText[] = [
  { width: 600, height: 800, items: [item('Mail : a@b.io', 100, 50, { hasEOL: true }), item('Fin', 100, 80)] },
  { width: 600, height: 800, items: [item('06 12 ', 10, 10), item('34 56 78', 70, 10)] },
];
const length = (s: string) => s.length;

describe('buildPdfText', () => {
  it('joins items, adds line ends and separates pages', () => {
    const { text, spans } = buildPdfText(pages);
    expect(text).toBe('Mail : a@b.io\nFin\n06 12 34 56 78\n');
    expect(spans).toEqual([
      { page: 0, item: 0, start: 0, end: 13 },
      { page: 0, item: 1, start: 14, end: 17 },
      { page: 1, item: 0, start: 18, end: 24 },
      { page: 1, item: 1, start: 24, end: 32 },
    ]);
  });
});

describe('boxesFor', () => {
  const { text, spans } = buildPdfText(pages);

  it('covers the characters of a detection inside an item, with a safety margin', () => {
    const start = text.indexOf('a@b.io');
    const [box] = boxesFor([{ start, end: start + 6 }], pages, spans, length);
    // Characters 7 to 13 of a 130-wide item start at x = 170 and end at x = 230; margin = 0.15 × 20 = 3.
    expect(box).toEqual({ page: 0, x: 167, y: 47, width: 66, height: 26 });
  });

  it('splits a detection that spans two items into two boxes on the right page', () => {
    const start = text.indexOf('06 12');
    const boxes = boxesFor([{ start, end: start + 14 }], pages, spans, length);
    expect(boxes.map((b) => [b.page, b.x])).toEqual([
      [1, 7],
      [1, 67],
    ]);
  });

  it('covers the whole item when the text is not horizontal', () => {
    const rotated: PdfPageText[] = [{ width: 600, height: 800, items: [item('a@b.io', 5, 5, { horizontal: false, width: 20, height: 60 })] }];
    const built = buildPdfText(rotated);
    const [box] = boxesFor([{ start: 2, end: 3 }], rotated, built.spans, length);
    expect(box).toEqual({ page: 0, x: -4, y: -4, width: 38, height: 78 });
  });

  it('returns nothing for ranges outside the text items', () => {
    const newline = text.indexOf('\n');
    expect(boxesFor([{ start: newline, end: newline + 1 }], pages, spans, length)).toEqual([]);
  });
});
