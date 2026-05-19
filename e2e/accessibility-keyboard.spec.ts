import { expect, test, type Page } from '@playwright/test';

test('exposes labelled board cells and supports keyboard play', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('region', { name: 'Game board' })).toBeVisible();

  const firstCell = cellAt(page, 0, 0);
  const secondCell = cellAt(page, 0, 1);

  await expect(firstCell).toHaveAttribute(
    'aria-label',
    'Hidden cell, row 1, column 1',
  );
  await expect(firstCell).toHaveAttribute('tabindex', '0');

  await firstCell.focus();
  await page.keyboard.press('ArrowRight');

  await expect(secondCell).toBeFocused();
  await expect(firstCell).toHaveAttribute('tabindex', '-1');
  await expect(secondCell).toHaveAttribute('tabindex', '0');

  await page.keyboard.press('F');

  await expect(secondCell).toHaveAttribute('data-state', 'flagged');
  await expect(secondCell).toHaveAttribute(
    'aria-label',
    'Flagged cell, row 1, column 2',
  );
  await expect(page.locator('[data-status-mines]')).toHaveText('9');

  await page.keyboard.press('Enter');

  await expect(secondCell).toHaveAttribute('data-state', 'flagged');

  await page.keyboard.press('F');
  await expect(secondCell).toHaveAttribute('data-state', 'questioned');

  await page.keyboard.press('F');
  await expect(secondCell).toHaveAttribute('data-state', 'hidden');

  await page.keyboard.press('Space');

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );
  await expect(secondCell).toHaveAttribute('data-state', 'revealed');
  await expect(secondCell).toHaveAttribute(
    'aria-label',
    /^(No adjacent mines|\d mines? adjacent), row 1, column 2$/,
  );
});

function cellAt(page: Page, row: number, col: number) {
  return page.locator(
    `.board-cell[data-row="${String(row)}"][data-col="${String(col)}"]`,
  );
}
