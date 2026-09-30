import { expect, test, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// Runs on WebKit, Safari's engine. Playwright's WebKit is newer than the Safari most Macs have, so the
// JavaScript features Safari added since version 16.4 (2023) are removed first, in the page and in the
// site's workers: the site must still open PDFs on a Mac that is a few years old.
const OLD_SAFARI = `(() => {
  for (const [owner, names] of [
    [Map.prototype, ['getOrInsert', 'getOrInsertComputed']],
    [WeakMap.prototype, ['getOrInsert', 'getOrInsertComputed']],
    [Math, ['sumPrecise']],
    [Promise, ['try', 'withResolvers']],
    [Uint8Array, ['fromBase64', 'fromHex']],
    [Uint8Array.prototype, ['toBase64', 'toHex']],
    [URL, ['parse']],
  ]) for (const name of names) delete owner[name];
})();
`;

async function asOldSafari(page: Page) {
  await page.addInitScript(OLD_SAFARI);
  await page.route('**/_astro/*worker*', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: OLD_SAFARI + (await response.text()) });
  });
}

async function open(page: Page, path: string) {
  await asOldSafari(page);
  await page.goto(path);
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

async function textPdf(): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([595, 842]).drawText('Mail : jean.dupont@exemple.fr', { x: 60, y: 760, size: 14, font });
  return Buffer.from(await pdf.save());
}

test('filters a PDF on an older Safari', async ({ page }) => {
  await open(page, '/fr/filter/');
  await page.getByTestId('file-input').setInputFiles({ name: 'lettre.pdf', mimeType: 'application/pdf', buffer: await textPdf() });
  await expect(page.getByText('PDF · 1 page(s)')).toBeVisible();
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('Mail : [EMAIL_1]\n');
});

test('recognises a PDF saved without its extension', async ({ page }) => {
  await open(page, '/fr/filter/');
  await page.getByTestId('file-input').setInputFiles({ name: 'lettre', mimeType: 'application/octet-stream', buffer: await textPdf() });
  await expect(page.getByText('PDF · 1 page(s)')).toBeVisible();
});

test('opens a PDF in the split tool on an older Safari', async ({ page }) => {
  await open(page, '/fr/split/');
  await page.getByTestId('file-input').setInputFiles({ name: 'lettre.pdf', mimeType: 'application/pdf', buffer: await textPdf() });
  await expect(page.getByRole('radio').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
