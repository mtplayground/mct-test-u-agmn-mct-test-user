import { expect, test, type Page } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'Desktop-only full play flow.');

test('wins after flagging the mine and revealing every safe cell', async ({
  page,
}) => {
  await page.goto('/');
  await configureCustomBoard(page);

  await cellAt(page, 0, 0).click();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );
  await expect(page.locator('[data-status-timer]')).toHaveText(/0:0[1-9]/, {
    timeout: 2500,
  });

  const mine = await getFirstCoordinate(page, '.board-cell[data-mine="true"]');

  await cellAt(page, mine.row, mine.col).click({ button: 'right' });

  await expect(cellAt(page, mine.row, mine.col)).toHaveAttribute(
    'data-state',
    'flagged',
  );
  await expect(page.locator('[data-status-mines]')).toHaveText('14');

  const safeCells = await getCoordinates(
    page,
    '.board-cell[data-mine="false"]',
  );

  for (const coordinate of safeCells) {
    await cellAt(page, coordinate.row, coordinate.col).click();
  }

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Won',
  );
  await expect(page.getByRole('status')).toContainText('You won');
});

test('loses after revealing a mine', async ({ page }) => {
  await page.goto('/');
  await configureCustomBoard(page);

  await cellAt(page, 0, 0).click();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );
  await expect(page.locator('[data-status-timer]')).toHaveText(/0:0\d/);

  const mine = await getFirstCoordinate(page, '.board-cell[data-mine="true"]');

  await cellAt(page, mine.row, mine.col).click();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Lost',
  );
  await expect(page.getByRole('status')).toContainText('Game over');
  await expect(cellAt(page, mine.row, mine.col)).toHaveAttribute(
    'data-state',
    'revealed',
  );
});

async function configureCustomBoard(page: Page): Promise<void> {
  await page.locator('[data-controls-difficulty]').selectOption('custom');
  await page.locator('[data-controls-rows]').fill('5');
  await page.locator('[data-controls-cols]').fill('5');
  await page.locator('[data-controls-mines]').fill('15');
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.locator('.board-cell')).toHaveCount(25);
  await expect(page.getByRole('button', { name: 'Hint (3)' })).toBeEnabled();
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
  const coordinates = await getCoordinates(page, selector);
  const coordinate = coordinates[0];

  if (coordinate === undefined) {
    throw new Error(`No cell matched selector ${selector}.`);
  }

  return coordinate;
}

async function getCoordinates(
  page: Page,
  selector: string,
): Promise<readonly { readonly row: number; readonly col: number }[]> {
  return page.locator(selector).evaluateAll((cells) =>
    cells.map((cell) => {
      const element = cell as HTMLElement;

      return {
        row: Number.parseInt(element.dataset.row ?? '', 10),
        col: Number.parseInt(element.dataset.col ?? '', 10),
      };
    }),
  );
}
