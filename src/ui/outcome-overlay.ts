import type { GameState, GameStatus } from '../types';

export interface OutcomeOverlay {
  readonly element: HTMLElement;
  update: (state: GameState) => void;
  destroy: () => void;
}

export interface OutcomeContent {
  readonly title: string;
  readonly message: string;
  readonly variant: 'won' | 'lost';
}

export function createOutcomeOverlay(
  element: HTMLElement,
  initialState: GameState,
): OutcomeOverlay {
  const banner = document.createElement('section');
  banner.className = 'outcome-overlay';
  banner.setAttribute('aria-live', 'polite');
  banner.setAttribute('role', 'status');
  banner.hidden = true;

  const content = document.createElement('div');
  content.className = 'outcome-banner';

  const title = document.createElement('h2');
  title.className = 'outcome-title';

  const message = document.createElement('p');
  message.className = 'outcome-message';

  content.append(title, message);
  banner.append(content);
  element.replaceChildren(banner);

  const update = (state: GameState): void => {
    const outcome = getOutcomeContent(state.status);

    if (outcome === null) {
      banner.hidden = true;
      banner.className = 'outcome-overlay';
      title.textContent = '';
      message.textContent = '';
      return;
    }

    banner.hidden = false;
    banner.className = `outcome-overlay is-${outcome.variant}`;
    title.textContent = outcome.title;
    message.textContent = outcome.message;
  };

  update(initialState);

  return {
    element,
    update,
    destroy: () => {
      element.replaceChildren();
    },
  };
}

export function getOutcomeContent(status: GameStatus): OutcomeContent | null {
  switch (status) {
    case 'won':
      return {
        title: 'You won',
        message: 'Every safe cell is clear.',
        variant: 'won',
      };
    case 'lost':
      return {
        title: 'Game over',
        message: 'A mine was revealed.',
        variant: 'lost',
      };
    case 'ready':
    case 'playing':
      return null;
  }
}
