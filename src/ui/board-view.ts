import type { Cell, GameState } from '../types';
import { getBoardSize, type Coordinate } from '../game/board';

export interface BoardView {
  readonly element: HTMLElement;
  update: (state: GameState) => void;
  highlightCell: (coordinate: Coordinate, durationMs?: number) => void;
  destroy: () => void;
}

interface BoardDimensions {
  readonly rows: number;
  readonly cols: number;
}

const FLAG_ICON = `
  <svg class="board-cell__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M6 21V4.5c0-.55.45-1 1-1h10.25c.78 0 1.26.85.86 1.52L16.9 7l1.21 1.98c.4.67-.08 1.52-.86 1.52H8V21H6Z" />
  </svg>
`;

const MINE_ICON = `
  <svg class="board-cell__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M11 2h2v3h-2V2Zm0 17h2v3h-2v-3ZM2 11h3v2H2v-2Zm17 0h3v2h-3v-2ZM4.22 5.64l1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12Zm12.02 12.02 1.42-1.42 2.12 2.12-1.42 1.42-2.12-2.12Zm2.12-13.44 1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12ZM6.34 16.24l1.42 1.42-2.12 2.12-1.42-1.42 2.12-2.12ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
  </svg>
`;

const DEFAULT_HINT_HIGHLIGHT_MS = 1000;

export function createBoardView(
  element: HTMLElement,
  initialState: GameState,
): BoardView {
  const cellElements = new Map<string, HTMLButtonElement>();
  const cellSignatures = new Map<string, string>();
  const highlightTimers = new Map<string, number>();
  let currentDimensions: BoardDimensions | null = null;

  const update = (state: GameState): void => {
    const dimensions = getBoardSize(state.cells);

    if (hasDimensionChanged(currentDimensions, dimensions)) {
      element.replaceChildren();
      cellElements.clear();
      cellSignatures.clear();
      currentDimensions = dimensions;
      configureGridElement(element, dimensions);
    }

    state.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const coordinate = { row: rowIndex, col: colIndex };
        const key = keyFor(coordinate);
        const signature = getCellSignature(cell);
        let cellElement = cellElements.get(key);

        if (cellElement === undefined) {
          cellElement = createCellElement(coordinate);
          cellElements.set(key, cellElement);
          element.append(cellElement);
        }

        if (cellSignatures.get(key) !== signature) {
          updateCellElement(cellElement, cell);
          cellSignatures.set(key, signature);
        }
      });
    });
  };

  update(initialState);

  return {
    element,
    update,
    highlightCell: (
      coordinate: Coordinate,
      durationMs = DEFAULT_HINT_HIGHLIGHT_MS,
    ) => {
      const key = keyFor(coordinate);
      const cellElement = cellElements.get(key);

      if (cellElement === undefined) {
        return;
      }

      const existingTimer = highlightTimers.get(key);

      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }

      cellElement.classList.add('is-hinted');
      highlightTimers.set(
        key,
        window.setTimeout(() => {
          cellElement.classList.remove('is-hinted');
          highlightTimers.delete(key);
        }, durationMs),
      );
    },
    destroy: () => {
      highlightTimers.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      element.replaceChildren();
      cellElements.clear();
      cellSignatures.clear();
      highlightTimers.clear();
      currentDimensions = null;
    },
  };
}

function configureGridElement(
  element: HTMLElement,
  dimensions: BoardDimensions,
): void {
  element.classList.add('board-grid');
  element.setAttribute('role', 'grid');
  element.setAttribute('aria-label', 'Game board');
  element.setAttribute('aria-rowcount', String(dimensions.rows));
  element.setAttribute('aria-colcount', String(dimensions.cols));
  element.style.gridTemplateColumns = `repeat(${String(dimensions.cols)}, minmax(0, 1fr))`;
}

function createCellElement(coordinate: Coordinate): HTMLButtonElement {
  const cellElement = document.createElement('button');
  cellElement.type = 'button';
  cellElement.className = 'board-cell';
  cellElement.setAttribute('role', 'gridcell');
  cellElement.dataset.row = String(coordinate.row);
  cellElement.dataset.col = String(coordinate.col);

  return cellElement;
}

function updateCellElement(cellElement: HTMLButtonElement, cell: Cell): void {
  cellElement.className = getCellClassName(cell);
  cellElement.dataset.state = cell.state;
  cellElement.dataset.adjacent = String(cell.adjacentMines);
  cellElement.dataset.mine = String(cell.hasMine);
  cellElement.setAttribute('aria-label', getCellLabel(cell));
  cellElement.replaceChildren();

  if (cell.state === 'flagged') {
    cellElement.innerHTML = FLAG_ICON;
    return;
  }

  if (cell.state === 'questioned') {
    cellElement.append(createTextMarker('?'));
    return;
  }

  if (cell.state !== 'revealed') {
    return;
  }

  if (cell.hasMine) {
    cellElement.innerHTML = MINE_ICON;
    return;
  }

  if (cell.adjacentMines > 0) {
    cellElement.append(createTextMarker(String(cell.adjacentMines)));
  }
}

function createTextMarker(value: string): HTMLSpanElement {
  const marker = document.createElement('span');
  marker.className = 'board-cell__text';
  marker.textContent = value;

  return marker;
}

function getCellClassName(cell: Cell): string {
  return [
    'board-cell',
    `is-${cell.state}`,
    cell.hasMine ? 'has-mine' : 'is-safe',
    cell.state === 'revealed' && cell.adjacentMines === 0 && !cell.hasMine
      ? 'is-empty'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function getCellLabel(cell: Cell): string {
  const row = cell.row + 1;
  const col = cell.col + 1;

  if (cell.state === 'flagged') {
    return `Flagged cell row ${String(row)}, column ${String(col)}`;
  }

  if (cell.state === 'questioned') {
    return `Questioned cell row ${String(row)}, column ${String(col)}`;
  }

  if (cell.state !== 'revealed') {
    return `Hidden cell row ${String(row)}, column ${String(col)}`;
  }

  if (cell.hasMine) {
    return `Mine cell row ${String(row)}, column ${String(col)}`;
  }

  if (cell.adjacentMines === 0) {
    return `Empty cell row ${String(row)}, column ${String(col)}`;
  }

  return `Cell row ${String(row)}, column ${String(col)}, ${String(cell.adjacentMines)} adjacent mines`;
}

function getCellSignature(cell: Cell): string {
  return [
    cell.row,
    cell.col,
    cell.state,
    cell.hasMine,
    cell.adjacentMines,
  ].join('|');
}

function hasDimensionChanged(
  previous: BoardDimensions | null,
  next: BoardDimensions,
): boolean {
  return (
    previous === null ||
    previous.rows !== next.rows ||
    previous.cols !== next.cols
  );
}

function keyFor(coordinate: Coordinate): string {
  return `${String(coordinate.row)}:${String(coordinate.col)}`;
}
