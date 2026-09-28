// Browser glue around pdf.js: read a PDF's text with its positions, and render redacted pages as images.
// Loaded on demand, only when a PDF is dropped.
import { getDocument, GlobalWorkerOptions, type PageViewport, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { RedactedPageImage } from '../../../core/pdf/assemble';
import type { PdfBox, PdfPageText, PdfTextItem } from '../../../core/pdf/layout';

GlobalWorkerOptions.workerSrc = workerUrl;

const ASSETS = '/pdfjs/';
const RENDER_SCALE = 2; // 144 dpi
const MAX_RENDER_SIDE = 4000; // px, to keep memory in check on very large pages
const ASCENT = 0.9; // share of the font size above the baseline
const DESCENT = 0.25; // share below it

export class PdfError extends Error {
  constructor(readonly reason: 'password' | 'invalid') {
    super(reason);
  }
}

export interface LoadedPdf {
  doc: PDFDocumentProxy;
  pages: PdfPageText[];
}

export async function openPdf(bytes: Uint8Array): Promise<LoadedPdf> {
  let doc: PDFDocumentProxy;
  try {
    doc = await getDocument({
      data: bytes.slice(), // pdf.js takes ownership of the buffer it receives
      cMapUrl: `${ASSETS}cmaps/`,
      standardFontDataUrl: `${ASSETS}standard_fonts/`,
      wasmUrl: `${ASSETS}wasm/`,
      iccUrl: `${ASSETS}iccs/`,
      useWasm: false, // the site's CSP does not allow compiling WebAssembly
      enableXfa: false,
    }).promise;
  } catch (error) {
    throw new PdfError((error as Error | undefined)?.name === 'PasswordException' ? 'password' : 'invalid');
  }

  const pages: PdfPageText[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items.filter((raw): raw is TextItem => 'str' in raw).map((raw) => toItem(raw, viewport));
    pages.push({ width: viewport.width, height: viewport.height, items });
    page.cleanup();
  }
  return { doc, pages };
}

export async function closePdf(pdf: LoadedPdf): Promise<void> {
  await pdf.doc.loadingTask.destroy();
}

function toItem(raw: TextItem, viewport: PageViewport): PdfTextItem {
  const [a, b, c, d, e, f] = raw.transform as number[];
  const size = Math.hypot(c, d) || Math.hypot(a, b) || 1;
  const along = [a / (Math.hypot(a, b) || 1), b / (Math.hypot(a, b) || 1)];
  const up = [c / size, d / size];
  const at = (advance: number, rise: number): [number, number] => {
    const [x, y] = viewport.convertToViewportPoint(
      e + along[0] * advance + up[0] * rise * size,
      f + along[1] * advance + up[1] * rise * size,
    );
    return [x, y];
  };
  const corners = [at(0, -DESCENT), at(raw.width, -DESCENT), at(0, ASCENT), at(raw.width, ASCENT)];
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const [startX, startY] = at(0, 0);
  const [endX, endY] = at(raw.width, 0);
  const horizontal = Math.abs(endY - startY) < 0.5 && endX >= startX;
  return {
    str: raw.str,
    left: horizontal ? startX : Math.min(...xs),
    top: Math.min(...ys),
    width: horizontal ? endX - startX : Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    hasEOL: raw.hasEOL,
    horizontal,
  };
}

let measureContext: CanvasRenderingContext2D | null = null;

/** Relative width of a string in a generic font, to place characters inside a text item. */
export function measureText(s: string): number {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return s.length;
  measureContext.font = '100px sans-serif';
  return measureContext.measureText(s).width;
}

/** Renders every page that has boxes, paints the boxes solid black and returns the pages as JPEG images. */
export async function renderRedactedPages(pdf: LoadedPdf, boxes: PdfBox[]): Promise<RedactedPageImage[]> {
  const byPage = new Map<number, PdfBox[]>();
  for (const box of boxes) byPage.set(box.page, [...(byPage.get(box.page) ?? []), box]);

  const images: RedactedPageImage[] = [];
  for (const [index, pageBoxes] of [...byPage].sort(([a], [b]) => a - b)) {
    const page = await pdf.doc.getPage(index + 1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(RENDER_SCALE, MAX_RENDER_SIDE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvas, viewport, background: '#ffffff' }).promise;

    const context = canvas.getContext('2d')!;
    context.fillStyle = '#000000';
    for (const box of pageBoxes) context.fillRect(box.x * scale, box.y * scale, box.width * scale, box.height * scale);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('render');
    images.push({ page: index, jpeg: new Uint8Array(await blob.arrayBuffer()), width: base.width, height: base.height });
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }
  return images;
}
