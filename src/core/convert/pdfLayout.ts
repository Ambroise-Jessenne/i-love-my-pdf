// Rebuilds the structure of a PDF's text (lines, paragraphs, headings, bold and italic) from positioned pieces of text.
// Coordinates are PDF points at scale 1, origin top-left; `y` is the baseline.

export interface StyledItem {
  str: string;
  x: number;
  y: number;
  width: number;
  /** Font size in points. */
  size: number;
  bold: boolean;
  italic: boolean;
}

export interface StyledPage {
  width: number;
  height: number;
  items: StyledItem[];
}

export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
}

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { kind: 'paragraph'; runs: Run[] }
  | { kind: 'pageBreak' };

interface Line {
  y: number;
  x: number;
  size: number;
  runs: Run[];
}

const HEADING_RATIO = 1.25; // a line this much bigger than the body text is a heading
const PARAGRAPH_GAP = 1.6; // a vertical gap larger than this many line heights starts a new paragraph
const BULLET = /^\s*(?:[•◦▪‣–—-]|\d+[.)]|[a-z][.)])\s/i;

function sameStyle(a: Run, b: Run): boolean {
  return a.bold === b.bold && a.italic === b.italic;
}

function pushRun(runs: Run[], run: Run): void {
  const last = runs[runs.length - 1];
  if (last && sameStyle(last, run)) last.text += run.text;
  else if (run.text) runs.push({ ...run });
}

function textOf(runs: Run[]): string {
  return runs.map((run) => run.text).join('');
}

/** Groups the items of a page into lines, top to bottom, each read left to right. */
function linesOf(page: StyledPage): Line[] {
  const items = page.items.filter((item) => item.str.length > 0).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: { y: number; size: number; items: StyledItem[] }[] = [];
  for (const item of items) {
    const line = lines.find((l) => Math.abs(l.y - item.y) < Math.max(l.size, item.size) * 0.5);
    if (line) {
      line.items.push(item);
      line.size = Math.max(line.size, item.size);
    } else lines.push({ y: item.y, size: item.size, items: [item] });
  }
  return lines
    .sort((a, b) => a.y - b.y)
    .map((line) => {
      const sorted = line.items.sort((a, b) => a.x - b.x);
      const runs: Run[] = [];
      sorted.forEach((item, i) => {
        const previous = sorted[i - 1];
        if (previous) {
          const gap = item.x - (previous.x + previous.width);
          const spaced = /\s$/.test(previous.str) || /^\s/.test(item.str);
          if (!spaced && gap > item.size * 0.15) pushRun(runs, { text: ' ', bold: previous.bold, italic: previous.italic });
        }
        pushRun(runs, { text: item.str, bold: item.bold, italic: item.italic });
      });
      const trimmed = runs.map((run) => ({ ...run }));
      if (trimmed[0]) trimmed[0].text = trimmed[0].text.trimStart();
      const last = trimmed[trimmed.length - 1];
      if (last) last.text = last.text.trimEnd();
      return { y: line.y, x: sorted[0].x, size: line.size, runs: trimmed.filter((run) => run.text) };
    })
    .filter((line) => line.runs.length > 0);
}

/** Most common text size of the document, weighted by characters: the size of the body text. */
function bodySize(lines: Line[]): number {
  const weights = new Map<number, number>();
  for (const line of lines) {
    const size = Math.round(line.size * 2) / 2;
    weights.set(size, (weights.get(size) ?? 0) + textOf(line.runs).length);
  }
  let best = 12;
  let bestWeight = -1;
  for (const [size, weight] of weights) {
    if (weight > bestWeight) {
      best = size;
      bestWeight = weight;
    }
  }
  return best;
}

function headingLevel(size: number, body: number): 1 | 2 | 3 | null {
  const ratio = size / body;
  if (ratio >= 1.8) return 1;
  if (ratio >= 1.45) return 2;
  if (ratio >= HEADING_RATIO) return 3;
  return null;
}

/** Appends a line to a paragraph, joining words cut by a hyphen at the end of the previous line. */
function appendLine(runs: Run[], line: Line): void {
  const last = runs[runs.length - 1];
  const nextText = textOf(line.runs);
  if (last && /[A-Za-zÀ-ÿ]-$/.test(last.text) && /^[a-zà-ÿ]/.test(nextText)) last.text = last.text.slice(0, -1);
  else pushRun(runs, { text: ' ', bold: last?.bold ?? false, italic: last?.italic ?? false });
  for (const run of line.runs) pushRun(runs, run);
}

export function layoutPdf(pages: StyledPage[]): Block[] {
  const pageLines = pages.map(linesOf);
  const body = bodySize(pageLines.flat());
  const blocks: Block[] = [];

  pageLines.forEach((lines, pageIndex) => {
    if (pageIndex > 0) blocks.push({ kind: 'pageBreak' });
    let current: { block: Exclude<Block, { kind: 'pageBreak' }>; line: Line } | null = null;
    for (const line of lines) {
      const level = headingLevel(line.size, body);
      const previous = current?.line;
      const closeEnough = !!previous && line.y - previous.y <= Math.max(previous.size, line.size) * PARAGRAPH_GAP;
      const sameSize = !!previous && Math.abs(line.size - previous.size) <= previous.size * 0.1;
      const startsItem = BULLET.test(textOf(line.runs));
      const continues =
        current !== null &&
        closeEnough &&
        sameSize &&
        !startsItem &&
        (level === null ? current.block.kind === 'paragraph' : current.block.kind === 'heading');
      if (continues && current) {
        appendLine(current.block.runs, line);
        current.line = line;
      } else {
        const block: Exclude<Block, { kind: 'pageBreak' }> =
          level === null ? { kind: 'paragraph', runs: line.runs.map((r) => ({ ...r })) } : { kind: 'heading', level, runs: line.runs.map((r) => ({ ...r })) };
        blocks.push(block);
        current = { block, line };
      }
    }
  });
  return blocks;
}
