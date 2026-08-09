import type { RatingDimensionScores } from '@/src/features/ratings/dimensions';
import { RATING_METHODOLOGY_VERSION } from '@/src/features/ratings/dimensions';
import { computeCompositeScore100 } from '@/src/features/ratings/score';
import type { MyRating } from '@/src/features/ratings/types';
import type {
  EazyAssessmentViewModel,
  ProductRatingSummary,
} from '@/src/types/product';

/** Ten identical dimension values for tests. */
export function uniformDimensions(value: number): RatingDimensionScores {
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

export function sampleMyRating(
  overrides: Partial<MyRating> = {},
): MyRating {
  const dims = uniformDimensions(8);
  return {
    ...dims,
    score100: computeCompositeScore100(dims)!,
    privateNote: null,
    methodologyVersion: RATING_METHODOLOGY_VERSION,
    ...overrides,
  };
}

export function emptyProductRatingSummary(
  productId: string,
): ProductRatingSummary {
  return {
    productId,
    ratingCount: 0,
    lookAvg: null,
    outfitAvg: null,
    materialAvg: null,
    craftsmanshipAvg: null,
    maintenanceAvg: null,
    comfortAvg: null,
    collectionAvg: null,
    valueAvg: null,
    resalePotentialAvg: null,
    acquisitionEaseAvg: null,
    communityScore: null,
    methodologyVersion: null,
  };
}

export function sampleEazyAssessment(
  score100 = 79,
): EazyAssessmentViewModel {
  const dims = {
    ...uniformDimensions(8),
    maintenance: 7,
  };
  return {
    score100,
    methodologyVersion: RATING_METHODOLOGY_VERSION,
    assessedAt: '2026-08-01T00:00:00.000Z',
    dimensions: dims,
  };
}
