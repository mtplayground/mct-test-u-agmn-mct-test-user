import { describe, expect, it } from 'vitest';

import {
  SFX_MUTED_STORAGE_KEY,
  readStoredMuted,
  writeStoredMuted,
} from '../../src/audio/sfx';
import type { SfxStorage } from '../../src/audio/sfx';

describe('sound effect mute persistence', () => {
  it('reads persisted mute states', () => {
    const storage = createMockStorage();

    storage.setItem(SFX_MUTED_STORAGE_KEY, 'true');
    expect(readStoredMuted(storage)).toBe(true);

    storage.setItem(SFX_MUTED_STORAGE_KEY, 'false');
    expect(readStoredMuted(storage)).toBe(false);
  });

  it('ignores invalid stored values', () => {
    const storage = createMockStorage();

    storage.setItem(SFX_MUTED_STORAGE_KEY, 'loud');

    expect(readStoredMuted(storage)).toBeNull();
  });

  it('writes mute states', () => {
    const storage = createMockStorage();

    writeStoredMuted(storage, false);
    expect(storage.getItem(SFX_MUTED_STORAGE_KEY)).toBe('false');

    writeStoredMuted(storage, true);
    expect(storage.getItem(SFX_MUTED_STORAGE_KEY)).toBe('true');
  });

  it('survives unavailable storage', () => {
    expect(readStoredMuted(null)).toBeNull();
    expect(() => {
      writeStoredMuted(null, false);
    }).not.toThrow();
  });
});

function createMockStorage(): SfxStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
