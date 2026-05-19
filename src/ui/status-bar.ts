import type { GameState, GameStatus } from '../types';

export interface StatusBarOptions {
  readonly intervalMs?: number;
  readonly now?: () => number;
  readonly summaryElement?: HTMLElement | null;
}

export interface StatusBarUpdateOptions {
  readonly bestTimeSeconds?: number | null;
}

export interface StatusBar {
  readonly element: HTMLElement;
  update: (state: GameState, options?: StatusBarUpdateOptions) => void;
  destroy: () => void;
}

const DEFAULT_INTERVAL_MS = 250;

export function createStatusBar(
  element: HTMLElement,
  initialState: GameState,
  options: StatusBarOptions = {},
): StatusBar {
  element.replaceChildren(createStatusBarElement());

  const mineCountElement = queryRequiredElement(element, '[data-status-mines]');
  const timerElement = queryRequiredElement(element, '[data-status-timer]');
  const statusTextElement = queryRequiredElement(element, '[data-status-text]');
  const bestTimeRowElement = queryRequiredElement(
    element,
    '[data-status-best-row]',
  );
  const bestTimeElement = queryRequiredElement(element, '[data-status-best]');
  const now = options.now ?? Date.now;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const summaryElement = options.summaryElement ?? null;
  let currentState = initialState;
  let currentBestTimeSeconds: number | null = null;
  let intervalId: number | null = null;
  let frameId: number | null = null;

  const render = (): void => {
    frameId = null;

    const statusText = getStatusText(currentState.status);

    mineCountElement.textContent = String(currentState.remainingMines);
    timerElement.textContent = formatElapsedSeconds(
      getDisplayElapsedSeconds(currentState, now()),
    );
    statusTextElement.textContent = statusText;
    bestTimeRowElement.hidden =
      currentState.status !== 'won' || currentBestTimeSeconds === null;
    bestTimeElement.textContent =
      currentBestTimeSeconds === null
        ? ''
        : formatElapsedSeconds(currentBestTimeSeconds);

    if (summaryElement !== null) {
      summaryElement.textContent = statusText;
    }
  };

  const scheduleRender = (): void => {
    if (frameId !== null) {
      return;
    }

    frameId = requestRenderFrame(render);
  };

  const stopTimer = (): void => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    if (frameId !== null) {
      cancelRenderFrame(frameId);
      frameId = null;
    }
  };

  const startTimer = (): void => {
    if (!isTimerRunning(currentState) || intervalId !== null) {
      return;
    }

    intervalId = window.setInterval(scheduleRender, intervalMs);
  };

  const update = (
    state: GameState,
    updateOptions: StatusBarUpdateOptions = {},
  ): void => {
    currentState = state;
    currentBestTimeSeconds = updateOptions.bestTimeSeconds ?? null;

    if (isTimerRunning(currentState)) {
      startTimer();
    } else {
      stopTimer();
    }

    render();
  };

  update(initialState);

  return {
    element,
    update,
    destroy: () => {
      stopTimer();
      element.replaceChildren();
    },
  };
}

export function getStatusText(status: GameStatus): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'playing':
      return 'Playing';
    case 'won':
      return 'Won';
    case 'lost':
      return 'Lost';
  }
}

export function formatElapsedSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`;
}

function createStatusBarElement(): HTMLElement {
  const statusBar = document.createElement('section');
  statusBar.className = 'status-bar';
  statusBar.setAttribute('aria-label', 'Status details');

  const statusText = document.createElement('p');
  statusText.className = 'status-text';
  statusText.setAttribute('aria-live', 'polite');
  statusText.dataset.statusText = '';

  const metricGroup = document.createElement('section');
  metricGroup.className = 'metric-group';
  metricGroup.setAttribute('aria-label', 'Current game metrics');
  metricGroup.append(
    createMetricElement('Mines', 'statusMines'),
    createMetricElement('Time', 'statusTimer'),
    createMetricElement('Best', 'statusBest', 'statusBestRow'),
  );

  statusBar.append(statusText, metricGroup);

  return statusBar;
}

function createMetricElement(
  label: string,
  dataKey: string,
  rowDataKey?: string,
): HTMLElement {
  const metric = document.createElement('div');
  metric.className = 'metric';

  if (rowDataKey !== undefined) {
    metric.dataset[rowDataKey] = '';
    metric.hidden = true;
  }

  const labelElement = document.createElement('span');
  labelElement.className = 'metric-label';
  labelElement.textContent = label;

  const valueElement = document.createElement('strong');
  valueElement.className = 'metric-value';
  valueElement.dataset[dataKey] = '';

  metric.append(labelElement, valueElement);

  return metric;
}

function queryRequiredElement(
  root: HTMLElement,
  selector: string,
): HTMLElement {
  const element = root.querySelector<HTMLElement>(selector);

  if (element === null) {
    throw new Error(`Status bar element ${selector} was not found.`);
  }

  return element;
}

function getDisplayElapsedSeconds(state: GameState, now: number): number {
  if (!isTimerRunning(state)) {
    return state.elapsedSeconds;
  }

  return Math.max(0, Math.floor((now - state.startedAt) / 1000));
}

function isTimerRunning(state: GameState): state is GameState & {
  readonly status: 'playing';
  readonly startedAt: number;
} {
  return state.status === 'playing' && state.startedAt !== null;
}

function requestRenderFrame(callback: () => void): number {
  return window.requestAnimationFrame(() => {
    callback();
  });
}

function cancelRenderFrame(frameId: number): void {
  window.cancelAnimationFrame(frameId);
}
