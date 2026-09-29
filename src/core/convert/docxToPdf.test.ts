import { readFileSync } from 'node:fs';
import { Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { docxToPdf } from './docxToPdf';
import { parseMammothHtml } from './html';

const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);

const FONT_DIR = `${process.cwd()}/node_modules/pdfjs-dist/standard_fonts/`;
const fonts = {
  regular: readFileSync(`${FONT_DIR}LiberationSans-Regular.ttf`),
  bold: readFileSync(`${FONT_DIR}LiberationSans-Bold.ttf`),
  italic: readFileSync(`${FONT_DIR}LiberationSans-Italic.ttf`),
  boldItalic: readFileSync(`${FONT_DIR}LiberationSans-BoldItalic.ttf`),
};

describe('parseMammothHtml', () => {
  it('reads headings, styled text, nested lists, tables and line breaks', () => {
    const html =
      '<h1>Titre &amp; co</h1><p>a <strong>gras</strong><em> ital</em><br />suite</p>' +
      '<ul><li>puce<ul><li>sous-puce</li></ul></li></ul><ol><li>un</li><li>deux</li></ol>' +
      '<table><tr><th><p>Nom</p></th><td><p>A1</p><p>A2</p></td></tr></table>';
    expect(parseMammothHtml(html)).toEqual([
      { kind: 'heading', level: 1, inlines: [{ text: 'Titre & co', bold: false, italic: false }] },
      {
        kind: 'paragraph',
        inlines: [
          { text: 'a ', bold: false, italic: false },
          { text: 'gras', bold: true, italic: false },
          { text: ' ital', bold: false, italic: true },
          { lineBreak: true },
          { text: 'suite', bold: false, italic: false },
        ],
      },
      { kind: 'listItem', ordered: false, level: 0, number: 1, inlines: [{ text: 'puce', bold: false, italic: false }] },
      { kind: 'listItem', ordered: false, level: 1, number: 1, inlines: [{ text: 'sous-puce', bold: false, italic: false }] },
      { kind: 'listItem', ordered: true, level: 0, number: 1, inlines: [{ text: 'un', bold: false, italic: false }] },
      { kind: 'listItem', ordered: true, level: 0, number: 2, inlines: [{ text: 'deux', bold: false, italic: false }] },
      {
        kind: 'table',
        rows: [
          [
            [{ text: 'Nom', bold: true, italic: false }],
            [{ text: 'A1', bold: false, italic: false }, { lineBreak: true }, { text: 'A2', bold: false, italic: false }],
          ],
        ],
      },
    ]);
  });

  it('keeps PNG and JPEG images and drops other formats', () => {
    const blocks = parseMammothHtml(`<p><img src="data:image/png;base64,${btoa('x')}" /><img src="data:image/x-emf;base64,AAAA" /></p>`);
    expect(blocks).toEqual([{ kind: 'paragraph', inlines: [{ image: { type: 'png', data: new Uint8Array([120]) } }] }]);
  });
});

async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: false, standardFontDataUrl: FONT_DIR });
  const doc = await task.promise;
  const texts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    texts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  await task.destroy();
  return texts;
}

describe('docxToPdf', () => {
  it('lays out a Word document on A4 pages with selectable text', async () => {
    const long = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore. '.repeat(60);
    const document = new Document({
      numbering: { config: [{ reference: 'numbers', levels: [{ level: 0, format: 'decimal', text: '%1.' }] }] },
      sections: [
        {
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Compte rendu annuel')] }),
            new Paragraph({ children: [new TextRun('Texte avec '), new TextRun({ text: 'gras', bold: true }), new TextRun(' et accents : éàçœ.')] }),
            new Paragraph({ text: 'Premier point', bullet: { level: 0 } }),
            new Paragraph({ text: 'Étape numérotée', numbering: { reference: 'numbers', level: 0 } }),
            new Table({
              rows: [
                new TableRow({ children: [new TableCell({ children: [new Paragraph('Colonne A')] }), new TableCell({ children: [new Paragraph('Colonne B')] })] }),
              ],
            }),
            new Paragraph({ children: [new ImageRun({ type: 'png', data: PNG, transformation: { width: 40, height: 40 } })] }),
            new Paragraph(long),
          ],
        },
      ],
    });
    const pdf = await docxToPdf(new Uint8Array(await Packer.toBuffer(document)), fonts);
    const pages = await pdfPages(pdf);
    const all = pages.join(' ');

    expect(pages.length).toBeGreaterThanOrEqual(2);
    for (const expected of ['Compte rendu annuel', 'gras', 'éàçœ', 'Premier point', 'Étape numérotée', 'Colonne A', 'Colonne B', '•', '1.']) {
      expect(all).toContain(expected);
    }
  });
});
