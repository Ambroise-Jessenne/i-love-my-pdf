import { Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from 'docx';
import type { Block } from './pdfLayout';

const HEADINGS = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 } as const;

/** Writes the blocks of a PDF's text as an editable Word document. */
export async function blocksToDocx(blocks: Block[]): Promise<Uint8Array> {
  const children: Paragraph[] = [];
  let breakBefore = false;
  for (const block of blocks) {
    if (block.kind === 'pageBreak') {
      breakBefore = true;
      continue;
    }
    const runs = block.runs.map((run) => new TextRun({ text: run.text, bold: run.bold, italics: run.italic }));
    children.push(
      new Paragraph({
        children: breakBefore ? [new PageBreak(), ...runs] : runs,
        heading: block.kind === 'heading' ? HEADINGS[block.level] : undefined,
        spacing: block.kind === 'paragraph' ? { after: 120 } : undefined,
      }),
    );
    breakBefore = false;
  }
  const document = new Document({
    creator: 'I Love My P.D.F.',
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
