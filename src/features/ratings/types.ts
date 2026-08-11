import type {
  RatingDimensionScores,
} from '@/src/features/ratings/dimensions';
import { RATING_METHODOLOGY_VERSION } from '@/src/features/ratings/dimensions';

/** Owner My Rating as displayed/composed with Product Detail. */
export type MyRating = RatingDimensionScores & {
  /** Derived 0–100 composite; never user-entered. */
  score100: number;
  privateNote: string | null;
  methodologyVersion: typeof RATING_METHODOLOGY_VERSION;
};

export type SaveUserRatingInput = RatingDimensionScores & {
  productId: string;
  userId: string;
  privateNote?: string | null;
  /** Optional defensive client check; must match derived composite when set. */
  score100?: number | null;
  methodologyVersion?: string;
};

/**
 * Owner-only Rated Products row. Deliberately not `ProductCardData` so My Rating
 * never leaks into the anonymous catalog card contract.
 */
export type RatedProductItem = {
  productId: string;
  brand: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  communityScore: number | null;
  ratingCount: number;
  /** Derived 0–100 My Rating. */
  myScore100: number;
  myDimensions: RatingDimensionScores;
  /** `user_ratings.updated_at` for deterministic ordering. */
  ratedAt: string;
};

export {
  PRIVATE_NOTE_MAX_LENGTH,
  RATING_DIMENSION_MAX,
  RATING_DIMENSION_MIN,
  RATING_DIMENSION_STEP,
} from '@/src/features/ratings/validation';

