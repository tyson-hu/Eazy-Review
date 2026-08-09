import {
  RATING_METHODOLOGY_VERSION,
  type PartialRatingDimensions,
  type RatingDimensionScores,
} from '@/src/features/ratings/dimensions';
import { computeCompositeScore100 } from '@/src/features/ratings/score';
import {
  assertSaveUserRatingInput,
  isValidDimensionScore,
} from '@/src/features/ratings/validation';
import { RatingError } from '@/src/features/ratings/errors';

function all(value: number): RatingDimensionScores {
  return {
    look: value,
    outfit: value,
    material: value,
    craftsmanship: value,
    maintenance: value,
    comfort: value,
    collection: value,
    value: value,
    resalePotential: value,
    acquisitionEase: value,
  };
}

describe('computeCompositeScore100 (sneaker-10-v1)', () => {
  it('ten 9.0 dimensions => 90', () => {
    expect(computeCompositeScore100(all(9))).toBe(90);
  });

  it('reference sum 81.5 => 82', () => {
    const dims: RatingDimensionScores = {
      look: 9,
      outfit: 8,
      material: 8,
      craftsmanship: 9,
      maintenance: 7,
      comfort: 8.5,
      collection: 8,
      value: 8,
      resalePotential: 8,
      acquisitionEase: 8,
    };
    // 9+8+8+9+7+8.5+8+8+8+8 = 81.5
    expect(Object.values(dims).reduce((a, b) => a + b, 0)).toBe(81.5);
    expect(computeCompositeScore100(dims)).toBe(82);
  });

  it('accepts 0 dimensions and does not treat them as unanswered', () => {
    const dims = all(0);
    expect(computeCompositeScore100(dims)).toBe(0);
  });

  it('returns null when any dimension is unanswered (null)', () => {
    const partial: PartialRatingDimensions = {
      ...all(9),
      look: null,
    };
    expect(computeCompositeScore100(partial)).toBeNull();
  });
});

describe('dimension validation', () => {
  it('accepts half steps', () => {
    expect(isValidDimensionScore(0)).toBe(true);
    expect(isValidDimensionScore(0.5)).toBe(true);
    expect(isValidDimensionScore(9.5)).toBe(true);
    expect(isValidDimensionScore(10)).toBe(true);
  });

  it('rejects invalid increments and ranges', () => {
    expect(isValidDimensionScore(0.25)).toBe(false);
    expect(isValidDimensionScore(10.5)).toBe(false);
    expect(isValidDimensionScore(-0.5)).toBe(false);
    expect(isValidDimensionScore(null)).toBe(false);
  });

  it('rejects inconsistent client composite', () => {
    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        ...all(9),
        score100: 91,
      }),
    ).toThrow(RatingError);
  });

  it('rejects methodology mismatch', () => {
    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        ...all(9),
        methodologyVersion: 'legacy-6-v0',
      }),
    ).toThrow(RatingError);
  });

  it('accepts matching derived score100', () => {
    expect(() =>
      assertSaveUserRatingInput({
        productId: 'p1',
        userId: 'u1',
        ...all(9),
        score100: 90,
        methodologyVersion: RATING_METHODOLOGY_VERSION,
      }),
    ).not.toThrow();
  });
});
