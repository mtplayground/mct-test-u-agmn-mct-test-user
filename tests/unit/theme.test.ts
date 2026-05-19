import { describe, expect, it } from 'vitest';

import {
  THEME_STORAGE_KEY,
  getNextTheme,
  readStoredTheme,
  resolveInitialTheme,
  writeStoredTheme,
} from '../../src/ui/theme';
import type { ThemeStorage } from '../../src/ui/theme';

describe('theme persistence', () => {
  it('uses a stored theme before system preference', () => {
    const storage = createMockStorage();
    storage.setItem(THEME_STORAGE_KEY, 'light');

    expect(resolveInitialTheme(storage, () => true)).toBe('light');
  });

  it('falls back to the system color scheme on first load', () => {
    expect(resolveInitialTheme(createMockStorage(), () => true)).toBe('dark');
    expect(resolveInitialTheme(createMockStorage(), () => false)).toBe('light');
  });

  it('ignores invalid stored values', () => {
    const storage = createMockStorage();
    storage.setItem(THEME_STORAGE_KEY, 'sepia');

    expect(readStoredTheme(storage)).toBeNull();
  });

  it('writes valid theme choices', () => {
    const storage = createMockStorage();

    writeStoredTheme(storage, 'dark');

    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('toggles between light and dark', () => {
    expect(getNextTheme('light')).toBe('dark');
    expect(getNextTheme('dark')).toBe('light');
  });
});

function createMockStorage(): ThemeStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
