export const DEFAULT_LONG_PRESS_THRESHOLD_MS = 400;
export const LONG_PRESS_EVENT_TYPE = 'longpress';

export interface LongPressOptions {
  readonly thresholdMs?: number;
}

export interface LongPressDetail {
  readonly sourceEvent: Event;
  readonly thresholdMs: number;
}

export interface LongPressController {
  readonly isPending: boolean;
  cancel: () => void;
  destroy: () => void;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function createLongPressDetector(
  target: EventTarget,
  options: LongPressOptions = {},
): LongPressController {
  const thresholdMs = options.thresholdMs ?? DEFAULT_LONG_PRESS_THRESHOLD_MS;
  assertValidThreshold(thresholdMs);

  let timeoutHandle: TimeoutHandle | null = null;
  let sourceEvent: Event | null = null;
  let destroyed = false;

  const cancel = (): void => {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }

    sourceEvent = null;
  };

  const start = (event: Event): void => {
    if (destroyed) {
      return;
    }

    cancel();
    sourceEvent = event;
    timeoutHandle = setTimeout(() => {
      const eventToEmit = sourceEvent;
      timeoutHandle = null;
      sourceEvent = null;

      if (eventToEmit !== null) {
        target.dispatchEvent(
          createLongPressEvent({
            sourceEvent: eventToEmit,
            thresholdMs,
          }),
        );
      }
    }, thresholdMs);
  };

  target.addEventListener('pointerdown', start, { passive: true });
  target.addEventListener('pointermove', cancel, { passive: true });
  target.addEventListener('pointerup', cancel, { passive: true });
  target.addEventListener('pointercancel', cancel, { passive: true });
  target.addEventListener('scroll', cancel, { passive: true });

  return {
    get isPending() {
      return timeoutHandle !== null;
    },
    cancel,
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      cancel();
      target.removeEventListener('pointerdown', start);
      target.removeEventListener('pointermove', cancel);
      target.removeEventListener('pointerup', cancel);
      target.removeEventListener('pointercancel', cancel);
      target.removeEventListener('scroll', cancel);
    },
  };
}

function createLongPressEvent(
  detail: LongPressDetail,
): CustomEvent<LongPressDetail> {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent<LongPressDetail>(LONG_PRESS_EVENT_TYPE, { detail });
  }

  const event = new Event(
    LONG_PRESS_EVENT_TYPE,
  ) as CustomEvent<LongPressDetail>;
  Object.defineProperty(event, 'detail', {
    enumerable: true,
    value: detail,
  });

  return event;
}

function assertValidThreshold(thresholdMs: number): void {
  if (!Number.isFinite(thresholdMs) || thresholdMs < 0) {
    throw new RangeError('Long-press threshold must be zero or greater.');
  }
}
