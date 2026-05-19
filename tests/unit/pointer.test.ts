import { describe, expect, it } from 'vitest';

import {
  DBLCLICK_EVENT_TYPE,
  FLAG_EVENT_TYPE,
  REVEAL_EVENT_TYPE,
  createUnifiedPointerHandler,
  type NormalizedPointerDetail,
  type PointerHandlerTarget,
} from '../../src/input/pointer';

describe('createUnifiedPointerHandler', () => {
  it('sets touch-action to none while bound and restores it on destroy', () => {
    const target = new StyledEventTarget('pan-y');
    const controller = createUnifiedPointerHandler(target);

    expect(target.style.touchAction).toBe('none');

    controller.destroy();

    expect(target.style.touchAction).toBe('pan-y');
  });

  it('dispatches a normalized reveal event for primary pointer click', () => {
    const target = new StyledEventTarget();
    const revealEvents: CustomEvent<NormalizedPointerDetail>[] = [];
    const pointerDown = pointerEvent('pointerdown', {
      button: 0,
      pointerId: 7,
      pointerType: 'touch',
    });
    const pointerUp = pointerEvent('pointerup', {
      button: 0,
      pointerId: 7,
      pointerType: 'touch',
    });

    createUnifiedPointerHandler(target);
    target.addEventListener(REVEAL_EVENT_TYPE, (event) => {
      revealEvents.push(event as CustomEvent<NormalizedPointerDetail>);
    });
    target.dispatchEvent(pointerDown);
    target.dispatchEvent(pointerUp);

    expect(revealEvents).toHaveLength(1);
    expect(revealEvents[0]?.detail).toEqual({
      intent: 'reveal',
      sourceEvent: pointerUp,
      button: 0,
      pointerId: 7,
      pointerType: 'touch',
    });
  });

  it('ignores pointerup without a tracked pointerdown', () => {
    const target = new StyledEventTarget();
    const revealEvents: Event[] = [];

    createUnifiedPointerHandler(target);
    target.addEventListener(REVEAL_EVENT_TYPE, (event) => {
      revealEvents.push(event);
    });
    target.dispatchEvent(pointerEvent('pointerup', { button: 0 }));

    expect(revealEvents).toHaveLength(0);
  });

  it('ignores pointerup from a different active pointer', () => {
    const target = new StyledEventTarget();
    const revealEvents: Event[] = [];

    createUnifiedPointerHandler(target);
    target.addEventListener(REVEAL_EVENT_TYPE, (event) => {
      revealEvents.push(event);
    });
    target.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, pointerId: 1 }),
    );
    target.dispatchEvent(
      pointerEvent('pointerup', { button: 0, pointerId: 2 }),
    );

    expect(revealEvents).toHaveLength(0);
  });

  it('ignores pointerup after pointer cancellation', () => {
    const target = new StyledEventTarget();
    const revealEvents: Event[] = [];

    createUnifiedPointerHandler(target);
    target.addEventListener(REVEAL_EVENT_TYPE, (event) => {
      revealEvents.push(event);
    });
    target.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, pointerId: 1 }),
    );
    target.dispatchEvent(
      pointerEvent('pointercancel', { button: 0, pointerId: 1 }),
    );
    target.dispatchEvent(
      pointerEvent('pointerup', { button: 0, pointerId: 1 }),
    );

    expect(revealEvents).toHaveLength(0);
  });

  it('dispatches a normalized flag event and prevents native context menu', () => {
    const target = new StyledEventTarget();
    const flagEvents: CustomEvent<NormalizedPointerDetail>[] = [];
    const contextMenu = pointerEvent('contextmenu', {
      button: 2,
      pointerId: 3,
      pointerType: 'mouse',
    });

    createUnifiedPointerHandler(target);
    target.addEventListener(FLAG_EVENT_TYPE, (event) => {
      flagEvents.push(event as CustomEvent<NormalizedPointerDetail>);
    });
    target.dispatchEvent(contextMenu);

    expect(contextMenu.defaultPrevented).toBe(true);
    expect(flagEvents).toHaveLength(1);
    expect(flagEvents[0]?.detail).toEqual({
      intent: 'flag',
      sourceEvent: contextMenu,
      button: 2,
      pointerId: 3,
      pointerType: 'mouse',
    });
  });

  it('dispatches a normalized dblclick event for native desktop double-click', () => {
    const target = new StyledEventTarget();
    const dblClickEvents: CustomEvent<NormalizedPointerDetail>[] = [];
    const dblClick = pointerEvent('dblclick', {
      button: 0,
      pointerId: 11,
      pointerType: 'mouse',
    });

    createUnifiedPointerHandler(target);
    target.addEventListener(DBLCLICK_EVENT_TYPE, (event) => {
      dblClickEvents.push(event as CustomEvent<NormalizedPointerDetail>);
    });
    target.dispatchEvent(dblClick);

    expect(dblClickEvents).toHaveLength(1);
    expect(dblClickEvents[0]?.detail).toEqual({
      intent: 'dblclick',
      sourceEvent: dblClick,
      button: 0,
      pointerId: 11,
      pointerType: 'mouse',
    });
  });

  it('dispatches a normalized dblclick event for fast touch double-tap', () => {
    const target = new StyledEventTarget();
    const revealEvents: CustomEvent<NormalizedPointerDetail>[] = [];
    const dblClickEvents: CustomEvent<NormalizedPointerDetail>[] = [];
    const firstPointerDown = pointerEvent('pointerdown', {
      button: 0,
      pointerId: 5,
      pointerType: 'touch',
      timeStamp: 100,
    });
    const firstPointerUp = pointerEvent('pointerup', {
      button: 0,
      pointerId: 5,
      pointerType: 'touch',
      timeStamp: 110,
    });
    const secondPointerDown = pointerEvent('pointerdown', {
      button: 0,
      pointerId: 6,
      pointerType: 'touch',
      timeStamp: 250,
    });
    const secondPointerUp = pointerEvent('pointerup', {
      button: 0,
      pointerId: 6,
      pointerType: 'touch',
      timeStamp: 260,
    });

    createUnifiedPointerHandler(target);
    target.addEventListener(REVEAL_EVENT_TYPE, (event) => {
      revealEvents.push(event as CustomEvent<NormalizedPointerDetail>);
    });
    target.addEventListener(DBLCLICK_EVENT_TYPE, (event) => {
      dblClickEvents.push(event as CustomEvent<NormalizedPointerDetail>);
    });
    target.dispatchEvent(firstPointerDown);
    target.dispatchEvent(firstPointerUp);
    target.dispatchEvent(secondPointerDown);
    target.dispatchEvent(secondPointerUp);

    expect(revealEvents).toHaveLength(2);
    expect(dblClickEvents).toHaveLength(1);
    expect(dblClickEvents[0]?.detail).toEqual({
      intent: 'dblclick',
      sourceEvent: secondPointerUp,
      button: 0,
      pointerId: 6,
      pointerType: 'touch',
    });
  });

  it('removes listeners on destroy', () => {
    const target = new StyledEventTarget();
    const revealEvents: Event[] = [];
    const controller = createUnifiedPointerHandler(target);

    target.addEventListener(REVEAL_EVENT_TYPE, (event) => {
      revealEvents.push(event);
    });
    controller.destroy();
    target.dispatchEvent(pointerEvent('pointerdown', { button: 0 }));
    target.dispatchEvent(pointerEvent('pointerup', { button: 0 }));

    expect(revealEvents).toHaveLength(0);
  });
});

class StyledEventTarget extends EventTarget implements PointerHandlerTarget {
  readonly style: { touchAction: string };

  constructor(touchAction = '') {
    super();
    this.style = { touchAction };
  }
}

function pointerEvent(
  type: string,
  options: {
    readonly button?: number;
    readonly pointerId?: number;
    readonly pointerType?: string;
    readonly timeStamp?: number;
  } = {},
): Event {
  const event = new Event(type, { cancelable: true });

  defineEventProperty(event, 'button', options.button ?? 0);

  if (options.pointerId !== undefined) {
    defineEventProperty(event, 'pointerId', options.pointerId);
  }

  if (options.pointerType !== undefined) {
    defineEventProperty(event, 'pointerType', options.pointerType);
  }

  if (options.timeStamp !== undefined) {
    defineEventProperty(event, 'timeStamp', options.timeStamp);
  }

  return event;
}

function defineEventProperty(
  event: Event,
  property: string,
  value: number | string,
): void {
  Object.defineProperty(event, property, {
    configurable: true,
    value,
  });
}
