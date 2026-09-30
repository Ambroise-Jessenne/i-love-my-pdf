import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function openFilter(page: Page) {
  await page.goto('/fr/filter/');
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

function makeDocx(): Buffer {
  const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const run = (text: string) => `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body><w:p>${run('Contact : marie.curie@')}${run('exemple.fr')}</w:p></w:body></w:document>`;
  return Buffer.from(zipSync({ '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': strToU8(document) }));
}

async function makePdf(withText = true): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const first = pdf.addPage([595, 842]);
  if (withText) {
    first.drawText('Mail : jean.dupont@exemple.fr', { x: 60, y: 760, size: 14, font });
    pdf.addPage([595, 842]).drawText('Page publique', { x: 60, y: 760, size: 14, font });
  } else {
    first.drawRectangle({ x: 60, y: 600, width: 300, height: 100, color: rgb(0.5, 0.5, 0.5) });
  }
  return Buffer.from(await pdf.save());
}

async function pdfPageTexts(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: false,
    standardFontDataUrl: `${process.cwd()}/node_modules/pdfjs-dist/standard_fonts/`,
  });
  const doc = await task.promise;
  const texts: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    texts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(''));
  }
  await task.destroy();
  return texts;
}

test('filters a Word document and keeps it a Word document', async ({ page }) => {
  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({ name: 'note.docx', mimeType: 'application/octet-stream', buffer: makeDocx() });
  await expect(page.getByText('Document Word')).toBeVisible();
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('Contact : [EMAIL_1]\n');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le document filtré' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('note_prv.docx');
  const xml = strFromU8(unzipSync(await readFile(await download.path()))['word/document.xml']);
  expect(xml).toContain('[EMAIL_1]');
  expect(xml).not.toContain('marie.curie');
});

test('redacts a PDF with black boxes and leaves no text under them', async ({ page, baseURL }) => {
  const siteOrigin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith('data:') && !url.startsWith('blob:') && new URL(url).origin !== siteOrigin) external.push(url);
  });

  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({ name: 'lettre.pdf', mimeType: 'application/pdf', buffer: await makePdf() });
  await expect(page.getByText('PDF · 2 page(s)')).toBeVisible();
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('Mail : [EMAIL_1]\nPage publique\n');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le PDF masqué' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('lettre_prv.pdf');
  expect(await pdfPageTexts(await readFile(await download.path()))).toEqual(['', 'Page publique']);

  const textDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le texte filtré' }).click();
  expect((await textDownload).suggestedFilename()).toBe('lettre_prv.txt');

  expect(external).toEqual([]);
});

test('refuses a scanned PDF with a clear message', async ({ page }) => {
  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: await makePdf(false) });
  await expect(page.getByRole('alert')).toHaveText(
    'Ce PDF ne contient pas de texte (document scanné) : il n’est pas encore pris en charge.',
  );
});
