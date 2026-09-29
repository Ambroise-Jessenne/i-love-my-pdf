import { expose } from 'comlink';
import { docxToPdf } from '../core/convert/docxToPdf';
import { layoutPdf, type StyledPage } from '../core/convert/pdfLayout';
import { blocksToDocx } from '../core/convert/pdfToDocx';
import type { FontFiles } from '../core/convert/typeset';
import { mergePdfs } from '../core/pdf/merge';
import { extractPages, splitPdf } from '../core/pdf/split';
import { zipFiles } from '../core/zip';

let fonts: Promise<FontFiles> | undefined;

/** Liberation Sans, served by the site alongside pdf.js (GPL v2 with an exception allowing it to be embedded in documents). */
function loadFonts(): Promise<FontFiles> {
  fonts ??= Promise.all(
    ['Regular', 'Bold', 'Italic', 'BoldItalic'].map(async (style) => {
      const response = await fetch(`/pdfjs/standard_fonts/LiberationSans-${style}.ttf`);
      if (!response.ok) throw new Error(`font ${style}`);
      return new Uint8Array(await response.arrayBuffer());
    }),
  ).then(([regular, bold, italic, boldItalic]) => ({ regular, bold, italic, boldItalic }));
  fonts.catch(() => {
    fonts = undefined;
  });
  return fonts;
}

const api = {
  merge: mergePdfs,
  extract: extractPages,
  async splitToZip(bytes: Uint8Array, groups: number[][], names: string[]): Promise<Uint8Array> {
    const parts = await splitPdf(bytes, groups);
    return zipFiles(parts.map((part, i) => ({ name: names[i], bytes: part })));
  },
  async pdfToDocx(pages: StyledPage[]): Promise<Uint8Array> {
    return blocksToDocx(layoutPdf(pages));
  },
  async wordToPdf(bytes: Uint8Array): Promise<Uint8Array> {
    return docxToPdf(bytes, await loadFonts());
  },
};

export type PdfToolsApi = typeof api;

expose(api);
