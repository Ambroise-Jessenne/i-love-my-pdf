// Page geometry of a PDF's text, independent from pdf.js: coordinates are PDF points at scale 1,
// with the origin at the top-left corner of the (rotated) page.

export interface PdfTextItem {
  str: string;
  left: number;
  top: number;
  width: number;
  /** From the top of the ascenders to the bottom of the descenders. */
  height: number;
  hasEOL: boolean;
  /** False for rotated or skewed text, whose box is only known as a whole. */
  horizontal: boolean;
}

export interface PdfPageText {
  width: number;
  height: number;
  items: PdfTextItem[];
}

/** Where an item's characters sit in the extracted text. */
export interface PdfSpan {
  page: number;
  item: number;
  start: number;
  end: number;
}

export interface PdfBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Extra black around each box, as a share of the text height: character positions inside an item are
// estimated, and covering a little of a neighbour is safer than leaving part of a digit visible.
const MARGIN = 0.15;

export function buildPdfText(pages: PdfPageText[]): { text: string; spans: PdfSpan[] } {
  let text = '';
  const spans: PdfSpan[] = [];
  pages.forEach((page, pageIndex) => {
    page.items.forEach((item, itemIndex) => {
      spans.push({ page: pageIndex, item: itemIndex, start: text.length, end: text.length + item.str.length });
      text += item.str;
      if (item.hasEOL) text += '\n';
    });
    if (!text.endsWith('\n')) text += '\n';
  });
  return { text, spans };
}

/** Rectangles covering the given text ranges. `measure` gives the relative width of a string in the item's font. */
export function boxesFor(
  ranges: { start: number; end: number }[],
  pages: PdfPageText[],
  spans: PdfSpan[],
  measure: (s: string) => number,
): PdfBox[] {
  const boxes: PdfBox[] = [];
  for (const range of ranges) {
    for (const span of spans) {
      const from = Math.max(range.start, span.start);
      const to = Math.min(range.end, span.end);
      if (from >= to) continue;
      const item = pages[span.page].items[span.item];
      const margin = item.height * MARGIN;
      let x0 = item.left;
      let x1 = item.left + item.width;
      if (item.horizontal) {
        const total = measure(item.str) || 1;
        x0 = item.left + (item.width * measure(item.str.slice(0, from - span.start))) / total;
        x1 = item.left + (item.width * measure(item.str.slice(0, to - span.start))) / total;
      }
      boxes.push({
        page: span.page,
        x: x0 - margin,
        y: item.top - margin,
        width: x1 - x0 + 2 * margin,
        height: item.height + 2 * margin,
      });
    }
  }
  return boxes;
}
