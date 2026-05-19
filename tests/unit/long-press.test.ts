import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LONG_PRESS_THRESHOLD_MS,
  LONG_PRESS_EVENT_TYPE,
  createLongPressDetector,
  type LongPressDetail,
} from '../../src/input/long-press';

describe('createLongPressDetector', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits a longpress event after the default threshold', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const events: CustomEvent<LongPressDetail>[] = [];
    const detector = createLongPressDetector(target);
    const sourceEvent = new Event('pointerdown');

    target.addEventListener(LONG_PRESS_EVENT_TYPE, (event) => {
      events.push(event as CustomEvent<LongPressDetail>);
    });
    target.dispatchEvent(sourceEvent);

    expect(detector.isPending).toBe(true);
    vi.advanceTimersByTime(DEFAULT_LONG_PRESS_THRESHOLD_MS - 1);
    expect(events).toHaveLength(0);

    vi.advanceTimersByTime(1);

    expect(detector.isPending).toBe(false);
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({
      sourceEvent,
      thresholdMs: DEFAULT_LONG_PRESS_THRESHOLD_MS,
    });
  });

  it('supports a custom threshold', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const events: Event[] = [];

    createLongPressDetector(target, { thresholdMs: 125 });
    target.addEventListener(LONG_PRESS_EVENT_TYPE, (event) => {
      events.push(event);
    });
    target.dispatchEvent(new Event('pointerdown'));

    vi.advanceTimersByTime(124);
    expect(events).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(events).toHaveLength(1);
  });

  it.each(['pointermove', 'pointerup', 'pointercancel', 'scroll'])(
    'cancels pending longpress on %s',
    (cancelEventType) => {
      vi.useFakeTimers();
      const target = new EventTarget();
      const events: Event[] = [];
      const detector = createLongPressDetector(target);

      target.addEventListener(LONG_PRESS_EVENT_TYPE, (event) => {
        events.push(event);
      });
      target.dispatchEvent(new Event('pointerdown'));
      target.dispatchEvent(new Event(cancelEventType));
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_THRESHOLD_MS);

      expect(detector.isPending).toBe(false);
      expect(events).toHaveLength(0);
    },
  );

  it('can be canceled manually', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const events: Event[] = [];
    const detector = createLongPressDetector(target);

    target.addEventListener(LONG_PRESS_EVENT_TYPE, (event) => {
      events.push(event);
    });
    target.dispatchEvent(new Event('pointerdown'));
    detector.cancel();
    vi.advanceTimersByTime(DEFAULT_LONG_PRESS_THRESHOLD_MS);

    expect(detector.isPending).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('removes listeners and cancels pending work on destroy', () => {
    vi.useFakeTimers();
    const target = new EventTarget();
    const events: Event[] = [];
    const detector = createLongPressDetector(target);

    target.addEventListener(LONG_PRESS_EVENT_TYPE, (event) => {
      events.push(event);
    });
    target.dispatchEvent(new Event('pointerdown'));
    detector.destroy();
    target.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(DEFAULT_LONG_PRESS_THRESHOLD_MS);

    expect(detector.isPending).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('rejects invalid thresholds', () => {
    expect(() =>
      createLongPressDetector(new EventTarget(), { thresholdMs: -1 }),
    ).toThrow(RangeError);
  });
});
