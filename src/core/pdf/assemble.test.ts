import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { assembleRedactedPdf } from './assemble';

// An 8×8 black JPEG.
const JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5UooooA//2Q==',
  ),
  (c) => c.charCodeAt(0),
);

async function makePdf(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setAuthor('Jean Dupont');
  pdf.setTitle('Dossier secret');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 300]).drawText('Mail : jean@exemple.fr', { x: 40, y: 200, size: 14, font });
  pdf.addPage([500, 200]).drawText('Page publique', { x: 40, y: 100, size: 14, font });
  return pdf.save();
}

async function readPdf(bytes: Uint8Array) {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    standardFontDataUrl: `${process.cwd()}/node_modules/pdfjs-dist/standard_fonts/`,
  });
  const doc = await task.promise;
  const pages: { text: string; width: number; height: number }[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const { width, height } = page.getViewport({ scale: 1 });
    pages.push({ text: content.items.map((i) => ('str' in i ? i.str : '')).join(''), width, height });
  }
  const info = (await doc.getMetadata()).info as Record<string, unknown>;
  await task.destroy();
  return { pages, info };
}

describe('assembleRedactedPdf', () => {
  it('replaces redacted pages by their image and keeps the others', async () => {
    const original = await makePdf();
    const before = await readPdf(original);
    expect(before.pages[0].text).toContain('jean@exemple.fr');

    const output = await assembleRedactedPdf(original, [{ page: 0, jpeg: JPEG, width: 400, height: 300 }]);
    const after = await readPdf(output);

    expect(after.pages).toEqual([
      { text: '', width: 400, height: 300 },
      { text: 'Page publique', width: 500, height: 200 },
    ]);
  });

  it('clears the identity metadata', async () => {
    const output = await assembleRedactedPdf(await makePdf(), []);
    const { info } = await readPdf(output);
    expect(info.Author ?? '').toBe('');
    expect(info.Title ?? '').toBe('');
    expect(info.Producer).toBe('I Love My P.D.F.');
  });
});
