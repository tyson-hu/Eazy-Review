import {
  RATING_DIMENSION_KEYS,
  type PartialRatingDimensions,
  type RatingDimensionScores,
} from '@/src/features/ratings/dimensions';

/**
 * sneaker-10-v1 composite (0–100):
 *   composite = round(sum of ten 0–10 dimensions)
 * which equals round(average(dimensions) * 10).
 *
 * Only defined when every dimension is present (including legitimate zeros).
 * Never treat null/unanswered as 0.
 */
export function computeCompositeScore100(
  dimensions: PartialRatingDimensions | RatingDimensionScores,
): number | null {
  let sum = 0;
  for (const key of RATING_DIMENSION_KEYS) {
    const value = dimensions[key];
    if (value == null) {
      return null;
    }
    sum += value;
  }
  return Math.round(sum);
}

export function isCompleteDimensionSet(
  dimensions: PartialRatingDimensions,
): dimensions is RatingDimensionScores {
  return RATING_DIMENSION_KEYS.every((key) => dimensions[key] != null);
}

export function emptyPartialDimensions(): PartialRatingDimensions {
  return {
    look: null,
    outfit: null,
    material: null,
    craftsmanship: null,
    maintenance: null,
    comfort: null,
    collection: null,
    value: null,
    resalePotential: null,
    acquisitionEase: null,
  };
}

export function pickDimensionScores(
  input: RatingDimensionScores,
): RatingDimensionScores {
  return {
    look: input.look,
    outfit: input.outfit,
    material: input.material,
    craftsmanship: input.craftsmanship,
    maintenance: input.maintenance,
    comfort: input.comfort,
    collection: input.collection,
    value: input.value,
    resalePotential: input.resalePotential,
    acquisitionEase: input.acquisitionEase,
  };
}

export function formatDimensionScore10(score10: number | null | undefined): string {
  if (score10 == null) {
    return '—';
  }
  return Number.isInteger(score10) ? String(score10) : score10.toFixed(1);
}
