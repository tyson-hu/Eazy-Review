import {
  assertSaveUserRatingInput,
  isValidDimensionScore,
} from '@/src/features/ratings/validation';
import { PRIVATE_NOTE_MAX_LENGTH } from '@/src/features/ratings/types';
import { RatingError } from '@/src/features/ratings/errors';
import { uniformDimensions } from '@/src/features/ratings/testFixtures';

describe('rating validation', () => {
  it('accepts 0–10 half steps including zero', () => {
    expect(isValidDimensionScore(0)).toBe(true);
    expect(isValidDimensionScore(0.5)).toBe(true);
    expect(isValidDimensionScore(10)).toBe(true);
    expect(isValidDimensionScore(1.5)).toBe(true);
    expect(isValidDimensionScore(0.25)).toBe(false);
    expect(isValidDimensionScore(11)).toBe(false);
  });

  it('enforces the 500-character private note boundary', () => {
    const dims = uniformDimensions(5);
    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        ...dims,
        privateNote: 'a'.repeat(PRIVATE_NOTE_MAX_LENGTH),
      }),
    ).not.toThrow();

    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        ...dims,
        privateNote: 'a'.repeat(PRIVATE_NOTE_MAX_LENGTH + 1),
      }),
    ).toThrow(RatingError);
  });
});
