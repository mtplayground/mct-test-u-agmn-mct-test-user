import type { BoardConfig, Cell, GameState } from '../types';
import {
  createEmptyBoard,
  getBoardSize,
  isCoordinateInBounds,
  type Board,
  type Coordinate,
} from './board';
import { cycleCellMark, getRemainingMineCount } from './flag';
import {
  placeMinesWithFirstClickSafety,
  type RandomSource,
} from './first-click';
import { revealCell } from './reveal';

export type GameAction =
  | { readonly type: 'reveal'; readonly coordinate: Coordinate }
  | { readonly type: 'flag'; readonly coordinate: Coordinate };

export type GameActionStatus =
  | 'started'
  | 'revealed'
  | 'marked'
  | 'won'
  | 'lost'
  | 'ignored';

export interface GameActionResult {
  readonly state: GameState;
  readonly status: GameActionStatus;
}

export interface DispatchOptions {
  readonly now?: () => number;
  readonly random?: RandomSource;
}

export function createGameState(config: BoardConfig): GameState {
  assertValidBoardConfig(config);

  return {
    config,
    status: 'ready',
    cells: createEmptyBoard(config),
    startedAt: null,
    endedAt: null,
    elapsedSeconds: 0,
    remainingMines: config.mines,
    revealedCount: 0,
  };
}

export function dispatchGameAction(
  state: GameState,
  action: GameAction,
  options: DispatchOptions = {},
): GameActionResult {
  if (isTerminalStatus(state.status)) {
    return { state, status: 'ignored' };
  }

  if (action.type === 'flag') {
    return dispatchFlagAction(state, action.coordinate, options);
  }

  return dispatchRevealAction(state, action.coordinate, options);
}

export function hasWonGame(board: Board): boolean {
  getBoardSize(board);

  return board
    .flat()
    .every((cell) => cell.hasMine || cell.state === 'revealed');
}

function dispatchFlagAction(
  state: GameState,
  coordinate: Coordinate,
  options: DispatchOptions,
): GameActionResult {
  const markResult = cycleCellMark(state.cells, coordinate);

  if (markResult.status === 'ignored') {
    return { state, status: 'ignored' };
  }

  return {
    state: {
      ...state,
      cells: markResult.board,
      elapsedSeconds: getElapsedSeconds(state, readNow(options)),
      remainingMines: getRemainingMineCount(
        markResult.board,
        state.config.mines,
      ),
    },
    status: 'marked',
  };
}

function dispatchRevealAction(
  state: GameState,
  coordinate: Coordinate,
  options: DispatchOptions,
): GameActionResult {
  assertCoordinateInBounds(state.cells, coordinate);

  const targetState = getCell(state.cells, coordinate).state;

  if (targetState === 'flagged' || targetState === 'revealed') {
    return { state, status: 'ignored' };
  }

  const now = readNow(options);
  const startedAt = state.startedAt ?? now;
  const board =
    state.status === 'ready'
      ? placeMinesWithFirstClickSafety(
          state.cells,
          coordinate,
          state.config.mines,
          options.random,
        )
      : state.cells;
  const revealResult = revealCell(board, coordinate);

  if (revealResult.status === 'ignored') {
    return { state, status: 'ignored' };
  }

  if (revealResult.hitMine) {
    return {
      state: buildStateAfterReveal(state, {
        cells: revealResult.board,
        status: 'lost',
        startedAt,
        endedAt: now,
        now,
      }),
      status: 'lost',
    };
  }

  if (hasWonGame(revealResult.board)) {
    return {
      state: buildStateAfterReveal(state, {
        cells: revealResult.board,
        status: 'won',
        startedAt,
        endedAt: now,
        now,
      }),
      status: 'won',
    };
  }

  return {
    state: buildStateAfterReveal(state, {
      cells: revealResult.board,
      status: 'playing',
      startedAt,
      endedAt: null,
      now,
    }),
    status: state.status === 'ready' ? 'started' : 'revealed',
  };
}

function buildStateAfterReveal(
  state: GameState,
  next: {
    readonly cells: Cell[][];
    readonly status: GameState['status'];
    readonly startedAt: number;
    readonly endedAt: number | null;
    readonly now: number;
  },
): GameState {
  return {
    ...state,
    cells: next.cells,
    status: next.status,
    startedAt: next.startedAt,
    endedAt: next.endedAt,
    elapsedSeconds: getElapsedSeconds(
      { ...state, startedAt: next.startedAt },
      next.now,
    ),
    remainingMines: getRemainingMineCount(next.cells, state.config.mines),
    revealedCount: countRevealedSafeCells(next.cells),
  };
}

function countRevealedSafeCells(board: Board): number {
  getBoardSize(board);

  return board
    .flat()
    .filter((cell) => !cell.hasMine && cell.state === 'revealed').length;
}

function assertValidBoardConfig(config: BoardConfig): void {
  createEmptyBoard(config);

  if (!Number.isInteger(config.mines) || config.mines < 0) {
    throw new RangeError('Board mines must be a non-negative integer.');
  }

  const totalCells = config.rows * config.cols;

  if (config.mines > totalCells) {
    throw new RangeError(
      `Board mines must not exceed total cells (${String(totalCells)}).`,
    );
  }
}

function assertCoordinateInBounds(board: Board, coordinate: Coordinate): void {
  const size = getBoardSize(board);

  if (!isCoordinateInBounds(size, coordinate)) {
    throw new RangeError(
      `Coordinate (${String(coordinate.row)}, ${String(coordinate.col)}) is outside a ${String(size.rows)}x${String(size.cols)} board.`,
    );
  }
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

function getElapsedSeconds(
  state: Pick<GameState, 'startedAt'>,
  now: number,
): number {
  if (state.startedAt === null) {
    return 0;
  }

  return Math.max(0, Math.floor((now - state.startedAt) / 1000));
}

function readNow(options: DispatchOptions): number {
  return options.now?.() ?? Date.now();
}

function isTerminalStatus(status: GameState['status']): boolean {
  return status === 'won' || status === 'lost';
}
