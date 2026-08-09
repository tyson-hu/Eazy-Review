import {
  isUniqueViolation,
  normalizeRatingError,
  RatingError,
  RATING_USER_MESSAGES,
} from '@/src/features/ratings/errors';
import type {
  MyRating,
  RatedProductItem,
  RatingScoreFields,
  SaveUserRatingInput,
} from '@/src/features/ratings/types';
import {
  assertSaveUserRatingInput,
  normalizePrivateNote,
  scoresFromNumbers,
} from '@/src/features/ratings/validation';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type RatingRequestOptions = {
  client?: AppSupabaseClient;
  signal?: AbortSignal;
  isOnline?: () => boolean;
};

const MY_RATING_SELECT =
  'look, comfort, quality, outfit, value, overall, private_note';

const RATED_PRODUCTS_SELECT = `
  product_id,
  look,
  comfort,
  quality,
  outfit,
  value,
  overall,
  updated_at,
  products (
    id,
    brand,
    name,
    sku,
    is_published,
    product_images (
      id,
      image_url,
      sort_order,
      created_at
    ),
    rating_aggregates (
      product_id,
      rating_count,
      score
    )
  )
`;

type UserRatingRow = {
  look: number;
  comfort: number;
  quality: number;
  outfit: number;
  value: number;
  overall: number;
  private_note: string | null;
};

type RatedProductsDbRow = {
  product_id: string;
  look: number;
  comfort: number;
  quality: number;
  outfit: number;
  value: number;
  overall: number;
  updated_at: string;
  products:
    | {
        id: string;
        brand: string;
        name: string;
        sku: string | null;
        is_published: boolean;
        product_images:
          | {
              id: string;
              image_url: string;
              sort_order: number;
              created_at: string;
            }[]
          | null;
        rating_aggregates:
          | {
              product_id: string;
              rating_count: number;
              score: number | null;
            }
          | {
              product_id: string;
              rating_count: number;
              score: number | null;
            }[]
          | null;
      }
    | null;
};

function isOffline(options: RatingRequestOptions): boolean {
  return options.isOnline?.() === false;
}

function adaptMyRating(row: UserRatingRow): MyRating {
  return {
    look: row.look,
    comfort: row.comfort,
    quality: row.quality,
    outfit: row.outfit,
    value: row.value,
    overall: row.overall,
    privateNote: row.private_note,
  };
}

function scorePayload(input: SaveUserRatingInput): RatingScoreFields & {
  private_note: string | null;
} {
  return {
    look: input.look,
    comfort: input.comfort,
    quality: input.quality,
    outfit: input.outfit,
    value: input.value,
    overall: input.overall,
    private_note: normalizePrivateNote(input.privateNote),
  };
}

/**
 * Score + private_note columns only. Identity columns are never updated.
 */
function updateScorePayload(input: SaveUserRatingInput) {
  return scorePayload(input);
}

function pickPrimaryImageUrl(
  images:
    | {
        id: string;
        image_url: string;
        sort_order: number;
        created_at: string;
      }[]
    | null
    | undefined,
): string | null {
  if (!images || images.length === 0) {
    return null;
  }
  const sorted = [...images].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    if (a.created_at !== b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return a.id.localeCompare(b.id);
  });
  return sorted[0]?.image_url ?? null;
}

function adaptRatedProduct(row: RatedProductsDbRow): RatedProductItem | null {
  const product = row.products;
  if (!product || product.is_published !== true) {
    return null;
  }

  const aggregate = Array.isArray(product.rating_aggregates)
    ? product.rating_aggregates[0] ?? null
    : product.rating_aggregates;

  return {
    productId: product.id,
    brand: product.brand,
    name: product.name,
    sku: product.sku,
    imageUrl: pickPrimaryImageUrl(product.product_images),
    communityScore: aggregate?.score ?? null,
    ratingCount: aggregate?.rating_count ?? 0,
    myOverall: row.overall,
    myScores: scoresFromNumbers(row),
    ratedAt: row.updated_at,
  };
}

/**
 * Owner-only My Rating for one product.
 * Returns `null` when the authenticated owner has no row.
 */
export async function getUserRating(
  productId: string,
  userId: string,
  options: RatingRequestOptions = {},
): Promise<MyRating | null> {
  if (!userId || !productId) {
    throw new RatingError(
      'unauthorized',
      RATING_USER_MESSAGES.unauthorized,
      { source: 'validation' },
    );
  }

  try {
    const client = options.client ?? getSupabase();
    let query = client
      .from('user_ratings')
      .select(MY_RATING_SELECT)
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (options.signal) {
      query = query.abortSignal(options.signal);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw normalizeRatingError(error, {
        operation: 'read',
        isOffline: isOffline(options),
      });
    }

    if (data == null) {
      return null;
    }

    return adaptMyRating(data as UserRatingRow);
  } catch (error) {
    if (error instanceof RatingError) {
      throw error;
    }
    throw normalizeRatingError(error, {
      operation: 'read',
      isOffline: isOffline(options),
    });
  }
}

