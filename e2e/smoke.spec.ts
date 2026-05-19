import { expect, test } from '@playwright/test';

test('loads the built application', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('ZeroClaw');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ZeroClaw' }),
  ).toBeVisible();
  await expect(page.getByLabel('Game status')).toContainText('Ready');
  await expect(page.getByRole('grid', { name: 'Game board' })).toBeVisible();
  await expect(page.locator('.board-cell')).toHaveCount(64);
});

test('routes board interactions through the app controller', async ({
  page,
}) => {
  await page.goto('/');

  await page.locator('.board-cell').first().click();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );
  await expect(
    page.locator('.board-cell[data-state="revealed"]').first(),
  ).toBeVisible();

  const flagTarget = page.locator('.board-cell[data-state="hidden"]').first();
  const row = await flagTarget.getAttribute('data-row');
  const col = await flagTarget.getAttribute('data-col');

  expect(row).not.toBeNull();
  expect(col).not.toBeNull();

  const flaggedCell = page.locator(
    `.board-cell[data-row="${String(row)}"][data-col="${String(col)}"]`,
  );

  await flagTarget.click({ button: 'right' });

  await expect(flaggedCell).toHaveAttribute('data-state', 'flagged');
  await expect(page.getByLabel('Current game metrics')).toContainText('9');
});

test('toggles and persists the selected theme', async ({ page }) => {
  await page.goto('/');

  const html = page.locator('html');
  const initialTheme = await html.getAttribute('data-theme');

  await page
    .getByRole('button', { name: /Switch to (dark|light) theme/ })
    .click();

  const selectedTheme = await html.getAttribute('data-theme');

  expect(selectedTheme).not.toBeNull();
  expect(selectedTheme).not.toBe(initialTheme);

  await page.reload();

  await expect(html).toHaveAttribute('data-theme', String(selectedTheme));
});

test('toggles and persists sound effects', async ({ page }) => {
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Enable sound effects' });

  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();

  await expect(
    page.getByRole('button', { name: 'Mute sound effects' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.reload();

  await expect(
    page.getByRole('button', { name: 'Mute sound effects' }),
  ).toHaveAttribute('aria-pressed', 'true');
});
