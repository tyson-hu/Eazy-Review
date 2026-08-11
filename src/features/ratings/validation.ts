import {
  RATING_DIMENSION_KEYS,
  RATING_METHODOLOGY_VERSION,
  type PartialRatingDimensions,
  type RatingDimensionScores,
} from '@/src/features/ratings/dimensions';
import {
  RatingError,
  RATING_USER_MESSAGES,
} from '@/src/features/ratings/errors';
import { computeCompositeScore100 } from '@/src/features/ratings/score';

export const PRIVATE_NOTE_MAX_LENGTH = 500;
export const RATING_DIMENSION_MIN = 0;
export const RATING_DIMENSION_MAX = 10;
export const RATING_DIMENSION_STEP = 0.5;

/**
 * Accept a complete dimension value: 0–10 inclusive, 0.5 increments.
 * 0 is legitimate; unanswered is represented only as null upstream.
 */
export function isValidDimensionScore(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }
  if (value < RATING_DIMENSION_MIN || value > RATING_DIMENSION_MAX) {
    return false;
  }
  // Guard floating noise (e.g. 1.5000000002) while requiring half steps.
  const doubled = value * 2;
  return Math.abs(doubled - Math.round(doubled)) < 1e-9;
}

export function normalizePrivateNote(
  privateNote: string | null | undefined,
): string | null {
  if (privateNote == null) {
    return null;
  }
  const trimmed = privateNote.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return privateNote;
}

export function assertCompleteDimensions(
  dimensions: PartialRatingDimensions,
): asserts dimensions is RatingDimensionScores {
  for (const key of RATING_DIMENSION_KEYS) {
    const value = dimensions[key];
    if (value == null) {
      throw new RatingError('validation', RATING_USER_MESSAGES.scoreIncomplete, {
        source: 'validation',
      });
    }
    if (!isValidDimensionScore(value)) {
      throw new RatingError('validation', RATING_USER_MESSAGES.scoreInvalid, {
        source: 'validation',
      });
    }
  }
}

export type SaveUserRatingInputShape = PartialRatingDimensions & {
  productId: string;
  userId: string;
  privateNote?: string | null;
  /**
   * Clients must not supply a disagreeing composite. If provided for defensive
   * checks, it must match the server formula exactly.
   */
  score100?: number | null;
  methodologyVersion?: string;
};

export function assertSaveUserRatingInput(
  input: SaveUserRatingInputShape,
): asserts input is SaveUserRatingInputShape & RatingDimensionScores {
  if (!input.userId || !input.productId) {
    throw new RatingError(
      'unauthorized',
      RATING_USER_MESSAGES.unauthorized,
      { source: 'validation' },
    );
  }

  const dimensions = {
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
  } satisfies PartialRatingDimensions;

  assertCompleteDimensions(dimensions);

  if (
    input.methodologyVersion != null &&
    input.methodologyVersion !== RATING_METHODOLOGY_VERSION
  ) {
    throw new RatingError(
      'validation',
      RATING_USER_MESSAGES.methodologyMismatch,
      { source: 'validation' },
    );
  }

  if (input.score100 != null) {
    const expected = computeCompositeScore100(dimensions);
    if (expected == null || input.score100 !== expected) {
      throw new RatingError(
        'validation',
        RATING_USER_MESSAGES.scoreInconsistent,
        { source: 'validation' },
      );
    }
  }

  const note = input.privateNote;
  if (note != null && note.length > PRIVATE_NOTE_MAX_LENGTH) {
    throw new RatingError(
      'validation',
      RATING_USER_MESSAGES.privateNoteTooLong,
      { source: 'validation' },
    );
  }
}
