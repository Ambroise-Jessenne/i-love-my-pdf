// pdf.js in the page, shared by the PDF tools: opening documents, page thumbnails and styled text.
// Loaded on demand; its worker and data files are served by the site itself.
import { getDocument, GlobalWorkerOptions, Util, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { StyledItem, StyledPage } from '../../core/convert/pdfLayout';

GlobalWorkerOptions.workerSrc = workerUrl;

const ASSETS = '/pdfjs/';

export class PdfError extends Error {
  constructor(readonly reason: 'password' | 'invalid') {
    super(reason);
  }
}

export async function loadPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  try {
    return await getDocument({
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
}

export async function closeDocument(doc: PDFDocumentProxy): Promise<void> {
  await doc.loadingTask.destroy();
}

/** A JPEG thumbnail of a page (0-based index), `width` pixels wide, as an object URL to revoke when done. */
export async function renderThumbnail(doc: PDFDocumentProxy, pageIndex: number, width: number): Promise<string> {
  const page = await doc.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  // The print intent renders in one go, even while the tab is in the background.
  await page.render({ canvas, viewport, background: '#ffffff', intent: 'print' }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();
  if (!blob) throw new Error('thumbnail');
  return URL.createObjectURL(blob);
}

/** Every page's text with its position, size and style, for rebuilding the document's structure. */
export async function extractStyledPages(doc: PDFDocumentProxy): Promise<StyledPage[]> {
  const pages: StyledPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    await page.getOperatorList(); // loads the fonts, whose names tell bold and italic apart
    const items: StyledItem[] = [];
    for (const raw of content.items) {
      if (!('str' in raw)) continue;
      const item = raw as TextItem;
      const [, , c, d, x, y] = Util.transform(viewport.transform, item.transform) as number[];
      let bold = false;
      let italic = false;
      try {
        const font = page.commonObjs.get(item.fontName) as { bold?: boolean; black?: boolean; italic?: boolean; name?: string } | undefined;
        const name = font?.name ?? '';
        bold = !!font?.bold || !!font?.black || /bold|black|heavy|semibold|demi/i.test(name);
        italic = !!font?.italic || /italic|oblique/i.test(name);
      } catch {
        // font not available: plain text
      }
      items.push({ str: item.str, x, y, width: item.width, size: Math.hypot(c, d) || item.height || 12, bold, italic });
    }
    pages.push({ width: viewport.width, height: viewport.height, items });
    page.cleanup();
  }
  return pages;
}