/**
 * UPDATE only score fields + private_note for an existing owner row.
 * Never patches id, user_id, product_id, or timestamps via the client payload.
 */
async function updateUserRatingScores(
  input: SaveUserRatingInput,
  client: AppSupabaseClient,
  signal?: AbortSignal,
): Promise<MyRating> {
  let query = client
    .from('user_ratings')
    .update(updateScorePayload(input))
    .eq('user_id', input.userId)
    .eq('product_id', input.productId)
    .select(MY_RATING_SELECT);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw normalizeRatingError(error, { operation: 'save' });
  }
  if (data == null) {
    throw new RatingError(
      'server-error',
      RATING_USER_MESSAGES.saveFailed,
      { source: 'server' },
    );
  }
  return adaptMyRating(data as UserRatingRow);
}

async function insertUserRating(
  input: SaveUserRatingInput,
  client: AppSupabaseClient,
  signal?: AbortSignal,
): Promise<MyRating> {
  const scores = scorePayload(input);
  let query = client
    .from('user_ratings')
    .insert({
      user_id: input.userId,
      product_id: input.productId,
      look: scores.look,
      comfort: scores.comfort,
      quality: scores.quality,
      outfit: scores.outfit,
      value: scores.value,
      overall: scores.overall,
      private_note: scores.private_note,
    })
    .select(MY_RATING_SELECT);

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    // Rethrow unique violation for the caller to recover with UPDATE.
    if (isUniqueViolation(error)) {
      throw error;
    }
    throw normalizeRatingError(error, { operation: 'save' });
  }
  if (data == null) {
    throw new RatingError(
      'server-error',
      RATING_USER_MESSAGES.saveFailed,
      { source: 'server' },
    );
  }
  return adaptMyRating(data as UserRatingRow);
}

/**
 * Locked Task 17 write path:
 * 1. Read existing owner row
 * 2. UPDATE scores + private_note when present
 * 3. INSERT when absent
 * 4. On INSERT 23505, recover with the permitted score/private-note UPDATE
 *
 * Never uses PostgREST `.upsert()`.
 */
export async function saveUserRating(
  input: SaveUserRatingInput,
  options: RatingRequestOptions = {},
): Promise<MyRating> {
  assertSaveUserRatingInput(input);

  if (isOffline(options)) {
    throw new RatingError('offline', RATING_USER_MESSAGES.offline, {
      source: 'transport',
    });
  }

  const client = options.client ?? getSupabase();

  try {
    const existing = await getUserRating(input.productId, input.userId, {
      client,
      signal: options.signal,
      isOnline: options.isOnline,
    });

    if (existing) {
      return await updateUserRatingScores(input, client, options.signal);
    }

    try {
      return await insertUserRating(input, client, options.signal);
    } catch (insertError) {
      if (isUniqueViolation(insertError)) {
        // Concurrent first-save race: peer insert won; apply permitted update.
        return await updateUserRatingScores(input, client, options.signal);
      }
      throw insertError;
    }
  } catch (error) {
    if (error instanceof RatingError) {
      throw error;
    }
    throw normalizeRatingError(error, {
      operation: 'save',
      isOffline: isOffline(options),
    });
  }
}

/**
 * Owner-only rated product list in one bounded query (no N+1).
 * Stable order: most recently updated first, then product_id.
 * Does not place private notes on the list view model.
 */
export async function getUserRatedProducts(
  userId: string,
  options: RatingRequestOptions = {},
): Promise<RatedProductItem[]> {
  if (!userId) {
    throw new RatingError(
      'unauthorized',
      RATING_USER_MESSAGES.unauthorized,
      { source: 'validation' },
    );
  }

  try {
    const client = options.client ?? getSupabase();
    let query = client
      .from('user_ratings')
      .select(RATED_PRODUCTS_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .order('product_id', { ascending: true });

    if (options.signal) {
      query = query.abortSignal(options.signal);
    }

    const { data, error } = await query;

    if (error) {
      throw normalizeRatingError(error, {
        operation: 'list',
        isOffline: isOffline(options),
      });
    }

    const rows = (data ?? []) as RatedProductsDbRow[];
    return rows
      .map(adaptRatedProduct)
      .filter((item): item is RatedProductItem => item != null);
  } catch (error) {
    if (error instanceof RatingError) {
      throw error;
    }
    throw normalizeRatingError(error, {
      operation: 'list',
      isOffline: isOffline(options),
    });
  }
}
