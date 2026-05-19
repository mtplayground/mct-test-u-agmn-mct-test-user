import { describe, expect, it } from 'vitest';

import type { Cell, CellState } from '../../src/types';
import {
  computeAdjacentMineCounts,
  createEmptyBoard,
  type Board,
  type Coordinate,
} from '../../src/game/board';
import { revealCell } from '../../src/game/reveal';

describe('revealCell', () => {
  it('reveals a clicked numbered cell without cascading', () => {
    const board = withAdjacentCounts(createEmptyBoard({ rows: 1, cols: 3 }), [
      [1, 1, 0],
    ]);

    const result = revealCell(board, { row: 0, col: 0 });

    expect(result.status).toBe('revealed');
    expect(result.hitMine).toBe(false);
    expect(result.revealed).toEqual([{ row: 0, col: 0 }]);
    expect(cellAt(result.board, 0, 0).state).toBe('revealed');
    expect(cellAt(result.board, 0, 1).state).toBe('hidden');
    expect(cellAt(result.board, 0, 2).state).toBe('hidden');
    expect(cellAt(board, 0, 0).state).toBe('hidden');
  });

  it('flood-fills zero-adjacency cells and reveals numbered boundaries', () => {
    const board = withAdjacentCounts(createEmptyBoard({ rows: 1, cols: 4 }), [
      [0, 1, 0, 0],
    ]);

    const result = revealCell(board, { row: 0, col: 0 });

    expect(result.status).toBe('revealed');
    expect(revealedKeys(result.board)).toEqual(new Set(['0:0', '0:1']));
    expect(cellAt(result.board, 0, 2).state).toBe('hidden');
    expect(cellAt(result.board, 0, 3).state).toBe('hidden');
  });

  it('cascades through connected empty regions', () => {
    const board = withAdjacentCounts(createEmptyBoard({ rows: 3, cols: 3 }), [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ]);

    const result = revealCell(board, { row: 0, col: 0 });

    expect(revealedKeys(result.board)).toEqual(
      new Set(['0:0', '0:1', '0:2', '1:0', '1:1', '1:2', '2:0', '2:1']),
    );
    expect(cellAt(result.board, 2, 2).state).toBe('hidden');
  });

  it('reveals mines and reports a loss when a mine is clicked', () => {
    const board = computeAdjacentMineCounts(
      withMines(createEmptyBoard({ rows: 3, cols: 3 }), [
        { row: 0, col: 0 },
        { row: 2, col: 2 },
      ]),
    );

    const result = revealCell(board, { row: 0, col: 0 });

    expect(result.status).toBe('hit-mine');
    expect(result.hitMine).toBe(true);
    expect(result.revealed).toEqual([
      { row: 0, col: 0 },
      { row: 2, col: 2 },
    ]);
    expect(cellAt(result.board, 0, 0).state).toBe('revealed');
    expect(cellAt(result.board, 2, 2).state).toBe('revealed');
    expect(cellAt(result.board, 1, 1).state).toBe('hidden');
  });

  it('ignores flagged and already revealed cells', () => {
    const flaggedBoard = withCellStates(
      createEmptyBoard({ rows: 1, cols: 2 }),
      [['flagged', 'hidden']],
    );
    const flaggedResult = revealCell(flaggedBoard, { row: 0, col: 0 });
    const revealedBoard = withCellStates(
      createEmptyBoard({ rows: 1, cols: 2 }),
      [['revealed', 'hidden']],
    );
    const revealedResult = revealCell(revealedBoard, { row: 0, col: 0 });

    expect(flaggedResult.status).toBe('ignored');
    expect(flaggedResult.revealed).toEqual([]);
    expect(cellAt(flaggedResult.board, 0, 0).state).toBe('flagged');
    expect(revealedResult.status).toBe('ignored');
  });

  it('rejects out-of-bounds reveal coordinates', () => {
    expect(() =>
      revealCell(createEmptyBoard({ rows: 2, cols: 2 }), { row: 2, col: 0 }),
    ).toThrow(RangeError);
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

function withAdjacentCounts(
  board: Board,
  adjacentCounts: readonly (readonly number[])[],
): Cell[][] {
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ...cell,
      adjacentMines: adjacentCounts[rowIndex]?.[colIndex] ?? cell.adjacentMines,
    })),
  );
}

function withCellStates(
  board: Board,
  states: readonly (readonly CellState[])[],
): Cell[][] {
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ...cell,
      state: states[rowIndex]?.[colIndex] ?? cell.state,
    })),
  );
}

function revealedKeys(board: Board): Set<string> {
  return new Set(
    board
      .flat()
      .filter((cell) => cell.state === 'revealed')
      .map((cell) => keyFor(cell)),
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
