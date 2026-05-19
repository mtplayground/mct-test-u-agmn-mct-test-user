import type { BoardConfig, Cell } from '../types';

export interface Coordinate {
  readonly row: number;
  readonly col: number;
}

export type Board = readonly (readonly Cell[])[];

type BoardSize = Pick<BoardConfig, 'rows' | 'cols'>;

export function createEmptyBoard(config: BoardSize): Cell[][] {
  assertValidBoardSize(config);

  return Array.from({ length: config.rows }, (_rowValue, row) =>
    Array.from(
      { length: config.cols },
      (_colValue, col): Cell => ({
        row,
        col,
        hasMine: false,
        adjacentMines: 0,
        state: 'hidden',
      }),
    ),
  );
}

export function isCoordinateInBounds(
  size: BoardSize,
  coordinate: Coordinate,
): boolean {
  return (
    Number.isInteger(coordinate.row) &&
    Number.isInteger(coordinate.col) &&
    coordinate.row >= 0 &&
    coordinate.row < size.rows &&
    coordinate.col >= 0 &&
    coordinate.col < size.cols
  );
}

export function getNeighborCoordinates(
  size: BoardSize,
  coordinate: Coordinate,
): Coordinate[] {
  assertValidBoardSize(size);

  if (!isCoordinateInBounds(size, coordinate)) {
    throw new RangeError(
      `Coordinate (${String(coordinate.row)}, ${String(coordinate.col)}) is outside a ${String(size.rows)}x${String(size.cols)} board.`,
    );
  }

  const neighbors: Coordinate[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const neighbor = {
        row: coordinate.row + rowOffset,
        col: coordinate.col + colOffset,
      };

      if (isCoordinateInBounds(size, neighbor)) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

export function computeAdjacentMineCounts(board: Board): Cell[][] {
  const size = getBoardSize(board);

  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      adjacentMines: getNeighborCoordinates(size, cell).filter((neighbor) =>
        hasMineAt(board, neighbor),
      ).length,
    })),
  );
}

export function getBoardSize(board: Board): BoardSize {
  if (board.length === 0) {
    throw new RangeError('Board must have at least one row.');
  }

  const cols = board[0]?.length ?? 0;

  if (cols === 0) {
    throw new RangeError('Board must have at least one column.');
  }

  board.forEach((row, rowIndex) => {
    if (row.length !== cols) {
      throw new RangeError(
        `Board row ${String(rowIndex)} has ${String(row.length)} columns; expected ${String(cols)}.`,
      );
    }
  });

  return { rows: board.length, cols };
}

function hasMineAt(board: Board, coordinate: Coordinate): boolean {
  return board[coordinate.row]?.[coordinate.col]?.hasMine === true;
}

function assertValidBoardSize(size: BoardSize): void {
  assertPositiveInteger(size.rows, 'rows');
  assertPositiveInteger(size.cols, 'cols');
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`Board ${name} must be a positive integer.`);
  }
}
