import type { BoardConfig, GameState } from '../types';
import { type Coordinate } from '../game/board';
import {
  createGameState,
  dispatchGameAction,
  type GameAction,
} from '../game/engine';
import {
  LONG_PRESS_EVENT_TYPE,
  createLongPressDetector,
} from '../input/long-press';
import {
  FLAG_EVENT_TYPE,
  REVEAL_EVENT_TYPE,
  createUnifiedPointerHandler,
  type NormalizedPointerDetail,
} from '../input/pointer';
import { createBoardView } from './board-view';
import { createControls } from './controls';
import { createOutcomeOverlay } from './outcome-overlay';
import { createStatusBar } from './status-bar';

export interface AppOptions {
  readonly title: string;
  readonly initialConfig: BoardConfig;
}

export interface AppController {
  readonly root: HTMLElement;
  getState: () => GameState;
  destroy: () => void;
}

type StateSubscriber = (state: GameState) => void;

export function createApp(
  root: HTMLElement,
  options: AppOptions,
): AppController {
  const safeAppTitle = escapeHtml(options.title);

  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="title-group">
          <p class="app-kicker">Minesweeper</p>
          <h1 id="app-title">${safeAppTitle}</h1>
        </div>
        <div class="status-pill" aria-label="Game status" data-status-summary>Ready</div>
      </header>

      <main class="app-main" aria-labelledby="app-title">
        <section class="board-panel" aria-label="Game board">
          <div class="board-surface" data-board-view></div>
          <div data-outcome-overlay></div>
        </section>

        <aside class="info-panel" aria-label="Game details">
          <div data-controls></div>
          <div data-status-bar></div>
          <details class="instructions">
            <summary>Instructions</summary>
            <div class="instructions-body">
              <p>Reveal every safe cell without opening a mine.</p>
              <ul>
                <li>Desktop: left click reveals, right click marks.</li>
                <li>Mobile: tap reveals, long press marks.</li>
                <li>Flags and question marks help track suspected mines.</li>
              </ul>
            </div>
          </details>
        </aside>
      </main>
    </div>
  `;

  const elements = queryAppElements(root);
  let state = createGameState(options.initialConfig);
  let suppressNextReveal = false;
  const subscribers = new Set<StateSubscriber>();
  const boardView = createBoardView(elements.board, state);
  const outcomeOverlay = createOutcomeOverlay(elements.outcomeOverlay, state);
  const statusBar = createStatusBar(elements.statusBar, state, {
    summaryElement: elements.statusSummary,
  });
  const controls = createControls(elements.controls, state.config, {
    onRestart: (config) => {
      setState(createGameState(config));
      controls.update(config);
    },
  });
  const pointerHandler = createUnifiedPointerHandler(elements.board);
  const longPressDetector = createLongPressDetector(elements.board);

  subscribers.add(boardView.update);
  subscribers.add(outcomeOverlay.update);
  subscribers.add(statusBar.update);

  const handleReveal = (
    event: Event | CustomEvent<NormalizedPointerDetail>,
  ): void => {
    if (suppressNextReveal) {
      suppressNextReveal = false;
      return;
    }

    dispatchBoardAction(event, 'reveal');
  };

  const handleFlag = (
    event: Event | CustomEvent<NormalizedPointerDetail>,
  ): void => {
    dispatchBoardAction(event, 'flag');
  };

  const handleLongPress = (
    event: Event | CustomEvent<{ readonly sourceEvent: Event }>,
  ): void => {
    suppressNextReveal = true;
    dispatchBoardAction(event, 'flag');
  };

  function dispatchBoardAction(
    event: Event | CustomEvent<unknown>,
    type: GameAction['type'],
  ): void {
    const coordinate = getCoordinateFromIntentEvent(event);

    if (coordinate === null) {
      return;
    }

    const result = dispatchGameAction(state, { type, coordinate });

    if (result.state !== state) {
      setState(result.state);
    }
  }

  function setState(nextState: GameState): void {
    state = nextState;
    subscribers.forEach((subscriber) => {
      subscriber(state);
    });
  }

  elements.board.addEventListener(REVEAL_EVENT_TYPE, handleReveal);
  elements.board.addEventListener(FLAG_EVENT_TYPE, handleFlag);
  elements.board.addEventListener(LONG_PRESS_EVENT_TYPE, handleLongPress);

  return {
    root,
    getState: () => state,
    destroy: () => {
      elements.board.removeEventListener(REVEAL_EVENT_TYPE, handleReveal);
      elements.board.removeEventListener(FLAG_EVENT_TYPE, handleFlag);
      elements.board.removeEventListener(
        LONG_PRESS_EVENT_TYPE,
        handleLongPress,
      );
      pointerHandler.destroy();
      longPressDetector.destroy();
      controls.destroy();
      statusBar.destroy();
      outcomeOverlay.destroy();
      boardView.destroy();
      subscribers.clear();
      root.replaceChildren();
    },
  };
}

interface AppElements {
  readonly board: HTMLElement;
  readonly controls: HTMLElement;
  readonly outcomeOverlay: HTMLElement;
  readonly statusBar: HTMLElement;
  readonly statusSummary: HTMLElement | null;
}

function queryAppElements(root: HTMLElement): AppElements {
  return {
    board: queryRequiredElement(root, '[data-board-view]'),
    controls: queryRequiredElement(root, '[data-controls]'),
    outcomeOverlay: queryRequiredElement(root, '[data-outcome-overlay]'),
    statusBar: queryRequiredElement(root, '[data-status-bar]'),
    statusSummary: root.querySelector<HTMLElement>('[data-status-summary]'),
  };
}

function queryRequiredElement(
  root: HTMLElement,
  selector: string,
): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);

  if (element === null) {
    throw new Error(`Application element ${selector} was not found.`);
  }

  return element;
}

function getCoordinateFromIntentEvent(
  event: Event | CustomEvent<unknown>,
): Coordinate | null {
  const sourceEvent = getSourceEvent(event);
  const target = sourceEvent?.target;

  if (!(target instanceof Element)) {
    return null;
  }

  const cell = target.closest<HTMLElement>('[data-row][data-col]');

  if (cell === null) {
    return null;
  }

  const row = Number.parseInt(cell.dataset.row ?? '', 10);
  const col = Number.parseInt(cell.dataset.col ?? '', 10);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return null;
  }

  return { row, col };
}

function getSourceEvent(event: Event | CustomEvent<unknown>): Event | null {
  const detail = 'detail' in event ? event.detail : null;

  if (
    detail !== null &&
    typeof detail === 'object' &&
    'sourceEvent' in detail &&
    detail.sourceEvent instanceof Event
  ) {
    return detail.sourceEvent;
  }

  return event;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacement = HTML_ESCAPE_LOOKUP[character];

    return replacement ?? character;
  });
}

const HTML_ESCAPE_LOOKUP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
