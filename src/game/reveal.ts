import type { Cell, CellState } from '../types';
import {
  getBoardSize,
  getNeighborCoordinates,
  isCoordinateInBounds,
  type Board,
  type Coordinate,
} from './board';

export type RevealStatus = 'revealed' | 'hit-mine' | 'ignored';

export interface RevealResult {
  readonly board: Cell[][];
  readonly status: RevealStatus;
  readonly hitMine: boolean;
  readonly revealed: readonly Coordinate[];
}

export function revealCell(board: Board, coordinate: Coordinate): RevealResult {
  const size = getBoardSize(board);

  if (!isCoordinateInBounds(size, coordinate)) {
    throw new RangeError(
      `Coordinate (${String(coordinate.row)}, ${String(coordinate.col)}) is outside a ${String(size.rows)}x${String(size.cols)} board.`,
    );
  }

  const nextBoard = cloneBoard(board);
  const target = getCell(nextBoard, coordinate);

  if (target.state === 'revealed' || target.state === 'flagged') {
    return {
      board: nextBoard,
      status: 'ignored',
      hitMine: false,
      revealed: [],
    };
  }

  if (target.hasMine) {
    return {
      board: nextBoard,
      status: 'hit-mine',
      hitMine: true,
      revealed: revealAllMines(nextBoard),
    };
  }

  const revealed = revealSafeRegion(nextBoard, coordinate);

  return {
    board: nextBoard,
    status: revealed.length > 0 ? 'revealed' : 'ignored',
    hitMine: false,
    revealed,
  };
}

export function revealAdjacentCells(
  board: Board,
  coordinate: Coordinate,
): RevealResult {
  const size = getBoardSize(board);

  if (!isCoordinateInBounds(size, coordinate)) {
    throw new RangeError(
      `Coordinate (${String(coordinate.row)}, ${String(coordinate.col)}) is outside a ${String(size.rows)}x${String(size.cols)} board.`,
    );
  }

  let nextBoard = cloneBoard(board);
  const target = getCell(nextBoard, coordinate);

  if (target.state !== 'revealed' || target.adjacentMines === 0) {
    return {
      board: nextBoard,
      status: 'ignored',
      hitMine: false,
      revealed: [],
    };
  }

  const neighbors = getNeighborCoordinates(size, coordinate);
  const flaggedNeighborCount = neighbors.filter(
    (neighbor) => getCell(nextBoard, neighbor).state === 'flagged',
  ).length;

  if (flaggedNeighborCount !== target.adjacentMines) {
    return {
      board: nextBoard,
      status: 'ignored',
      hitMine: false,
      revealed: [],
    };
  }

  const revealed: Coordinate[] = [];

  for (const neighbor of neighbors) {
    const neighborCell = getCell(nextBoard, neighbor);

    if (neighborCell.state === 'flagged') {
      continue;
    }

    const revealResult = revealCell(nextBoard, neighbor);
    nextBoard = revealResult.board;
    revealed.push(...revealResult.revealed);

    if (revealResult.hitMine) {
      return {
        board: nextBoard,
        status: 'hit-mine',
        hitMine: true,
        revealed,
      };
    }
  }

  return {
    board: nextBoard,
    status: revealed.length > 0 ? 'revealed' : 'ignored',
    hitMine: false,
    revealed,
  };
}

function revealSafeRegion(board: Cell[][], start: Coordinate): Coordinate[] {
  const size = getBoardSize(board);
  const queue: Coordinate[] = [start];
  const visited = new Set<string>();
  const revealed: Coordinate[] = [];

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const coordinate = queue[queueIndex];

    if (coordinate === undefined) {
      throw new Error('Reveal queue index was outside the queued range.');
    }

    const coordinateKey = keyFor(coordinate);

    if (visited.has(coordinateKey)) {
      continue;
    }

    visited.add(coordinateKey);

    const cell = getCell(board, coordinate);

    if (cell.state === 'revealed' || cell.state === 'flagged' || cell.hasMine) {
      continue;
    }

    revealAt(board, coordinate);
    revealed.push(coordinate);

    if (cell.adjacentMines !== 0) {
      continue;
    }

    getNeighborCoordinates(size, coordinate).forEach((neighbor) => {
      const neighborCell = getCell(board, neighbor);

      if (
        neighborCell.state !== 'revealed' &&
        neighborCell.state !== 'flagged' &&
        !neighborCell.hasMine
      ) {
        queue.push(neighbor);
      }
    });
  }

  return revealed;
}

function revealAllMines(board: Cell[][]): Coordinate[] {
  const revealed: Coordinate[] = [];

  board.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell.hasMine) {
        revealAt(board, { row: rowIndex, col: colIndex });
        revealed.push({ row: rowIndex, col: colIndex });
      }
    });
  });

  return revealed;
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

function revealAt(board: Cell[][], coordinate: Coordinate): Cell {
  return replaceCellState(board, coordinate, 'revealed');
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

function keyFor(coordinate: Coordinate): string {
  return `${String(coordinate.row)}:${String(coordinate.col)}`;
}
