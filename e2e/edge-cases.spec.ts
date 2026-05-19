import { expect, test, type Page } from '@playwright/test';

test('blocks invalid custom board inputs without restarting', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.locator('.board-cell')).toHaveCount(64);

  await page.locator('[data-controls-difficulty]').selectOption('custom');
  await page.locator('[data-controls-rows]').fill('4');
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.locator('[data-controls-error]')).toContainText('Rows');
  await expect(page.locator('.board-cell')).toHaveCount(64);

  await page.locator('[data-controls-rows]').fill('5');
  await page.locator('[data-controls-cols]').fill('5');
  await page.locator('[data-controls-mines]').fill('16');
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.locator('[data-controls-error]')).toContainText('15');
  await expect(page.locator('.board-cell')).toHaveCount(64);

  await page.locator('[data-controls-rows]').fill('5.5');

  await expect(page.locator('[data-controls-error]')).toContainText('Rows');
});

test('ignores board actions after a loss', async ({ page }) => {
  await page.goto('/');
  await configureCustomBoard(page);
  await cellAt(page, 0, 0).click();

  const mine = await getFirstCoordinate(page, '.board-cell[data-mine="true"]');

  await cellAt(page, mine.row, mine.col).click();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Lost',
  );

  const safeHidden = await getFirstCoordinate(
    page,
    '.board-cell[data-mine="false"][data-state="hidden"]',
  );
  const safeCell = cellAt(page, safeHidden.row, safeHidden.col);

  await safeCell.click();
  await safeCell.click({ button: 'right' });

  await expect(safeCell).toHaveAttribute('data-state', 'hidden');
});

test('rapid restart clears pending long-press state', async ({ page }) => {
  await page.goto('/');

  const firstCell = cellAt(page, 0, 0);

  await firstCell.dispatchEvent('pointerdown', {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForTimeout(450);

  await expect(page.locator('.board-cell[data-state="flagged"]')).toHaveCount(
    0,
  );
  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Ready',
  );
});

async function configureCustomBoard(page: Page): Promise<void> {
  await page.locator('[data-controls-difficulty]').selectOption('custom');
  await page.locator('[data-controls-rows]').fill('5');
  await page.locator('[data-controls-cols]').fill('5');
  await page.locator('[data-controls-mines]').fill('15');
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.locator('.board-cell')).toHaveCount(25);
}

function cellAt(page: Page, row: number, col: number) {
  return page.locator(
    `.board-cell[data-row="${String(row)}"][data-col="${String(col)}"]`,
  );
}

async function getFirstCoordinate(
  page: Page,
  selector: string,
): Promise<{ readonly row: number; readonly col: number }> {
  const coordinates = await page.locator(selector).evaluateAll((cells) =>
    cells.map((cell) => {
      const element = cell as HTMLElement;

      return {
        row: Number.parseInt(element.dataset.row ?? '', 10),
        col: Number.parseInt(element.dataset.col ?? '', 10),
      };
    }),
  );
  const coordinate = coordinates[0];

  if (coordinate === undefined) {
    throw new Error(`No cell matched selector ${selector}.`);
  }

  return coordinate;
}
