import './styles/theme.css';
import './styles/base.css';
import './styles/board.css';

import { createApp } from './ui/app';

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

createApp(appRoot, {
  title: appTitle,
  initialConfig: INITIAL_BOARD_CONFIG,
});
