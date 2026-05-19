import { describe, expect, it } from 'vitest';

import type { BoardConfig, Cell, CellState, GameState } from '../../src/types';
import {
  computeAdjacentMineCounts,
  createEmptyBoard,
  getNeighborCoordinates,
  type Board,
  type Coordinate,
} from '../../src/game/board';
import {
  createGameState,
  dispatchGameAction,
  getHintCoordinate,
  hasWonGame,
} from '../../src/game/engine';

const beginnerConfig: BoardConfig = {
  rows: 4,
  cols: 4,
  mines: 1,
  difficulty: 'beginner',
};

describe('createGameState', () => {
  it('creates a ready game with an empty board', () => {
    const state = createGameState(beginnerConfig);

    expect(state.status).toBe('ready');
    expect(state.startedAt).toBeNull();
    expect(state.endedAt).toBeNull();
    expect(state.elapsedSeconds).toBe(0);
    expect(state.remainingMines).toBe(1);
    expect(state.revealedCount).toBe(0);
    expect(state.cells.flat().some((cell) => cell.hasMine)).toBe(false);
  });

  it('rejects invalid board configs', () => {
    expect(() =>
      createGameState({ rows: 0, cols: 4, mines: 1, difficulty: 'custom' }),
    ).toThrow(RangeError);
    expect(() =>
      createGameState({ rows: 2, cols: 2, mines: 5, difficulty: 'custom' }),
    ).toThrow(RangeError);
  });
});

describe('dispatchGameAction', () => {
  it('starts on the first reveal and keeps the first-click safe area mine-free', () => {
    const firstClick = { row: 0, col: 0 };
    const result = dispatchGameAction(
      createGameState(beginnerConfig),
      { type: 'reveal', coordinate: firstClick },
      { now: fixedNow(1_000), random: () => 0 },
    );
    const safeKeys = new Set([
      keyFor(firstClick),
      ...getNeighborCoordinates(beginnerConfig, firstClick).map((coordinate) =>
        keyFor(coordinate),
      ),
    ]);
    const mineKeys = mineCoordinates(result.state.cells).map((coordinate) =>
      keyFor(coordinate),
    );

    expect(result.status).toBe('started');
    expect(result.state.status).toBe('playing');
    expect(result.state.startedAt).toBe(1_000);
    expect(result.state.endedAt).toBeNull();
    expect(result.state.revealedCount).toBeGreaterThan(0);
    expect(mineKeys).toHaveLength(1);
    expect(mineKeys.every((mineKey) => !safeKeys.has(mineKey))).toBe(true);
  });

  it('cycles flags without starting the game and updates the mine counter', () => {
    const flagged = dispatchGameAction(createGameState(beginnerConfig), {
      type: 'flag',
      coordinate: { row: 0, col: 0 },
    });
    const questioned = dispatchGameAction(flagged.state, {
      type: 'flag',
      coordinate: { row: 0, col: 0 },
    });

    expect(flagged.status).toBe('marked');
    expect(flagged.state.status).toBe('ready');
    expect(flagged.state.remainingMines).toBe(0);
    expect(cellAt(flagged.state.cells, 0, 0).state).toBe('flagged');
    expect(questioned.state.remainingMines).toBe(1);
    expect(cellAt(questioned.state.cells, 0, 0).state).toBe('questioned');
  });

  it('ignores reveal actions against flagged cells', () => {
    const flagged = dispatchGameAction(createGameState(beginnerConfig), {
      type: 'flag',
      coordinate: { row: 0, col: 0 },
    });
    const revealed = dispatchGameAction(flagged.state, {
      type: 'reveal',
      coordinate: { row: 0, col: 0 },
    });

    expect(revealed.status).toBe('ignored');
    expect(revealed.state).toBe(flagged.state);
    expect(revealed.state.status).toBe('ready');
    expect(cellAt(revealed.state.cells, 0, 0).state).toBe('flagged');
  });

  it('wins when all non-mine cells are revealed', () => {
    const state = playingState({
      cells: computeAdjacentMineCounts(
        withMines(createEmptyBoard({ rows: 1, cols: 2 }), [{ row: 0, col: 1 }]),
      ),
      config: { rows: 1, cols: 2, mines: 1, difficulty: 'custom' },
      startedAt: 1_000,
    });
    const result = dispatchGameAction(
      state,
      { type: 'reveal', coordinate: { row: 0, col: 0 } },
      { now: fixedNow(4_200) },
    );

    expect(result.status).toBe('won');
    expect(result.state.status).toBe('won');
    expect(result.state.endedAt).toBe(4_200);
    expect(result.state.elapsedSeconds).toBe(3);
    expect(result.state.revealedCount).toBe(1);
    expect(hasWonGame(result.state.cells)).toBe(true);
  });

  it('loses when a mine is revealed', () => {
    const state = playingState({
      cells: computeAdjacentMineCounts(
        withMines(createEmptyBoard({ rows: 2, cols: 2 }), [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
        ]),
      ),
      config: { rows: 2, cols: 2, mines: 2, difficulty: 'custom' },
      startedAt: 1_000,
    });
    const result = dispatchGameAction(
      state,
      { type: 'reveal', coordinate: { row: 0, col: 0 } },
      { now: fixedNow(6_250) },
    );

    expect(result.status).toBe('lost');
    expect(result.state.status).toBe('lost');
    expect(result.state.endedAt).toBe(6_250);
    expect(result.state.elapsedSeconds).toBe(5);
    expect(cellAt(result.state.cells, 0, 0).state).toBe('revealed');
    expect(cellAt(result.state.cells, 1, 1).state).toBe('revealed');
  });

  it('ignores actions after the game has ended', () => {
    const wonState = {
      ...playingState({ cells: createEmptyBoard({ rows: 1, cols: 1 }) }),
      status: 'won',
    } satisfies GameState;

    const result = dispatchGameAction(wonState, {
      type: 'flag',
      coordinate: { row: 0, col: 0 },
    });

    expect(result.status).toBe('ignored');
    expect(result.state).toBe(wonState);
  });
});

