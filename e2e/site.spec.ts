import { expect, test } from '@playwright/test';

test('home is available in French and English', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/fr\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Vos données ne quittent jamais votre navigateur.',
  );
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your data never leaves your browser.');
});

test('how-it-works page explains the name', async ({ page }) => {
  await page.goto('/fr/how-it-works/');
  await expect(page.getByText('P.D.F. veut dire Private Data Filter')).toBeVisible();
});

test('declares a Content-Security-Policy that forbids other origins', async ({ page }) => {
  await page.goto('/fr/');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
});

test('draws the decorative animated background behind every page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const path of ['/fr/', '/fr/filter/', '/en/how-it-works/']) {
    await page.goto(path);
    const canvas = page.locator('canvas.flow-field');
    await expect(canvas).toHaveAttribute('aria-hidden', 'true');
    await expect(canvas).toHaveCSS('pointer-events', 'none');
    expect(await canvas.evaluate((node: HTMLCanvasElement) => node.width)).toBeGreaterThan(0);
  }
});

test('about page is linked from the menu, credits its data sources and points to the source code', async ({ page }) => {
  await page.goto('/fr/');
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'À propos' }).click();
  await expect(page).toHaveURL(/\/fr\/about\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('À propos');
  await expect(page.getByText('Prénoms et noms de famille : INSEE, sous Licence Ouverte')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir le code source sur GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/Ambroise-Jessenne/i-love-my-pdf',
  );
  await page.goto('/en/about/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
});
