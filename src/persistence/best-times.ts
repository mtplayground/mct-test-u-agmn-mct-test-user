import type { Difficulty } from '../types';

export type BestTimeDifficulty = Exclude<Difficulty, 'custom'>;

export interface BestTimesStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface BestTimeUpdate {
  readonly bestSeconds: number;
  readonly isNewBest: boolean;
}

export interface BestTimesStore {
  getBestTime: (difficulty: Difficulty) => number | null;
  recordBestTime: (
    difficulty: Difficulty,
    seconds: number,
  ) => BestTimeUpdate | null;
}

export type BestTimesRecord = Partial<Record<BestTimeDifficulty, number>>;

export const BEST_TIMES_STORAGE_KEY = 'zeroclaw.bestTimes.v1';

const TRACKED_DIFFICULTIES = [
  'beginner',
  'intermediate',
  'expert',
] as const satisfies readonly BestTimeDifficulty[];

export function createBestTimesStore(
  storage: BestTimesStorage | null = getBrowserStorage(),
): BestTimesStore {
  return {
    getBestTime: (difficulty) => getBestTime(storage, difficulty),
    recordBestTime: (difficulty, seconds) =>
      recordBestTime(storage, difficulty, seconds),
  };
}

export function getBestTime(
  storage: BestTimesStorage | null,
  difficulty: Difficulty,
): number | null {
  if (storage === null || !isBestTimeDifficulty(difficulty)) {
    return null;
  }

  return readBestTimes(storage)[difficulty] ?? null;
}

export function recordBestTime(
  storage: BestTimesStorage | null,
  difficulty: Difficulty,
  seconds: number,
): BestTimeUpdate | null {
  if (storage === null || !isBestTimeDifficulty(difficulty)) {
    return null;
  }

  const normalizedSeconds = normalizeSeconds(seconds);

  if (normalizedSeconds === null) {
    return null;
  }

  const bestTimes = readBestTimes(storage);
  const currentBest = bestTimes[difficulty] ?? null;

  if (currentBest !== null && currentBest <= normalizedSeconds) {
    return {
      bestSeconds: currentBest,
      isNewBest: false,
    };
  }

  const nextBestTimes = {
    ...bestTimes,
    [difficulty]: normalizedSeconds,
  };

  writeBestTimes(storage, nextBestTimes);

  return {
    bestSeconds: normalizedSeconds,
    isNewBest: true,
  };
}

export function readBestTimes(storage: BestTimesStorage): BestTimesRecord {
  try {
    const rawValue = storage.getItem(BEST_TIMES_STORAGE_KEY);

    if (rawValue === null) {
      return {};
    }

    return normalizeBestTimes(JSON.parse(rawValue));
  } catch {
    return {};
  }
}

export function writeBestTimes(
  storage: BestTimesStorage,
  bestTimes: BestTimesRecord,
): void {
  try {
    storage.setItem(
      BEST_TIMES_STORAGE_KEY,
      JSON.stringify(normalizeBestTimes(bestTimes)),
    );
  } catch {
    return;
  }
}

export function isBestTimeDifficulty(
  difficulty: Difficulty,
): difficulty is BestTimeDifficulty {
  return TRACKED_DIFFICULTIES.includes(difficulty as BestTimeDifficulty);
}

function normalizeBestTimes(value: unknown): BestTimesRecord {
  if (value === null || typeof value !== 'object') {
    return {};
  }

  const record = value as Record<string, unknown>;
  const bestTimes: BestTimesRecord = {};

  TRACKED_DIFFICULTIES.forEach((difficulty) => {
    const seconds = normalizeSeconds(record[difficulty]);

    if (seconds !== null) {
      bestTimes[difficulty] = seconds;
    }
  });

  return bestTimes;
}

function normalizeSeconds(value: unknown): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function getBrowserStorage(): BestTimesStorage | null {
  try {
    if (!('localStorage' in globalThis)) {
      return null;
    }

    return globalThis.localStorage;
  } catch {
    return null;
  }
}
