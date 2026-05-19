export const REVEAL_EVENT_TYPE = 'reveal';
export const FLAG_EVENT_TYPE = 'flag';

export type PointerIntent = 'reveal' | 'flag';

export interface NormalizedPointerDetail {
  readonly intent: PointerIntent;
  readonly sourceEvent: Event;
  readonly button: number;
  readonly pointerId: number | null;
  readonly pointerType: string | null;
}

export interface PointerHandlerController {
  destroy: () => void;
}

export interface PointerHandlerTarget extends EventTarget {
  readonly style?: {
    touchAction: string;
  };
}

export function createUnifiedPointerHandler(
  target: PointerHandlerTarget,
): PointerHandlerController {
  const previousTouchAction = target.style?.touchAction ?? null;
  let isPrimaryPointerDown = false;
  let activePointerId: number | null = null;
  let destroyed = false;

  if (target.style !== undefined) {
    target.style.touchAction = 'none';
  }

  const resetPointer = (): void => {
    isPrimaryPointerDown = false;
    activePointerId = null;
  };

  const handlePointerDown = (event: Event): void => {
    if (destroyed || getEventButton(event) !== 0) {
      return;
    }

    isPrimaryPointerDown = true;
    activePointerId = getPointerId(event);
  };

  const handlePointerUp = (event: Event): void => {
    if (destroyed || !isPrimaryPointerDown || getEventButton(event) !== 0) {
      return;
    }

    const pointerId = getPointerId(event);

    if (
      activePointerId !== null &&
      pointerId !== null &&
      activePointerId !== pointerId
    ) {
      return;
    }

    resetPointer();
    dispatchPointerIntent(target, 'reveal', event);
  };

  const handleContextMenu = (event: Event): void => {
    if (destroyed) {
      return;
    }

    event.preventDefault();
    resetPointer();
    dispatchPointerIntent(target, 'flag', event);
  };

  const handleKeyDown = (event: Event): void => {
    if (destroyed) {
      return;
    }

    const key = getEventKey(event);

    if (key === null) {
      return;
    }

    if (moveFocusedCell(target, event, key)) {
      event.preventDefault();
      return;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      dispatchPointerIntent(target, 'reveal', event);
      return;
    }

    if (key.toLowerCase() === 'f') {
      event.preventDefault();
      dispatchPointerIntent(target, 'flag', event);
    }
  };

  target.addEventListener('pointerdown', handlePointerDown, { passive: true });
  target.addEventListener('pointerup', handlePointerUp, { passive: true });
  target.addEventListener('pointercancel', resetPointer, { passive: true });
  target.addEventListener('contextmenu', handleContextMenu);
  target.addEventListener('keydown', handleKeyDown);

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      resetPointer();
      target.removeEventListener('pointerdown', handlePointerDown);
      target.removeEventListener('pointerup', handlePointerUp);
      target.removeEventListener('pointercancel', resetPointer);
      target.removeEventListener('contextmenu', handleContextMenu);
      target.removeEventListener('keydown', handleKeyDown);

      if (target.style !== undefined && previousTouchAction !== null) {
        target.style.touchAction = previousTouchAction;
      }
    },
  };
}

function dispatchPointerIntent(
  target: EventTarget,
  intent: PointerIntent,
  sourceEvent: Event,
): void {
  target.dispatchEvent(
    createPointerIntentEvent(
      intent === 'reveal' ? REVEAL_EVENT_TYPE : FLAG_EVENT_TYPE,
      {
        intent,
        sourceEvent,
        button: getEventButton(sourceEvent),
        pointerId: getPointerId(sourceEvent),
        pointerType: getPointerType(sourceEvent),
      },
    ),
  );
}

function createPointerIntentEvent(
  type: string,
  detail: NormalizedPointerDetail,
): CustomEvent<NormalizedPointerDetail> {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent<NormalizedPointerDetail>(type, { detail });
  }

  const event = new Event(type) as CustomEvent<NormalizedPointerDetail>;
  Object.defineProperty(event, 'detail', {
    enumerable: true,
    value: detail,
  });

  return event;
}

function getEventButton(event: Event): number {
  const value = getEventProperty(event, 'button');

  return typeof value === 'number' ? value : 0;
}

function getPointerId(event: Event): number | null {
  const value = getEventProperty(event, 'pointerId');

  return typeof value === 'number' ? value : null;
}

function getPointerType(event: Event): string | null {
  const value = getEventProperty(event, 'pointerType');

  return typeof value === 'string' ? value : null;
}

function getEventKey(event: Event): string | null {
  const value = getEventProperty(event, 'key');

  return typeof value === 'string' ? value : null;
}

function getEventProperty(event: Event, property: string): unknown {
  return (event as unknown as Record<string, unknown>)[property];
}

function moveFocusedCell(
  target: EventTarget,
  event: Event,
  key: string,
): boolean {
  const delta = getKeyboardNavigationDelta(key);

  if (delta === null) {
    return false;
  }

  const currentCell = getCellElementFromEvent(event);

  if (currentCell === null) {
    return true;
  }

  const row = Number.parseInt(currentCell.dataset.row ?? '', 10);
  const col = Number.parseInt(currentCell.dataset.col ?? '', 10);

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return true;
  }

  const nextCell = getCellElementAt(target, {
    row: row + delta.row,
    col: col + delta.col,
  });

  if (nextCell === null) {
    return true;
  }

  setActiveCell(target, nextCell);
  nextCell.focus();

  return true;
}

function getKeyboardNavigationDelta(
  key: string,
): { readonly row: number; readonly col: number } | null {
  switch (key) {
    case 'ArrowUp':
      return { row: -1, col: 0 };
    case 'ArrowDown':
      return { row: 1, col: 0 };
    case 'ArrowLeft':
      return { row: 0, col: -1 };
    case 'ArrowRight':
      return { row: 0, col: 1 };
    default:
      return null;
  }
}

function getCellElementFromEvent(event: Event): HTMLElement | null {
  if (typeof Element === 'undefined') {
    return null;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return null;
  }

  return target.closest<HTMLElement>('[data-row][data-col]');
}

function getCellElementAt(
  target: EventTarget,
  coordinate: { readonly row: number; readonly col: number },
): HTMLElement | null {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return null;
  }

  return target.querySelector<HTMLElement>(
    `[data-row="${String(coordinate.row)}"][data-col="${String(coordinate.col)}"]`,
  );
}

function setActiveCell(target: EventTarget, activeCell: HTMLElement): void {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return;
  }

  target
    .querySelectorAll<HTMLElement>('[data-row][data-col]')
    .forEach((cell) => {
      cell.tabIndex = cell === activeCell ? 0 : -1;
    });
}
