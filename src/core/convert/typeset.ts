// A small typesetter: lays out the blocks of a Word document on A4 pages with real, selectable text.
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { DocBlock, Inline } from './html';

export interface FontFiles {
  regular: Uint8Array;
  bold: Uint8Array;
  italic: Uint8Array;
  boldItalic: Uint8Array;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56.69; // 2 cm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const BODY_SIZE = 11;
const TABLE_SIZE = 10;
const LINE_HEIGHT = 1.35;
const HEADING_SIZES = [20, 16, 13.5, 12, 11.5, 11];
const INDENT = 18;
const CELL_PADDING = 4;
const TEXT = rgb(0.13, 0.13, 0.13);
const RULE = rgb(0.6, 0.6, 0.6);
const BULLETS = ['•', '◦', '▪'];

type Piece =
  | { kind: 'word' | 'space'; text: string; font: PDFFont; size: number; width: number }
  | { kind: 'break' }
  | { kind: 'image'; type: 'png' | 'jpg'; data: Uint8Array };
type WordPiece = Extract<Piece, { kind: 'word' | 'space' }>;

class Writer {
  page!: PDFPage;
  y = 0;

  constructor(readonly pdf: PDFDocument, readonly fonts: Fonts) {
    this.newPage();
  }

  newPage(): void {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  /** Starts a new page unless `height` still fits on this one. */
  ensure(height: number): void {
    if (this.y - height < MARGIN && this.y < PAGE_HEIGHT - MARGIN) this.newPage();
  }

  font(bold: boolean, italic: boolean): PDFFont {
    if (bold && italic) return this.fonts.boldItalic;
    if (bold) return this.fonts.bold;
    return italic ? this.fonts.italic : this.fonts.regular;
  }
}

function pieces(writer: Writer, inlines: Inline[], size: number, forceBold = false): Piece[] {
  const result: Piece[] = [];
  for (const inline of inlines) {
    if ('lineBreak' in inline) result.push({ kind: 'break' });
    else if ('image' in inline) result.push({ kind: 'image', ...inline.image });
    else {
      const font = writer.font(inline.bold || forceBold, inline.italic);
      for (const part of inline.text.replace(/\t/g, ' ').split(/( +)/)) {
        if (!part) continue;
        const kind = part.startsWith(' ') ? 'space' : 'word';
        const text = kind === 'space' ? ' ' : part;
        result.push({ kind, text, font, size, width: font.widthOfTextAtSize(text, size) });
      }
    }
  }
  return result;
}

/** Cuts a word wider than the line into chunks that fit. */
function splitWord(piece: WordPiece, width: number): WordPiece[] {
  const chunks: WordPiece[] = [];
  let text = '';
  for (const char of piece.text) {
    if (text && piece.font.widthOfTextAtSize(text + char, piece.size) > width) {
      chunks.push({ ...piece, text, width: piece.font.widthOfTextAtSize(text, piece.size) });
      text = '';
    }
    text += char;
  }
  if (text) chunks.push({ ...piece, text, width: piece.font.widthOfTextAtSize(text, piece.size) });
  return chunks;
}

type Line = { kind: 'text'; pieces: WordPiece[] } | { kind: 'image'; type: 'png' | 'jpg'; data: Uint8Array };

/** Greedy line breaking at spaces. */
function breakLines(items: Piece[], width: number): Line[] {
  const lines: Line[] = [];
  let current: WordPiece[] = [];
  let used = 0;
  const flush = (force = false) => {
    while (current.length && current[current.length - 1].kind === 'space') current.pop();
    if (current.length || force) lines.push({ kind: 'text', pieces: current });
    current = [];
    used = 0;
  };
  for (const piece of items) {
    if (piece.kind === 'break') flush(true);
    else if (piece.kind === 'image') {
      flush();
      lines.push({ kind: 'image', type: piece.type, data: piece.data });
    } else if (piece.kind === 'space') {
      if (current.length) {
        current.push(piece);
        used += piece.width;
      }
    } else {
      const parts = piece.width > width ? splitWord(piece, width) : [piece];
      for (const part of parts) {
        if (used + part.width > width && current.length) flush();
        current.push(part);
        used += part.width;
      }
    }
  }
  flush();
  return lines;
}

async function drawLines(writer: Writer, lines: Line[], x: number, width: number, size: number): Promise<void> {
  const lineHeight = size * LINE_HEIGHT;
  for (const line of lines) {
    if (line.kind === 'image') {
      const image = line.type === 'png' ? await writer.pdf.embedPng(line.data) : await writer.pdf.embedJpg(line.data);
      const scale = Math.min(1, width / (image.width * 0.75), (PAGE_HEIGHT - 2 * MARGIN) / (image.height * 0.75));
      const w = image.width * 0.75 * scale;
      const h = image.height * 0.75 * scale;
      writer.ensure(h + 4);
      writer.page.drawImage(image, { x, y: writer.y - h, width: w, height: h });
      writer.y -= h + 4;
      continue;
    }
    writer.ensure(lineHeight);
    writer.y -= lineHeight;
    let cursor = x;
    for (const piece of line.pieces) {
      if (piece.kind === 'word') {
        writer.page.drawText(piece.text, { x: cursor, y: writer.y + size * 0.25, size: piece.size, font: piece.font, color: TEXT });
      }
      cursor += piece.width;
    }
  }
}

function drawTable(writer: Writer, rows: Inline[][][]): void {
  const columns = Math.max(...rows.map((row) => row.length));
  const columnWidth = CONTENT_WIDTH / columns;
  const lineHeight = TABLE_SIZE * LINE_HEIGHT;
  writer.y -= 6;
  for (const row of rows) {
    const cells = row.map((cell) =>
      breakLines(
        pieces(writer, cell, TABLE_SIZE).filter((piece) => piece.kind !== 'image'),
        columnWidth - 2 * CELL_PADDING,
      ),
    );
    const height = Math.max(1, ...cells.map((lines) => lines.length)) * lineHeight + 2 * CELL_PADDING;
    writer.ensure(height);
    const top = writer.y;
    for (let c = 0; c < columns; c++) {
      const x = MARGIN + c * columnWidth;
      writer.page.drawRectangle({ x, y: top - height, width: columnWidth, height, borderColor: RULE, borderWidth: 0.5 });
      let y = top - CELL_PADDING;
      for (const line of cells[c] ?? []) {
        y -= lineHeight;
        let cursor = x + CELL_PADDING;
        if (line.kind !== 'text') continue;
        for (const piece of line.pieces) {
          if (piece.kind === 'word') writer.page.drawText(piece.text, { x: cursor, y: y + TABLE_SIZE * 0.25, size: TABLE_SIZE, font: piece.font, color: TEXT });
          cursor += piece.width;
        }
      }
    }
    writer.y = top - height;
  }
  writer.y -= 8;
}

export async function typeset(blocks: DocBlock[], fontFiles: FontFiles): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts: Fonts = {
    regular: await pdf.embedFont(fontFiles.regular, { subset: true }),
    bold: await pdf.embedFont(fontFiles.bold, { subset: true }),
    italic: await pdf.embedFont(fontFiles.italic, { subset: true }),
    boldItalic: await pdf.embedFont(fontFiles.boldItalic, { subset: true }),
  };
  const writer = new Writer(pdf, fonts);

