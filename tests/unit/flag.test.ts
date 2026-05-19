import { describe, expect, it } from 'vitest';

import type { Cell, CellState } from '../../src/types';
import { createEmptyBoard, type Board } from '../../src/game/board';
import { cycleCellMark, getRemainingMineCount } from '../../src/game/flag';

describe('cycleCellMark', () => {
  it('cycles hidden to flagged to questioned to hidden', () => {
    const board = createEmptyBoard({ rows: 1, cols: 1 });

    const flagged = cycleCellMark(board, { row: 0, col: 0 });
    const questioned = cycleCellMark(flagged.board, { row: 0, col: 0 });
    const hidden = cycleCellMark(questioned.board, { row: 0, col: 0 });

    expect(flagged.status).toBe('changed');
    expect(flagged.state).toBe('flagged');
    expect(cellAt(flagged.board, 0, 0).state).toBe('flagged');
    expect(questioned.state).toBe('questioned');
    expect(cellAt(questioned.board, 0, 0).state).toBe('questioned');
    expect(hidden.state).toBe('hidden');
    expect(cellAt(hidden.board, 0, 0).state).toBe('hidden');
    expect(cellAt(board, 0, 0).state).toBe('hidden');
  });

  it('does not change revealed cells', () => {
    const board = withCellStates(createEmptyBoard({ rows: 1, cols: 1 }), [
      ['revealed'],
    ]);

    const result = cycleCellMark(board, { row: 0, col: 0 });

    expect(result.status).toBe('ignored');
    expect(result.state).toBe('revealed');
    expect(cellAt(result.board, 0, 0).state).toBe('revealed');
    expect(cellAt(board, 0, 0).state).toBe('revealed');
  });

  it('rejects out-of-bounds coordinates', () => {
    expect(() =>
      cycleCellMark(createEmptyBoard({ rows: 1, cols: 1 }), { row: 1, col: 0 }),
    ).toThrow(RangeError);
  });
});

describe('getRemainingMineCount', () => {
  it('subtracts flagged cells from the total mine count', () => {
    const board = withCellStates(createEmptyBoard({ rows: 2, cols: 3 }), [
      ['flagged', 'questioned', 'hidden'],
      ['flagged', 'revealed', 'hidden'],
    ]);

    expect(getRemainingMineCount(board, 5)).toBe(3);
  });

  it('allows the counter to go negative when too many cells are flagged', () => {
    const board = withCellStates(createEmptyBoard({ rows: 1, cols: 2 }), [
      ['flagged', 'flagged'],
    ]);

    expect(getRemainingMineCount(board, 1)).toBe(-1);
  });

  it('rejects invalid total mine counts', () => {
    expect(() =>
      getRemainingMineCount(createEmptyBoard({ rows: 1, cols: 1 }), -1),
    ).toThrow(RangeError);
  });
});

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

function cellAt(board: Board, row: number, col: number): Cell {
  const cell = board[row]?.[col];

  if (cell === undefined) {
    throw new Error(`Expected cell at row ${String(row)}, col ${String(col)}.`);
  }

  return cell;
}
