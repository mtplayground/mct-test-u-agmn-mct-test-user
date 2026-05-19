import { describe, expect, it } from 'vitest';

import { getOutcomeContent } from '../../src/ui/outcome-overlay';

describe('getOutcomeContent', () => {
  it('is hidden for non-terminal game states', () => {
    expect(getOutcomeContent('ready')).toBeNull();
    expect(getOutcomeContent('playing')).toBeNull();
  });

  it('returns win banner copy', () => {
    expect(getOutcomeContent('won')).toEqual({
      title: 'You won',
      message: 'Every safe cell is clear.',
      variant: 'won',
    });
  });

  it('returns loss banner copy', () => {
    expect(getOutcomeContent('lost')).toEqual({
      title: 'Game over',
      message: 'A mine was revealed.',
      variant: 'lost',
    });
  });
});
