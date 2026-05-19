import type { Cell } from '../types';
import {
  computeAdjacentMineCounts,
  getBoardSize,
  getNeighborCoordinates,
  type Board,
  type Coordinate,
} from './board';

export type RandomSource = () => number;

export function placeMinesWithFirstClickSafety(
  board: Board,
  firstClick: Coordinate,
  mineCount: number,
  random: RandomSource = Math.random,
): Cell[][] {
  assertValidMineCount(mineCount);

  const size = getBoardSize(board);
  const safeKeys = getFirstClickSafeKeys(size, firstClick);
  const candidates = getAvailableMineCoordinates(size, safeKeys);

  if (mineCount > candidates.length) {
    throw new RangeError(
      `Cannot place ${String(mineCount)} mines with first-click safety; only ${String(candidates.length)} cells are available.`,
    );
  }

  const mineKeys = selectMineKeys(candidates, mineCount, random);
  const boardWithMines = board.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ...cell,
      row: rowIndex,
      col: colIndex,
      hasMine: mineKeys.has(keyFor({ row: rowIndex, col: colIndex })),
      adjacentMines: 0,
    })),
  );

  return computeAdjacentMineCounts(boardWithMines);
}

function getFirstClickSafeKeys(
  size: { readonly rows: number; readonly cols: number },
  firstClick: Coordinate,
): Set<string> {
  return new Set([
    keyFor(firstClick),
    ...getNeighborCoordinates(size, firstClick).map((neighbor) =>
      keyFor(neighbor),
    ),
  ]);
}

function getAvailableMineCoordinates(
  size: { readonly rows: number; readonly cols: number },
  safeKeys: ReadonlySet<string>,
): Coordinate[] {
  const coordinates: Coordinate[] = [];

  for (let row = 0; row < size.rows; row += 1) {
    for (let col = 0; col < size.cols; col += 1) {
      const coordinate = { row, col };

      if (!safeKeys.has(keyFor(coordinate))) {
        coordinates.push(coordinate);
      }
    }
  }

  return coordinates;
}

function selectMineKeys(
  candidates: readonly Coordinate[],
  mineCount: number,
  random: RandomSource,
): Set<string> {
  const shuffledCandidates = [...candidates];
  const mineKeys = new Set<string>();

  for (let index = 0; index < mineCount; index += 1) {
    const randomIndex =
      index +
      Math.floor(
        readRandomFraction(random) * (shuffledCandidates.length - index),
      );
    const selected = shuffledCandidates[randomIndex];
    const current = shuffledCandidates[index];

    if (selected === undefined || current === undefined) {
      throw new Error('Mine selection index was outside the candidate range.');
    }

    shuffledCandidates[index] = selected;
    shuffledCandidates[randomIndex] = current;
    mineKeys.add(keyFor(selected));
  }

  return mineKeys;
}

function readRandomFraction(random: RandomSource): number {
  const value = random();

  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Random source must return a number in [0, 1).');
  }

  return value;
}

function assertValidMineCount(mineCount: number): void {
  if (!Number.isInteger(mineCount) || mineCount < 0) {
    throw new RangeError('Mine count must be a non-negative integer.');
  }
}

function keyFor(coordinate: Coordinate): string {
  return `${String(coordinate.row)}:${String(coordinate.col)}`;
}
