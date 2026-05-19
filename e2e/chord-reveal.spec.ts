import { expect, test, type Page } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'Desktop-only chord reveal flow.');

const BOARD_SIZE = 5;
const MINE_COORDINATES = [
  { row: 0, col: 2 },
  { row: 3, col: 2 },
] as const;
const FIRST_CLICK = { row: 0, col: 0 };
const CHORD_TARGET = { row: 0, col: 1 };
const CHORD_SAFE_NEIGHBOR = { row: 1, col: 2 };

test('chord on a correctly flagged number reveals neighbors and completes a win', async ({
  page,
}) => {
  await startDeterministicChordGame(page);

  await cellAt(page, 0, 2).click({ button: 'right' });
  await expect(cellAt(page, 0, 2)).toHaveAttribute('data-state', 'flagged');

  await revealAllSafeCellsExcept(page, new Set([keyFor(CHORD_SAFE_NEIGHBOR)]));

  await expect(cellAt(page, 1, 2)).toHaveAttribute('data-state', 'hidden');
  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );

  await cellAt(page, CHORD_TARGET.row, CHORD_TARGET.col).dblclick();

  await expect(cellAt(page, 1, 2)).toHaveAttribute('data-state', 'revealed');
  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Won',
  );
  await expect(page.getByRole('status')).toContainText('You won');
});

test('chord with mismatched flag count is a no-op', async ({ page }) => {
  await startDeterministicChordGame(page);

  await cellAt(page, CHORD_TARGET.row, CHORD_TARGET.col).dblclick();

  await expect(cellAt(page, 1, 2)).toHaveAttribute('data-state', 'hidden');
  await expect(cellAt(page, 0, 2)).toHaveAttribute('data-state', 'hidden');
  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );
});

test('chord with an incorrectly placed flag triggers game over', async ({
  page,
}) => {
  await startDeterministicChordGame(page);

  await cellAt(page, 1, 2).click({ button: 'right' });
  await expect(cellAt(page, 1, 2)).toHaveAttribute('data-state', 'flagged');

  await cellAt(page, CHORD_TARGET.row, CHORD_TARGET.col).dblclick();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Lost',
  );
  await expect(page.getByRole('status')).toContainText('Game over');
  await expect(cellAt(page, 0, 2)).toHaveAttribute('data-state', 'revealed');
});

async function startDeterministicChordGame(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const values = [0, 0.6];
    let index = 0;

    Math.random = () => values[index++] ?? 0;
  });
  await page.goto('/');
  await configureCustomBoard(page);
  await cellAt(page, FIRST_CLICK.row, FIRST_CLICK.col).click();

  await expect(page.getByLabel('Game status', { exact: true })).toContainText(
    'Playing',
  );
  await expect(
    cellAt(page, CHORD_TARGET.row, CHORD_TARGET.col),
  ).toHaveAttribute('data-state', 'revealed');
  await expect(
    cellAt(page, CHORD_TARGET.row, CHORD_TARGET.col),
  ).toHaveAttribute('data-adjacent', '1');
  await expect(
    cellAt(page, CHORD_SAFE_NEIGHBOR.row, CHORD_SAFE_NEIGHBOR.col),
  ).toHaveAttribute('data-state', 'hidden');

  for (const mine of MINE_COORDINATES) {
    await expect(cellAt(page, mine.row, mine.col)).toHaveAttribute(
      'data-mine',
      'true',
    );
  }
}

async function configureCustomBoard(page: Page): Promise<void> {
  await page.locator('[data-controls-difficulty]').selectOption('custom');
  await page.locator('[data-controls-rows]').fill(String(BOARD_SIZE));
  await page.locator('[data-controls-cols]').fill(String(BOARD_SIZE));
  await page
    .locator('[data-controls-mines]')
    .fill(String(MINE_COORDINATES.length));
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.locator('.board-cell')).toHaveCount(
    BOARD_SIZE * BOARD_SIZE,
  );
}

async function revealAllSafeCellsExcept(
  page: Page,
  excludedKeys: ReadonlySet<string>,
): Promise<void> {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const coordinate = { row, col };

      if (
        isMineCoordinate(coordinate) ||
        excludedKeys.has(keyFor(coordinate))
      ) {
        continue;
      }

      await cellAt(page, row, col).click();
    }
  }
}

function cellAt(page: Page, row: number, col: number) {
  return page.locator(
    `.board-cell[data-row="${String(row)}"][data-col="${String(col)}"]`,
  );
}

function isMineCoordinate(coordinate: {
  readonly row: number;
  readonly col: number;
}): boolean {
  return MINE_COORDINATES.some(
    (mine) => mine.row === coordinate.row && mine.col === coordinate.col,
  );
}

function keyFor(coordinate: { readonly row: number; readonly col: number }) {
  return `${String(coordinate.row)}:${String(coordinate.col)}`;
}
