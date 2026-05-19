import type { BoardConfig, GameState } from '../types';
import { type Coordinate } from '../game/board';
import {
  createGameState,
  dispatchGameAction,
  getHintCoordinate,
  type GameAction,
  type GameActionStatus,
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
import { createSfxController, type SfxName } from '../audio/sfx';
import {
  createBestTimesStore,
  type BestTimesStore,
} from '../persistence/best-times';
import { createBoardView } from './board-view';
import { createControls } from './controls';
import { createOutcomeOverlay } from './outcome-overlay';
import { createStatusBar } from './status-bar';
import { createThemeToggle } from './theme';

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

const HINTS_PER_GAME = 3;

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
        <div class="header-actions">
          <button class="theme-toggle" data-theme-toggle type="button">Theme</button>
          <button class="sfx-toggle" data-sfx-toggle type="button">Sound off</button>
          <div class="status-pill" aria-label="Game status" data-status-summary>Ready</div>
        </div>
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
  let hintsRemaining = HINTS_PER_GAME;
  const bestTimes = createBestTimesStore();
  const subscribers = new Set<StateSubscriber>();
  const boardView = createBoardView(elements.board, state);
  const outcomeOverlay = createOutcomeOverlay(elements.outcomeOverlay, state);
  const statusBar = createStatusBar(elements.statusBar, state, {
    summaryElement: elements.statusSummary,
  });
  const themeToggle = createThemeToggle(elements.themeToggle);
  const sfx = createSfxController(elements.sfxToggle);
  const pointerHandler = createUnifiedPointerHandler(elements.board);
  const longPressDetector = createLongPressDetector(elements.board);
  const controls = createControls(elements.controls, state.config, {
    initialHintsRemaining: hintsRemaining,
    onHint: () => {
      useHint();
    },
    onRestart: (config) => {
      suppressNextReveal = false;
      longPressDetector.cancel();
      hintsRemaining = HINTS_PER_GAME;
      setState(createGameState(config));
      controls.update(config);
      controls.updateHints(getHintControlState(state, hintsRemaining));
    },
  });

  subscribers.add(boardView.update);
  subscribers.add(outcomeOverlay.update);
  subscribers.add((nextState) => {
    statusBar.update(nextState, {
      bestTimeSeconds: getBestTimeForState(nextState, bestTimes),
    });
  });

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
      playActionSound(result.status);
    }
  }

  function setState(nextState: GameState): void {
    state = nextState;

    if (state.status === 'won') {
      bestTimes.recordBestTime(state.config.difficulty, state.elapsedSeconds);
    }

    subscribers.forEach((subscriber) => {
      subscriber(state);
    });
    controls.updateHints(getHintControlState(state, hintsRemaining));
  }

  function useHint(): void {
    if (hintsRemaining <= 0 || isTerminalState(state)) {
      controls.updateHints(getHintControlState(state, hintsRemaining));
      return;
    }

    const coordinate = getHintCoordinate(state);

    if (coordinate === null) {
      controls.updateHints(getHintControlState(state, hintsRemaining));
      return;
    }

    const result = dispatchGameAction(state, {
      type: 'reveal',
      coordinate,
    });

    if (result.state === state) {
      controls.updateHints(getHintControlState(state, hintsRemaining));
      return;
    }

    hintsRemaining -= 1;
    setState(result.state);
    boardView.highlightCell(coordinate);
    playActionSound(result.status);
  }

  function playActionSound(status: GameActionStatus): void {
    const sound = getSfxForActionStatus(status);

    if (sound !== null) {
      sfx.play(sound);
    }
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
      themeToggle.destroy();
      sfx.destroy();
      outcomeOverlay.destroy();
      boardView.destroy();
      subscribers.clear();
      root.replaceChildren();
    },
  };
}

function getBestTimeForState(
  state: GameState,
  bestTimes: BestTimesStore,
): number | null {
  if (state.status !== 'won') {
    return null;
  }

  return bestTimes.getBestTime(state.config.difficulty);
}

function getSfxForActionStatus(status: GameActionStatus): SfxName | null {
  switch (status) {
    case 'started':
    case 'revealed':
      return 'reveal';
    case 'marked':
      return 'flag';
    case 'won':
      return 'win';
    case 'lost':
      return 'explosion';
    case 'ignored':
      return null;
  }
}

function getHintControlState(
  state: GameState,
  hintsRemaining: number,
): { readonly remaining: number; readonly disabled: boolean } {
  return {
    remaining: hintsRemaining,
    disabled:
      hintsRemaining <= 0 ||
      isTerminalState(state) ||
      getHintCoordinate(state) === null,
  };
}

function isTerminalState(state: GameState): boolean {
  return state.status === 'won' || state.status === 'lost';
}

interface AppElements {
  readonly board: HTMLElement;
  readonly controls: HTMLElement;
  readonly outcomeOverlay: HTMLElement;
  readonly statusBar: HTMLElement;
  readonly statusSummary: HTMLElement | null;
  readonly sfxToggle: HTMLButtonElement;
  readonly themeToggle: HTMLButtonElement;
}

function queryAppElements(root: HTMLElement): AppElements {
  return {
    board: queryRequiredElement(root, '[data-board-view]'),
    controls: queryRequiredElement(root, '[data-controls]'),
    outcomeOverlay: queryRequiredElement(root, '[data-outcome-overlay]'),
    statusBar: queryRequiredElement(root, '[data-status-bar]'),
    statusSummary: root.querySelector<HTMLElement>('[data-status-summary]'),
    sfxToggle: queryRequiredElement(
      root,
      '[data-sfx-toggle]',
      HTMLButtonElement,
    ),
    themeToggle: queryRequiredElement(
      root,
      '[data-theme-toggle]',
      HTMLButtonElement,
    ),
  };
}

function queryRequiredElement<TElement extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  selector: string,
  constructor?: new () => TElement,
): TElement {
  const element = root.querySelector(selector);

  if (
    element !== null &&
    (constructor === undefined || element instanceof constructor)
  ) {
    return element as TElement;
  }

  throw new Error(`Application element ${selector} was not found.`);
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
