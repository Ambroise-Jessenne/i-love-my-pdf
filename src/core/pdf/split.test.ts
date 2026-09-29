import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { zipFiles } from '../zip';
import { mergePdfs } from './merge';
import { extractPages, groupLabel, parseRanges, splitPdf } from './split';

/** A PDF whose page n is (100 + n) points wide, so pages can be recognised after copying. */
async function makePdf(pages: number, offset = 0): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (let n = 1; n <= pages; n++) pdf.addPage([100 + offset + n, 200]);
  return pdf.save();
}

async function widths(bytes: Uint8Array): Promise<number[]> {
  return (await PDFDocument.load(bytes)).getPages().map((page) => page.getWidth());
}

describe('mergePdfs', () => {
  it('puts every page of every file in order', async () => {
    const merged = await mergePdfs([await makePdf(2), await makePdf(3, 10)]);
    expect(await widths(merged)).toEqual([101, 102, 111, 112, 113]);
  });
});

describe('extractPages and splitPdf', () => {
  it('extracts the chosen pages in the given order', async () => {
    expect(await widths(await extractPages(await makePdf(5), [1, 3, 4]))).toEqual([102, 104, 105]);
  });

  it('makes one file per group', async () => {
    const parts = await splitPdf(await makePdf(5), [[0, 1], [2], [3, 4]]);
    expect(await Promise.all(parts.map(widths))).toEqual([[101, 102], [103], [104, 105]]);
  });
});

describe('parseRanges', () => {
  it('reads ranges and single pages', () => {
    expect(parseRanges('1-3, 4 – 6 ; 7', 7)).toEqual({ groups: [[0, 1, 2], [3, 4, 5], [6]] });
  });

  it('reports empty input, bad syntax and pages out of the document', () => {
    expect(parseRanges(' , ', 5)).toEqual({ error: 'empty' });
    expect(parseRanges('1-a', 5)).toEqual({ error: 'syntax' });
    expect(parseRanges('4-9', 5)).toEqual({ error: 'bounds' });
    expect(parseRanges('3-2', 5)).toEqual({ error: 'bounds' });
    expect(parseRanges('0', 5)).toEqual({ error: 'bounds' });
  });
});

describe('groupLabel and zipFiles', () => {
  it('names groups and packs files into a readable ZIP', () => {
    expect(groupLabel([0, 1, 2])).toBe('1-3');
    expect(groupLabel([3])).toBe('p4');
    const zip = unzipSync(zipFiles([{ name: 'a.pdf', bytes: new Uint8Array([1, 2]) }]));
    expect([...zip['a.pdf']]).toEqual([1, 2]);
  });
});