describe('getHintCoordinate', () => {
  it('returns a currently hidden non-mine cell', () => {
    const cells = withCellStates(
      withMines(createEmptyBoard({ rows: 1, cols: 5 }), [{ row: 0, col: 0 }]),
      [['hidden', 'revealed', 'flagged', 'questioned', 'hidden']],
    );
    const state = playingState({
      cells,
      config: { rows: 1, cols: 5, mines: 1, difficulty: 'custom' },
    });

    expect(getHintCoordinate(state)).toEqual({ row: 0, col: 4 });
  });

  it('returns null when no hidden non-mine cells are available', () => {
    const cells = withCellStates(
      withMines(createEmptyBoard({ rows: 1, cols: 3 }), [{ row: 0, col: 0 }]),
      [['hidden', 'revealed', 'flagged']],
    );
    const state = playingState({
      cells,
      config: { rows: 1, cols: 3, mines: 1, difficulty: 'custom' },
    });

    expect(getHintCoordinate(state)).toBeNull();
  });

  it('returns null after the game has ended', () => {
    const state = {
      ...playingState({ cells: createEmptyBoard({ rows: 1, cols: 1 }) }),
      status: 'lost',
    } satisfies GameState;

    expect(getHintCoordinate(state)).toBeNull();
  });
});

function playingState(overrides: {
  readonly cells: Board;
  readonly config?: BoardConfig;
  readonly startedAt?: number;
}): GameState {
  const config =
    overrides.config ??
    ({
      rows: overrides.cells.length,
      cols: overrides.cells[0]?.length ?? 0,
      mines: mineCoordinates(overrides.cells).length,
      difficulty: 'custom',
    } satisfies BoardConfig);
  const startedAt = overrides.startedAt ?? 0;

  return {
    config,
    status: 'playing',
    cells: overrides.cells,
    startedAt,
    endedAt: null,
    elapsedSeconds: 0,
    remainingMines: config.mines,
    revealedCount: 0,
  };
}

function withMines(board: Board, mines: readonly Coordinate[]): Cell[][] {
  const mineKeys = new Set(mines.map((mine) => keyFor(mine)));

  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      hasMine: mineKeys.has(keyFor(cell)),
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

function mineCoordinates(board: Board): Coordinate[] {
  return board
    .flat()
    .filter((cell) => cell.hasMine)
    .map((cell) => ({ row: cell.row, col: cell.col }));
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

function fixedNow(value: number): () => number {
  return () => value;
}
