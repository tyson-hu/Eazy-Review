import {
  assertSaveUserRatingInput,
  parseRatingScore,
} from '@/src/features/ratings/validation';
import { PRIVATE_NOTE_MAX_LENGTH } from '@/src/features/ratings/types';
import { RatingError } from '@/src/features/ratings/errors';

describe('rating validation', () => {
  it('accepts whole numbers 1–10 only', () => {
    expect(parseRatingScore('1')).toBe(1);
    expect(parseRatingScore('10')).toBe(10);
    expect(parseRatingScore('7')).toBe(7);
    expect(parseRatingScore('0')).toBeNull();
    expect(parseRatingScore('11')).toBeNull();
    expect(parseRatingScore('1.5')).toBeNull();
    expect(parseRatingScore('01')).toBeNull();
    expect(parseRatingScore('')).toBeNull();
    expect(parseRatingScore('abc')).toBeNull();
  });

  it('enforces the 500-character private note boundary', () => {
    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        look: 5,
        comfort: 5,
        quality: 5,
        outfit: 5,
        value: 5,
        overall: 5,
        privateNote: 'a'.repeat(PRIVATE_NOTE_MAX_LENGTH),
      }),
    ).not.toThrow();

    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        look: 5,
        comfort: 5,
        quality: 5,
        outfit: 5,
        value: 5,
        overall: 5,
        privateNote: 'a'.repeat(PRIVATE_NOTE_MAX_LENGTH + 1),
      }),
    ).toThrow(RatingError);
  });
});
