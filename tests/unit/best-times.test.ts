import { describe, expect, it } from 'vitest';

import {
  BEST_TIMES_STORAGE_KEY,
  createBestTimesStore,
  getBestTime,
  isBestTimeDifficulty,
  readBestTimes,
  recordBestTime,
} from '../../src/persistence/best-times';

describe('best times persistence', () => {
  it('records and reads the best seconds per tracked difficulty', () => {
    const storage = createMockStorage();
    const store = createBestTimesStore(storage);

    expect(store.getBestTime('beginner')).toBeNull();
    expect(store.recordBestTime('beginner', 42)).toEqual({
      bestSeconds: 42,
      isNewBest: true,
    });
    expect(store.getBestTime('beginner')).toBe(42);
    expect(store.getBestTime('intermediate')).toBeNull();
  });

  it('keeps the lower recorded time', () => {
    const storage = createMockStorage();

    expect(recordBestTime(storage, 'expert', 100)).toEqual({
      bestSeconds: 100,
      isNewBest: true,
    });
    expect(recordBestTime(storage, 'expert', 125)).toEqual({
      bestSeconds: 100,
      isNewBest: false,
    });
    expect(recordBestTime(storage, 'expert', 90)).toEqual({
      bestSeconds: 90,
      isNewBest: true,
    });
    expect(getBestTime(storage, 'expert')).toBe(90);
  });

  it('excludes custom games', () => {
    const storage = createMockStorage();

    expect(isBestTimeDifficulty('custom')).toBe(false);
    expect(recordBestTime(storage, 'custom', 10)).toBeNull();
    expect(getBestTime(storage, 'custom')).toBeNull();
    expect(storage.getItem(BEST_TIMES_STORAGE_KEY)).toBeNull();
  });

  it('ignores malformed stored values', () => {
    const storage = createMockStorage();
    storage.setItem(
      BEST_TIMES_STORAGE_KEY,
      JSON.stringify({
        beginner: 12,
        intermediate: -1,
        expert: 4.5,
        custom: 3,
      }),
    );

    expect(readBestTimes(storage)).toEqual({ beginner: 12 });
  });

  it('survives unavailable storage', () => {
    expect(createBestTimesStore(null).getBestTime('beginner')).toBeNull();
    expect(
      createBestTimesStore(null).recordBestTime('beginner', 12),
    ).toBeNull();
  });
});

function createMockStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
