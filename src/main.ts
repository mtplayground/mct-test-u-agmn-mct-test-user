import './styles/theme.css';
import './styles/base.css';
import './styles/board.css';

import { createGameState } from './game/engine';
import { createBoardView } from './ui/board-view';
import { createStatusBar } from './ui/status-bar';

const INITIAL_BOARD_CONFIG = {
  rows: 8,
  cols: 8,
  mines: 10,
  difficulty: 'beginner',
} as const;

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (appRoot === null) {
  throw new Error('Application root element #app was not found.');
}

const appTitle = import.meta.env.VITE_APP_TITLE ?? 'ZeroClaw';
const safeAppTitle = escapeHtml(appTitle);

appRoot.innerHTML = `
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
      </section>

      <aside class="info-panel" aria-label="Game details">
        <div data-status-bar></div>
      </aside>
    </main>
  </div>
`;

const boardElement = appRoot.querySelector<HTMLElement>('[data-board-view]');
const statusBarElement =
  appRoot.querySelector<HTMLElement>('[data-status-bar]');
const statusSummaryElement = appRoot.querySelector<HTMLElement>(
  '[data-status-summary]',
);

if (boardElement === null) {
  throw new Error('Board view root element was not found.');
}

if (statusBarElement === null) {
  throw new Error('Status bar root element was not found.');
}

const initialGameState = createGameState(INITIAL_BOARD_CONFIG);

createBoardView(boardElement, initialGameState);
createStatusBar(statusBarElement, initialGameState, {
  summaryElement: statusSummaryElement,
});

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
