import { describe, expect, it } from 'vitest';

describe('unit test setup', () => {
  it('runs Vitest smoke tests', () => {
    expect('ZeroClaw').toContain('Claw');
  });
});
