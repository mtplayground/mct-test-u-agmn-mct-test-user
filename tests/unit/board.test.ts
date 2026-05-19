import { describe, expect, it } from 'vitest';

import type { Cell } from '../../src/types';
import {
  computeAdjacentMineCounts,
  createEmptyBoard,
  getBoardSize,
  getNeighborCoordinates,
  isCoordinateInBounds,
  type Board,
  type Coordinate,
} from '../../src/game/board';

describe('createEmptyBoard', () => {
  it('creates hidden cells without mines or adjacent counts', () => {
    const board = createEmptyBoard({ rows: 2, cols: 3 });

    expect(board).toHaveLength(2);
    expect(board[0]).toHaveLength(3);
    expect(cellAt(board, 1, 2)).toEqual({
      row: 1,
      col: 2,
      hasMine: false,
      adjacentMines: 0,
      state: 'hidden',
    });
  });

  it('rejects non-positive dimensions', () => {
    expect(() => createEmptyBoard({ rows: 0, cols: 3 })).toThrow(RangeError);
    expect(() => createEmptyBoard({ rows: 2, cols: -1 })).toThrow(RangeError);
  });
});

describe('coordinate helpers', () => {
  it('detects whether coordinates are inside the board', () => {
    const size = { rows: 2, cols: 3 };

    expect(isCoordinateInBounds(size, { row: 0, col: 0 })).toBe(true);
    expect(isCoordinateInBounds(size, { row: 1, col: 2 })).toBe(true);
    expect(isCoordinateInBounds(size, { row: -1, col: 0 })).toBe(false);
    expect(isCoordinateInBounds(size, { row: 2, col: 0 })).toBe(false);
    expect(isCoordinateInBounds(size, { row: 0, col: 3 })).toBe(false);
  });

  it('returns three neighbors for a corner cell', () => {
    expect(
      getNeighborCoordinates({ rows: 3, cols: 3 }, { row: 0, col: 0 }),
    ).toEqual([
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
  });

  it('returns five neighbors for an edge cell', () => {
    expect(
      getNeighborCoordinates({ rows: 3, cols: 3 }, { row: 0, col: 1 }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ]);
  });

  it('returns eight neighbors for a center cell', () => {
    expect(
      getNeighborCoordinates({ rows: 3, cols: 3 }, { row: 1, col: 1 }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ]);
  });

  it('rejects neighbor lookup for out-of-bounds coordinates', () => {
    expect(() =>
      getNeighborCoordinates({ rows: 2, cols: 2 }, { row: 2, col: 0 }),
    ).toThrow(RangeError);
  });
});

describe('computeAdjacentMineCounts', () => {
  it('computes mine counts around placed mines without mutating the board', () => {
    const board = withMines(createEmptyBoard({ rows: 3, cols: 3 }), [
      { row: 0, col: 0 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ]);

    const countedBoard = computeAdjacentMineCounts(board);

    expect(cellAt(board, 1, 1).adjacentMines).toBe(0);
    expect(cellAt(countedBoard, 0, 0).hasMine).toBe(true);
    expect(cellAt(countedBoard, 0, 0).adjacentMines).toBe(0);
    expect(cellAt(countedBoard, 0, 1).adjacentMines).toBe(2);
    expect(cellAt(countedBoard, 1, 1).adjacentMines).toBe(3);
    expect(cellAt(countedBoard, 2, 2).adjacentMines).toBe(2);
  });

  it('rejects ragged boards', () => {
    const raggedBoard: Board = [
      [
        {
          row: 0,
          col: 0,
          hasMine: false,
          adjacentMines: 0,
          state: 'hidden',
        },
      ],
      [],
    ];

    expect(() => getBoardSize(raggedBoard)).toThrow(RangeError);
    expect(() => computeAdjacentMineCounts(raggedBoard)).toThrow(RangeError);
  });
});

function withMines(board: Board, mines: readonly Coordinate[]): Cell[][] {
  const mineKeys = new Set(mines.map((mine) => keyFor(mine)));

  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      hasMine: mineKeys.has(keyFor(cell)),
    })),
  );
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
