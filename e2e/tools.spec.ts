import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { strFromU8, unzipSync } from 'fflate';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/** A PDF whose page n is (100 + offset + n) points wide, so pages can be recognised after processing. */
async function pagesPdf(count: number, offset = 0): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let n = 1; n <= count; n++) pdf.addPage([100 + offset + n, 200]);
  return Buffer.from(await pdf.save());
}

async function widths(bytes: Uint8Array): Promise<number[]> {
  return (await PDFDocument.load(bytes)).getPages().map((page) => page.getWidth());
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    standardFontDataUrl: `${process.cwd()}/node_modules/pdfjs-dist/standard_fonts/`,
  });
  const doc = await task.promise;
  let text = '';
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    text += content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  }
  await task.destroy();
  return text;
}

async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

async function download(page: Page, button: string) {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name: button }).click();
  const file = await promise;
  return { name: file.suggestedFilename(), bytes: new Uint8Array(await readFile(await file.path())) };
}

test('home links to every tool', async ({ page }) => {
  await page.goto('/fr/');
  for (const [name, path] of [
    ['Fusionner des PDF', '/fr/merge/'],
    ['Diviser un PDF', '/fr/split/'],
    ['PDF → Word', '/fr/pdf-to-word/'],
    ['Word → PDF', '/fr/word-to-pdf/'],
  ]) {
    await expect(page.getByRole('link', { name, exact: true }).first()).toHaveAttribute('href', path);
  }
});

test('merges PDFs in the chosen order', async ({ page }) => {
  await open(page, '/fr/merge/');
  await page.getByTestId('file-input').setInputFiles([
    { name: 'premier.pdf', mimeType: 'application/pdf', buffer: await pagesPdf(2) },
    { name: 'second.pdf', mimeType: 'application/pdf', buffer: await pagesPdf(1, 10) },
  ]);
  await expect(page.getByText('second.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Descendre : premier.pdf' }).click();

  const merged = await download(page, 'Fusionner les PDF');
  expect(merged.name).toBe('second_fusion.pdf');
  expect(await widths(merged.bytes)).toEqual([111, 101, 102]);
});

test('refuses a damaged PDF with a clear message', async ({ page }) => {
  await open(page, '/fr/merge/');
  await page.getByTestId('file-input').setInputFiles({ name: 'abime.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pas un pdf') });
  await expect(page.getByRole('alert')).toHaveText('Impossible de lire « abime.pdf » : le fichier est peut-être endommagé.');
});

test('extracts the selected pages', async ({ page }) => {
  await open(page, '/fr/split/');
  await page.getByTestId('file-input').setInputFiles({ name: 'rapport.pdf', mimeType: 'application/pdf', buffer: await pagesPdf(5) });
  await page.getByRole('button', { name: 'Page 2', exact: true }).click();
  await page.getByRole('button', { name: 'Page 4', exact: true }).click();
  await expect(page.getByText('2 page(s) sélectionnée(s)')).toBeVisible();

  const extracted = await download(page, 'Télécharger les pages sélectionnées');
  expect(extracted.name).toBe('rapport_pages.pdf');
  expect(await widths(extracted.bytes)).toEqual([102, 104]);
});

test('splits a PDF by ranges into a ZIP, and explains invalid ranges', async ({ page }) => {
  await open(page, '/fr/split/');
  await page.getByTestId('file-input').setInputFiles({ name: 'rapport.pdf', mimeType: 'application/pdf', buffer: await pagesPdf(5) });
  await page.getByText('Découper en plusieurs fichiers').click();

  await page.getByRole('textbox', { name: 'Plages de pages' }).fill('1-2, 9');
  await page.getByRole('button', { name: 'Télécharger le ZIP' }).click();
  await expect(page.getByRole('alert')).toHaveText('Une plage sort du document, qui compte 5 page(s).');

  await page.getByRole('textbox', { name: 'Plages de pages' }).fill('1-2, 3-5');
  const zip = await download(page, 'Télécharger le ZIP');
  expect(zip.name).toBe('rapport_decoupe.zip');
  const files = unzipSync(zip.bytes);
  expect(Object.keys(files)).toEqual(['rapport_1-2.pdf', 'rapport_3-5.pdf']);
  expect(await widths(files['rapport_3-5.pdf'])).toEqual([103, 104, 105]);
});

test('converts a PDF into an editable Word document', async ({ page }) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const first = pdf.addPage([595, 842]);
  first.drawText('Rapport annuel', { x: 60, y: 760, size: 24, font: bold });
  first.drawText('Premier paragraphe du rapport.', { x: 60, y: 720, size: 12, font });

  await open(page, '/fr/pdf-to-word/');
  await page.getByTestId('file-input').setInputFiles({ name: 'rapport.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) });
  const word = await download(page, 'Convertir en Word');
  expect(word.name).toBe('rapport.docx');
  const xml = strFromU8(unzipSync(word.bytes)['word/document.xml']);
  expect(xml).toContain('Rapport annuel');
  expect(xml).toContain('Premier paragraphe du rapport.');
  expect(xml).toContain('Heading1');
});

test('refuses a scanned PDF for conversion', async ({ page }) => {
  await open(page, '/fr/pdf-to-word/');
  await page.getByTestId('file-input').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: await pagesPdf(1) });
  await page.getByRole('button', { name: 'Convertir en Word' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ce PDF ne contient pas de texte (document scanné) : il ne peut pas être converti.');
});

test('converts a Word document into a PDF with real text, without contacting another origin', async ({ page, baseURL }) => {
  const siteOrigin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).origin !== siteOrigin) external.push(url);
  });
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Compte rendu')] }),
          new Paragraph({ children: [new TextRun('Réunion du '), new TextRun({ text: 'lundi', bold: true }), new TextRun(', accents : éàçœ.')] }),
          new Paragraph({ text: 'Point à suivre', bullet: { level: 0 } }),
        ],
      },
    ],
  });

  await open(page, '/fr/word-to-pdf/');
  await page.getByTestId('file-input').setInputFiles({ name: 'reunion.docx', mimeType: 'application/octet-stream', buffer: await Packer.toBuffer(document) });
  const pdf = await download(page, 'Convertir en PDF');
  expect(pdf.name).toBe('reunion.pdf');
  const text = await pdfText(pdf.bytes);
  for (const expected of ['Compte rendu', 'lundi', 'éàçœ', 'Point à suivre']) expect(text).toContain(expected);

  for (const path of ['/fr/merge/', '/fr/split/', '/fr/pdf-to-word/']) await open(page, path);
  expect(external).toEqual([]);
});
