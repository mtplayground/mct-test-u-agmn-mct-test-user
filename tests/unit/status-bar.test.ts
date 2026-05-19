import { describe, expect, it } from 'vitest';

import { formatElapsedSeconds, getStatusText } from '../../src/ui/status-bar';

describe('formatElapsedSeconds', () => {
  it('formats elapsed seconds as minutes and padded seconds', () => {
    expect(formatElapsedSeconds(0)).toBe('0:00');
    expect(formatElapsedSeconds(9)).toBe('0:09');
    expect(formatElapsedSeconds(65)).toBe('1:05');
    expect(formatElapsedSeconds(3661)).toBe('61:01');
  });

  it('normalizes negative and fractional input', () => {
    expect(formatElapsedSeconds(-5)).toBe('0:00');
    expect(formatElapsedSeconds(12.9)).toBe('0:12');
  });
});

describe('getStatusText', () => {
  it('maps game states to user-facing status text', () => {
    expect(getStatusText('ready')).toBe('Ready');
    expect(getStatusText('playing')).toBe('Playing');
    expect(getStatusText('won')).toBe('Won');
    expect(getStatusText('lost')).toBe('Lost');
  });
});
