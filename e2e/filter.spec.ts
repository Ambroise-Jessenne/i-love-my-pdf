import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function openFilter(page: Page, lang = 'fr') {
  await page.goto(`/${lang}/filter/`);
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

test('filters pasted text and lets the user unmask a detection', async ({ page }) => {
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Contactez jean.dupont@exemple.fr ou le 06 12 34 56 78.');
  await page.getByRole('button', { name: 'Analyser' }).click();

  const output = page.getByTestId('filter-output');
  await expect(output).toHaveText('Contactez [EMAIL_1] ou le [TELEPHONE_1].');

  await page.getByRole('button', { name: /Téléphone/ }).click();
  await expect(output).toHaveText('Contactez [EMAIL_1] ou le 06 12 34 56 78.');
});

test('scans the portrait before revealing the filtered text', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Contactez jean.dupont@exemple.fr');
  await page.getByRole('button', { name: 'Analyser' }).click();

  const scanner = page.getByRole('img', { name: 'Vos données sont en train d’être protégées' });
  await expect(scanner).toBeVisible();
  await expect(page.getByTestId('filter-output')).toHaveCount(0);

  await expect(page.getByTestId('filter-output')).toHaveText('Contactez [EMAIL_1]');
  await expect(scanner).toHaveCount(0);
  await expect(page.getByText('Protégé', { exact: true })).toBeVisible();
});

test('skips the scanner when the user prefers reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Contactez jean.dupont@exemple.fr');
  await page.getByRole('button', { name: 'Analyser' }).click();

  await expect(page.getByTestId('filter-output')).toHaveText('Contactez [EMAIL_1]');
  await expect(page.locator('.scan')).toHaveCount(0);
});

test('masks a passage selected by hand', async ({ page }) => {
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Rendez-vous avec le comptable demain.');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByText('Aucune donnée personnelle détectée')).toBeVisible();

  await page.evaluate(() => {
    const node = document.querySelector('#filter-review span')!.firstChild!;
    const start = node.textContent!.indexOf('comptable');
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + 'comptable'.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole('button', { name: 'Masquer la sélection' }).click();

  await expect(page.getByTestId('filter-output')).toHaveText('Rendez-vous avec le [MASQUE_1] demain.');
});

test('filters an uploaded .txt file and downloads note_prv.txt', async ({ page }) => {
  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('IBAN : FR76 3000 6000 0112 3456 7890 189'),
  });
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('IBAN : [IBAN_1]');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le document filtré' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('note_prv.txt');
  expect(await readFile(await download.path(), 'utf8')).toBe('IBAN : [IBAN_1]');
});

test('refuses unsupported file types with a clear message', async ({ page }) => {
  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await expect(page.getByRole('alert')).toHaveText(
    'Ce type de fichier n’est pas pris en charge. Utilisez un fichier .txt, .docx ou .pdf.',
  );
});

test('works in English', async ({ page }) => {
  await openFilter(page, 'en');
  await page.getByLabel('Your text').fill('Mail me at a@b.io');
  await page.getByRole('button', { name: 'Analyse' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('Mail me at [EMAIL_1]');
});

test('never contacts another origin while filtering', async ({ page, baseURL }) => {
  const siteOrigin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:')) return;
    if (new URL(url).origin !== siteOrigin) external.push(url);
  });

  await page.goto('/fr/');
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Écrivez à jean.dupont@exemple.fr, IBAN FR76 3000 6000 0112 3456 7890 189.');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toContainText('[IBAN_1]');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le document filtré' }).click();
  await downloadPromise;

  expect(external).toEqual([]);
});

test('masks names, places and identifiers of a school certificate, and strict mode can be turned off', async ({ page }) => {
  await openFilter(page);
  const certificate = [
    'Université Kerbrat',
    'MARTIN CLARA',
    'Id. National : 2310045078 K',
    'Née le 04/07/2001',
    'à VALENCE ( DROME )',
    'Fait à Orsay, le 15/09/2025',
    'Sophie DELCOURT',
  ].join('\n');
  await page.getByLabel('Votre texte').fill(certificate);
  await page.getByRole('button', { name: 'Analyser' }).click();
  const output = page.getByTestId('filter-output');
  await expect(output).toHaveText(
    [
      'Université [NOM_PROPRE_1]',
      '[PERSONNE_1]',
      'Id. National : [IDENTIFIANT_1]',
      'Née le [DATE_1]',
      'à [LIEU_1]',
      'Fait à [LIEU_2], le [DATE_2]',
      '[PERSONNE_2]',
    ].join('\n'),
  );

  // Balanced mode: the unknown proper noun comes back, people stay masked.
  await page.getByText('Mode strict (recommandé)').first().click();
  await expect(output).toContainText('Université Kerbrat');
  await expect(output).toContainText('[PERSONNE_1]');
});
