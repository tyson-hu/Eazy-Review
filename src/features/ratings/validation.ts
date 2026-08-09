import {
  PRIVATE_NOTE_MAX_LENGTH,
  RATING_SCORE_KEYS,
  RATING_SCORE_MAX,
  RATING_SCORE_MIN,
  type RatingScoreFields,
  type SaveUserRatingInput,
} from '@/src/features/ratings/types';
import {
  RatingError,
  RATING_USER_MESSAGES,
} from '@/src/features/ratings/errors';

/**
 * Parse a score field from form text. Requires a whole number in [1, 10].
 * Rejects empty, decimals, leading zeros padding beyond the numeric value rules
 * that still parse as integers (e.g. "10" is fine, "1.0" is not).
 */
export function parseRatingScore(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^(?:[1-9]|10)$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  if (
    !Number.isInteger(value) ||
    value < RATING_SCORE_MIN ||
    value > RATING_SCORE_MAX
  ) {
    return null;
  }
  return value;
}

export function isValidRatingScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= RATING_SCORE_MIN &&
    value <= RATING_SCORE_MAX
  );
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

export function assertSaveUserRatingInput(
  input: SaveUserRatingInput,
): asserts input is SaveUserRatingInput {
  if (!input.userId || !input.productId) {
    throw new RatingError(
      'unauthorized',
      RATING_USER_MESSAGES.unauthorized,
      { source: 'validation' },
    );
  }

  for (const key of RATING_SCORE_KEYS) {
    if (!isValidRatingScore(input[key])) {
      throw new RatingError('validation', RATING_USER_MESSAGES.scoreInvalid, {
        source: 'validation',
      });
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

export function scoresFromNumbers(
  scores: RatingScoreFields,
): RatingScoreFields {
  return {
    look: scores.look,
    comfort: scores.comfort,
    quality: scores.quality,
    outfit: scores.outfit,
    value: scores.value,
    overall: scores.overall,
  };
}
