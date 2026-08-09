import type { RatingBreakdown } from '@/src/types/product';

/** Owner My Rating as displayed/composed with Product Detail. */
export type MyRating = RatingBreakdown & {
  privateNote: string | null;
};

export type RatingScoreFields = {
  look: number;
  comfort: number;
  quality: number;
  outfit: number;
  value: number;
  overall: number;
};

export type SaveUserRatingInput = RatingScoreFields & {
  productId: string;
  userId: string;
  privateNote?: string | null;
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
  myOverall: number;
  myScores: RatingScoreFields;
  /** `user_ratings.updated_at` for deterministic ordering. */
  ratedAt: string;
};

export const PRIVATE_NOTE_MAX_LENGTH = 500;
export const RATING_SCORE_MIN = 1;
export const RATING_SCORE_MAX = 10;

export const RATING_SCORE_KEYS = [
  'look',
  'comfort',
  'quality',
  'outfit',
  'value',
  'overall',
] as const satisfies readonly (keyof RatingScoreFields)[];
