import type { Cell, CellState } from '../types';
import {
  getBoardSize,
  isCoordinateInBounds,
  type Board,
  type Coordinate,
} from './board';

export type MarkCycleStatus = 'changed' | 'ignored';

export interface MarkCycleResult {
  readonly board: Cell[][];
  readonly status: MarkCycleStatus;
  readonly state: CellState;
}

export function cycleCellMark(
  board: Board,
  coordinate: Coordinate,
): MarkCycleResult {
  const size = getBoardSize(board);

  if (!isCoordinateInBounds(size, coordinate)) {
    throw new RangeError(
      `Coordinate (${String(coordinate.row)}, ${String(coordinate.col)}) is outside a ${String(size.rows)}x${String(size.cols)} board.`,
    );
  }

  const nextBoard = cloneBoard(board);
  const cell = getCell(nextBoard, coordinate);
  const nextState = getNextMarkState(cell.state);

  if (nextState === null) {
    return {
      board: nextBoard,
      status: 'ignored',
      state: cell.state,
    };
  }

  replaceCellState(nextBoard, coordinate, nextState);

  return {
    board: nextBoard,
    status: 'changed',
    state: nextState,
  };
}

export function getRemainingMineCount(
  board: Board,
  totalMines: number,
): number {
  assertValidTotalMines(totalMines);
  getBoardSize(board);

  const flaggedCells = board.flat().filter((cell) => cell.state === 'flagged');

  return totalMines - flaggedCells.length;
}

function getNextMarkState(state: CellState): CellState | null {
  switch (state) {
    case 'hidden':
      return 'flagged';
    case 'flagged':
      return 'questioned';
    case 'questioned':
      return 'hidden';
    case 'revealed':
      return null;
  }
}

function cloneBoard(board: Board): Cell[][] {
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ...cell,
      row: rowIndex,
      col: colIndex,
    })),
  );
}

function replaceCellState(
  board: Cell[][],
  coordinate: Coordinate,
  state: CellState,
): Cell {
  const row = board[coordinate.row];

  if (row === undefined) {
    throw new RangeError(`Board row ${String(coordinate.row)} was not found.`);
  }

  const cell = row[coordinate.col];

  if (cell === undefined) {
    throw new RangeError(
      `Board cell (${String(coordinate.row)}, ${String(coordinate.col)}) was not found.`,
    );
  }

  const updatedCell = { ...cell, state };
  row[coordinate.col] = updatedCell;

  return updatedCell;
}

function getCell(board: Board, coordinate: Coordinate): Cell {
  const cell = board[coordinate.row]?.[coordinate.col];

  if (cell === undefined) {
    throw new RangeError(
      `Board cell (${String(coordinate.row)}, ${String(coordinate.col)}) was not found.`,
    );
  }

  return cell;
}

function assertValidTotalMines(totalMines: number): void {
  if (!Number.isInteger(totalMines) || totalMines < 0) {
    throw new RangeError('Total mines must be a non-negative integer.');
  }
}
