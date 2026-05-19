import { expect, test, type Locator, type Page } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'Mobile-only touch flow.');

test('reveals with tap and flags with long press', async ({ page }) => {
  await page.goto('/');

  const board = page.getByRole('grid', { name: 'Game board' });

  await expect(board).toHaveCSS('touch-action', 'none');

  await cellAt(page, 0, 0).tap();

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

  const flaggedCell = cellAt(page, Number(row), Number(col));

  await longPress(page, flagTarget);

  await expect(flaggedCell).toHaveAttribute('data-state', 'flagged');
  await expect(page.locator('[data-status-mines]')).toHaveText('9');
});

test('fits the layout at a 320px mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'ZeroClaw' })).toBeVisible();
  await expect(page.getByRole('grid', { name: 'Game board' })).toBeVisible();

  const layout = await page.evaluate(() => ({
    htmlWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    boardWidth:
      document
        .querySelector<HTMLElement>('[data-board-view]')
        ?.getBoundingClientRect().width ?? 0,
    controlsTop:
      document
        .querySelector<HTMLElement>('[data-controls]')
        ?.getBoundingClientRect().top ?? 0,
    boardTop:
      document
        .querySelector<HTMLElement>('[data-board-view]')
        ?.getBoundingClientRect().top ?? 0,
  }));

  expect(layout.htmlWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.boardWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.controlsTop).toBeGreaterThan(layout.boardTop);
});

function cellAt(page: Page, row: number, col: number): Locator {
  return page.locator(
    `.board-cell[data-row="${String(row)}"][data-col="${String(col)}"]`,
  );
}

async function longPress(page: Page, target: Locator): Promise<void> {
  await target.dispatchEvent('pointerdown', {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
  await page.waitForTimeout(450);
  await target.dispatchEvent('pointerup', {
    button: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'touch',
  });
}
