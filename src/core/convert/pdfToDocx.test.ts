import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { docxText } from '../docx/docx';
import { layoutPdf, type StyledItem, type StyledPage } from './pdfLayout';
import { blocksToDocx } from './pdfToDocx';

const item = (str: string, x: number, y: number, extra: Partial<StyledItem> = {}): StyledItem => ({
  str,
  x,
  y,
  width: str.length * 6,
  size: 12,
  bold: false,
  italic: false,
  ...extra,
});

const pages: StyledPage[] = [
  {
    width: 595,
    height: 842,
    items: [
      item('Rapport annuel', 60, 80, { size: 24, bold: true }),
      item('Ce document présente les résul-', 60, 120),
      item('tats de l’année.', 60, 135),
      item('Une phrase en', 60, 150),
      item('gras', 150, 150, { bold: true }),
      item('.', 175, 150),
      item('Deuxième paragraphe.', 60, 190),
      item('Contexte', 60, 230, { size: 16 }),
    ],
  },
  { width: 595, height: 842, items: [item('Page deux.', 60, 80)] },
];

describe('layoutPdf', () => {
  it('rebuilds headings, paragraphs, bold runs, hyphenated words and page breaks', () => {
    expect(layoutPdf(pages)).toEqual([
      { kind: 'heading', level: 1, runs: [{ text: 'Rapport annuel', bold: true, italic: false }] },
      {
        kind: 'paragraph',
        runs: [
          { text: 'Ce document présente les résultats de l’année. Une phrase en ', bold: false, italic: false },
          { text: 'gras', bold: true, italic: false },
          { text: '.', bold: false, italic: false },
        ],
      },
      { kind: 'paragraph', runs: [{ text: 'Deuxième paragraphe.', bold: false, italic: false }] },
      { kind: 'heading', level: 3, runs: [{ text: 'Contexte', bold: false, italic: false }] },
      { kind: 'pageBreak' },
      { kind: 'paragraph', runs: [{ text: 'Page deux.', bold: false, italic: false }] },
    ]);
  });

  it('starts a new paragraph for each list item', () => {
    const list: StyledPage[] = [{ width: 595, height: 842, items: [item('• Premier', 60, 80), item('• Second', 60, 95)] }];
    expect(layoutPdf(list).map((b) => b.kind)).toEqual(['paragraph', 'paragraph']);
  });
});

describe('blocksToDocx', () => {
  it('writes a Word document with the text, headings and bold runs', async () => {
    const bytes = await blocksToDocx(layoutPdf(pages));
    expect(docxText(bytes)).toContain('Rapport annuel');
    expect(docxText(bytes)).toContain('résultats de l’année');
    const xml = strFromU8(unzipSync(bytes)['word/document.xml']);
    expect(xml).toContain('Heading1');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('w:type="page"');
  });
});
