import { describe, expect, it } from 'vitest';

import {
  DIFFICULTY_CONFIGS,
  getMaxMines,
  validateBoardConfig,
} from '../../src/ui/controls';
import type { BoardConfig } from '../../src/types';

describe('validateBoardConfig', () => {
  it('accepts the built-in difficulty presets', () => {
    expect(validateBoardConfig(DIFFICULTY_CONFIGS.beginner).valid).toBe(true);
    expect(validateBoardConfig(DIFFICULTY_CONFIGS.intermediate).valid).toBe(
      true,
    );
    expect(validateBoardConfig(DIFFICULTY_CONFIGS.expert).valid).toBe(true);
  });

  it('requires rows and columns between 5 and 40', () => {
    expect(validateBoardConfig(customConfig({ rows: 4 })).message).toContain(
      'Rows',
    );
    expect(validateBoardConfig(customConfig({ rows: 41 })).message).toContain(
      'Rows',
    );
    expect(validateBoardConfig(customConfig({ cols: 4 })).message).toContain(
      'Columns',
    );
    expect(validateBoardConfig(customConfig({ cols: 41 })).message).toContain(
      'Columns',
    );
  });

  it('requires mines to leave the first-click safety area available', () => {
    expect(getMaxMines(5, 5)).toBe(15);
    expect(
      validateBoardConfig(customConfig({ rows: 5, cols: 5, mines: 15 })).valid,
    ).toBe(true);
    expect(
      validateBoardConfig(customConfig({ rows: 5, cols: 5, mines: 16 }))
        .message,
    ).toContain('15');
  });

  it('rejects non-integer numeric values', () => {
    expect(validateBoardConfig(customConfig({ rows: 5.5 })).message).toContain(
      'Rows',
    );
    expect(validateBoardConfig(customConfig({ cols: 8.25 })).message).toContain(
      'Columns',
    );
    expect(validateBoardConfig(customConfig({ mines: 4.5 })).message).toBe(
      'Mines must be at least 1.',
    );
  });
});

function customConfig(overrides: Partial<BoardConfig>): BoardConfig {
  return {
    rows: 8,
    cols: 8,
    mines: 10,
    difficulty: 'custom',
    ...overrides,
  };
}