  for (const block of blocks) {
    if (block.kind === 'table') {
      drawTable(writer, block.rows);
    } else if (block.kind === 'heading') {
      const size = HEADING_SIZES[Math.min(block.level, 6) - 1];
      writer.ensure(size * LINE_HEIGHT * 2 + 10); // keep a heading with the line that follows it
      writer.y -= 10;
      await drawLines(writer, breakLines(pieces(writer, block.inlines, size, true), CONTENT_WIDTH), MARGIN, CONTENT_WIDTH, size);
      writer.y -= 4;
    } else if (block.kind === 'listItem') {
      const x = MARGIN + (block.level + 1) * INDENT;
      const width = CONTENT_WIDTH - (block.level + 1) * INDENT;
      const lines = breakLines(pieces(writer, block.inlines, BODY_SIZE), width);
      writer.ensure(BODY_SIZE * LINE_HEIGHT);
      const marker = block.ordered ? `${block.number}.` : BULLETS[block.level % BULLETS.length];
      const markerWidth = fonts.regular.widthOfTextAtSize(marker, BODY_SIZE);
      writer.page.drawText(marker, { x: x - 6 - markerWidth, y: writer.y - BODY_SIZE * LINE_HEIGHT + BODY_SIZE * 0.25, size: BODY_SIZE, font: fonts.regular, color: TEXT });
      await drawLines(writer, lines, x, width, BODY_SIZE);
      writer.y -= 2;
    } else {
      await drawLines(writer, breakLines(pieces(writer, block.inlines, BODY_SIZE), CONTENT_WIDTH), MARGIN, CONTENT_WIDTH, BODY_SIZE);
      writer.y -= 6;
    }
  }

  pdf.setCreator('I Love My P.D.F.');
  pdf.setProducer('I Love My P.D.F.');
  return pdf.save();
}
