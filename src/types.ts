export type CellState = 'hidden' | 'revealed' | 'flagged' | 'questioned';

export type Difficulty = 'beginner' | 'intermediate' | 'expert' | 'custom';

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

export interface Cell {
  readonly row: number;
  readonly col: number;
  readonly hasMine: boolean;
  readonly adjacentMines: number;
  readonly state: CellState;
}

export interface BoardConfig {
  readonly rows: number;
  readonly cols: number;
  readonly mines: number;
  readonly difficulty: Difficulty;
}

export interface GameState {
  readonly config: BoardConfig;
  readonly status: GameStatus;
  readonly cells: readonly (readonly Cell[])[];
  readonly startedAt: number | null;
  readonly endedAt: number | null;
  readonly elapsedSeconds: number;
  readonly remainingMines: number;
  readonly revealedCount: number;
}
