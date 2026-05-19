import { expect, test } from '@playwright/test';

test('loads the built application', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('ZeroClaw');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ZeroClaw' }),
  ).toBeVisible();
  await expect(page.getByLabel('Game status')).toContainText('Ready');
  await expect(page.getByLabel('Game board')).toBeVisible();
});
