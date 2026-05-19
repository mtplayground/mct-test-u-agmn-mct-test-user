import { describe, expect, it } from 'vitest';

import type { Cell } from '../../src/types';
import { createEmptyBoard, getNeighborCoordinates } from '../../src/game/board';
import {
  placeMinesWithFirstClickSafety,
  type RandomSource,
} from '../../src/game/first-click';

import type { Board, Coordinate } from '../../src/game/board';

describe('placeMinesWithFirstClickSafety', () => {
  it('places the requested mines outside the first-click safe area', () => {
    const firstClick = { row: 2, col: 2 };
    const board = createEmptyBoard({ rows: 5, cols: 5 });
    const placedBoard = placeMinesWithFirstClickSafety(
      board,
      firstClick,
      6,
      sequenceRandom([0, 0.25, 0.5, 0.75, 0.1, 0.9]),
    );

    const safeKeys = safeCoordinateKeys({ rows: 5, cols: 5 }, firstClick);
    const mines = mineCoordinates(placedBoard);

    expect(mines).toHaveLength(6);
    expect(mines.every((mine) => !safeKeys.has(keyFor(mine)))).toBe(true);
    expect(cellAt(placedBoard, 2, 2).hasMine).toBe(false);
    expect(cellAt(placedBoard, 2, 2).adjacentMines).toBe(0);
    expect(cellAt(board, mines[0]?.row ?? 0, mines[0]?.col ?? 0).hasMine).toBe(
      false,
    );
  });

  it('computes adjacent mine counts after placement', () => {
    const placedBoard = placeMinesWithFirstClickSafety(
      createEmptyBoard({ rows: 4, cols: 4 }),
      { row: 0, col: 0 },
      2,
      sequenceRandom([0, 0]),
    );

    expect(cellAt(placedBoard, 0, 0).adjacentMines).toBe(0);
    expect(cellAt(placedBoard, 0, 2).hasMine).toBe(true);
    expect(cellAt(placedBoard, 0, 3).hasMine).toBe(true);
    expect(cellAt(placedBoard, 1, 1).adjacentMines).toBe(1);
    expect(cellAt(placedBoard, 1, 2).adjacentMines).toBe(2);
    expect(cellAt(placedBoard, 1, 3).adjacentMines).toBe(2);
  });

  it('rejects mine counts that exceed available cells', () => {
    expect(() =>
      placeMinesWithFirstClickSafety(
        createEmptyBoard({ rows: 3, cols: 3 }),
        { row: 1, col: 1 },
        1,
      ),
    ).toThrow(RangeError);
  });

  it('rejects invalid mine counts and first-click coordinates', () => {
    expect(() =>
      placeMinesWithFirstClickSafety(
        createEmptyBoard({ rows: 3, cols: 3 }),
        { row: 0, col: 0 },
        -1,
      ),
    ).toThrow(RangeError);

    expect(() =>
      placeMinesWithFirstClickSafety(
        createEmptyBoard({ rows: 3, cols: 3 }),
        { row: 3, col: 0 },
        1,
      ),
    ).toThrow(RangeError);
  });

  it('can distribute a single mine to every available cell', () => {
    const firstClick = { row: 0, col: 0 };
    const size = { rows: 4, cols: 4 };
    const safeKeys = safeCoordinateKeys(size, firstClick);
    const availableCoordinates = allCoordinates(size).filter(
      (coordinate) => !safeKeys.has(keyFor(coordinate)),
    );
    const seenMineKeys = new Set<string>();

    availableCoordinates.forEach((_coordinate, index) => {
      const placedBoard = placeMinesWithFirstClickSafety(
        createEmptyBoard(size),
        firstClick,
        1,
        () => (index + 0.5) / availableCoordinates.length,
      );

      const mine = onlyMine(placedBoard);
      seenMineKeys.add(keyFor(mine));
    });

    expect(seenMineKeys).toEqual(
      new Set(availableCoordinates.map((coordinate) => keyFor(coordinate))),
    );
  });

  it('rejects random sources outside the expected range', () => {
    expect(() =>
      placeMinesWithFirstClickSafety(
        createEmptyBoard({ rows: 4, cols: 4 }),
        { row: 0, col: 0 },
        1,
        () => 1,
      ),
    ).toThrow(RangeError);
  });
});

function sequenceRandom(values: readonly number[]): RandomSource {
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index += 1;

    if (value === undefined) {
      throw new Error('Expected a random value.');
    }

    return value;
  };
}

function safeCoordinateKeys(
  size: { readonly rows: number; readonly cols: number },
  firstClick: Coordinate,
): Set<string> {
  return new Set([
    keyFor(firstClick),
    ...getNeighborCoordinates(size, firstClick).map((coordinate) =>
      keyFor(coordinate),
    ),
  ]);
}

function allCoordinates(size: {
  readonly rows: number;
  readonly cols: number;
}): Coordinate[] {
  const coordinates: Coordinate[] = [];

  for (let row = 0; row < size.rows; row += 1) {
    for (let col = 0; col < size.cols; col += 1) {
      coordinates.push({ row, col });
    }
  }

  return coordinates;
}

function mineCoordinates(board: Board): Coordinate[] {
  return board
    .flat()
    .filter((cell) => cell.hasMine)
    .map((cell) => ({ row: cell.row, col: cell.col }));
}

function onlyMine(board: Board): Coordinate {
  const mines = mineCoordinates(board);
  const mine = mines[0];

  if (mine === undefined || mines.length !== 1) {
    throw new Error(
      `Expected exactly one mine, found ${String(mines.length)}.`,
    );
  }

  return mine;
}

function cellAt(board: Board, row: number, col: number): Cell {
  const cell = board[row]?.[col];

  if (cell === undefined) {
    throw new Error(`Expected cell at row ${String(row)}, col ${String(col)}.`);
  }

  return cell;
}

function keyFor(coordinate: Coordinate): string {
  return `${String(coordinate.row)}:${String(coordinate.col)}`;
}
