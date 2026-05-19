import './styles/theme.css';
import './styles/base.css';
import './styles/board.css';

import { createGameState } from './game/engine';
import { createBoardView } from './ui/board-view';

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
      <div class="status-pill" aria-label="Game status">Ready</div>
    </header>

    <main class="app-main" aria-labelledby="app-title">
      <section class="board-panel" aria-label="Game board">
        <div class="board-surface" data-board-view></div>
      </section>

      <aside class="info-panel" aria-label="Game details">
        <section class="metric-group" aria-label="Current game metrics">
          <div class="metric">
            <span class="metric-label">Mines</span>
            <strong class="metric-value">${String(INITIAL_BOARD_CONFIG.mines)}</strong>
          </div>
          <div class="metric">
            <span class="metric-label">Time</span>
            <strong class="metric-value">0:00</strong>
          </div>
        </section>
      </aside>
    </main>
  </div>
`;

const boardElement = appRoot.querySelector<HTMLElement>('[data-board-view]');

if (boardElement === null) {
  throw new Error('Board view root element was not found.');
}

createBoardView(boardElement, createGameState(INITIAL_BOARD_CONFIG));

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
