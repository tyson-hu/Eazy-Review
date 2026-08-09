import {
  isUniqueViolation,
  normalizeRatingError,
  RatingError,
  RATING_USER_MESSAGES,
} from '@/src/features/ratings/errors';
import type {
  MyRating,
  RatedProductItem,
  SaveUserRatingInput,
} from '@/src/features/ratings/types';
import {
  RATING_METHODOLOGY_VERSION,
  type RatingDimensionScores,
} from '@/src/features/ratings/dimensions';
import {
  assertSaveUserRatingInput,
  normalizePrivateNote,
} from '@/src/features/ratings/validation';
import { pickDimensionScores } from '@/src/features/ratings/score';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  withRequestTimeout,
} from '@/src/lib/network/requestTimeout';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

export type RatingRequestOptions = {
  client?: AppSupabaseClient;
  signal?: AbortSignal;
  isOnline?: () => boolean;
  timeoutMs?: number;
};

const MY_RATING_SELECT = `
  look,
  outfit,
  material,
  craftsmanship,
  maintenance,
  comfort,
  collection,
  value,
  resale_potential,
  acquisition_ease,
  score,
  methodology_version,
  private_note
`;

const RATED_PRODUCTS_SELECT = `
  product_id,
  look,
  outfit,
  material,
  craftsmanship,
  maintenance,
  comfort,
  collection,
  value,
  resale_potential,
  acquisition_ease,
  score,
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
  outfit: number;
  material: number;
  craftsmanship: number;
  maintenance: number;
  comfort: number;
  collection: number;
  value: number;
  resale_potential: number;
  acquisition_ease: number;
  score: number;
  methodology_version: string;
  private_note: string | null;
};

type RatedProductsDbRow = {
  product_id: string;
  look: number;
  outfit: number;
  material: number;
  craftsmanship: number;
  maintenance: number;
  comfort: number;
  collection: number;
  value: number;
  resale_potential: number;
  acquisition_ease: number;
  score: number;
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

function dimensionsFromRow(row: {
  look: number;
  outfit: number;
  material: number;
  craftsmanship: number;
  maintenance: number;
  comfort: number;
  collection: number;
  value: number;
  resale_potential: number;
  acquisition_ease: number;
}): RatingDimensionScores {
  return {
    look: Number(row.look),
    outfit: Number(row.outfit),
    material: Number(row.material),
    craftsmanship: Number(row.craftsmanship),
    maintenance: Number(row.maintenance),
    comfort: Number(row.comfort),
    collection: Number(row.collection),
    value: Number(row.value),
    resalePotential: Number(row.resale_potential),
    acquisitionEase: Number(row.acquisition_ease),
  };
}

function adaptMyRating(row: UserRatingRow): MyRating {
  if (row.methodology_version !== RATING_METHODOLOGY_VERSION) {
    throw new RatingError(
      'invalid-response',
      RATING_USER_MESSAGES.methodologyMismatch,
      { source: 'response' },
    );
  }
  return {
    ...dimensionsFromRow(row),
    score100: Number(row.score),
    privateNote: row.private_note,
    methodologyVersion: RATING_METHODOLOGY_VERSION,
  };
}

/**
 * Dimension + private_note payload only. score and methodology_version are
 * server-owned (derive trigger). Never send a client composite.
 */
function dimensionWritePayload(input: SaveUserRatingInput) {
  return {
    look: input.look,
    outfit: input.outfit,
    material: input.material,
    craftsmanship: input.craftsmanship,
    maintenance: input.maintenance,
    comfort: input.comfort,
    collection: input.collection,
    value: input.value,
    resale_potential: input.resalePotential,
    acquisition_ease: input.acquisitionEase,
    private_note: normalizePrivateNote(input.privateNote),
  };
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
    myScore100: Number(row.score),
    myDimensions: pickDimensionScores(dimensionsFromRow(row)),
    ratedAt: row.updated_at,
  };
}

async function fetchUserRatingRow(
  productId: string,
  userId: string,
  client: AppSupabaseClient,
  signal: AbortSignal,
): Promise<MyRating | null> {
  const { data, error } = await client
    .from('user_ratings')
    .select(MY_RATING_SELECT)
    .eq('user_id', userId)
    .eq('product_id', productId)
    .abortSignal(signal)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (data == null) {
    return null;
  }
  return adaptMyRating(data as UserRatingRow);
}

async function updateUserRatingScores(
  input: SaveUserRatingInput,
  client: AppSupabaseClient,
  signal: AbortSignal,
): Promise<MyRating> {
  const { data, error } = await client
    .from('user_ratings')
    .update(dimensionWritePayload(input))
    .eq('user_id', input.userId)
    .eq('product_id', input.productId)
    .select(MY_RATING_SELECT)
    .abortSignal(signal)
    .maybeSingle();

  if (error) {
    throw error;
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
  signal: AbortSignal,
): Promise<MyRating> {
  const scores = dimensionWritePayload(input);
  const { data, error } = await client
    .from('user_ratings')
    .insert({
      user_id: input.userId,
      product_id: input.productId,
      ...scores,
    })
    .select(MY_RATING_SELECT)
    .abortSignal(signal)
    .maybeSingle();

  if (error) {
    throw error;
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
    return await withRequestTimeout(
      (signal) => fetchUserRatingRow(productId, userId, client, signal),
      {
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      },
    );
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
 * Locked Task 17 write path:
 * 1. Read existing owner row
 * 2. UPDATE dimensions + private_note when present
 * 3. INSERT when absent
 * 4. On INSERT 23505, recover with the permitted dimension/private-note UPDATE
 *
 * Never uses PostgREST `.upsert()`. Never writes rating_aggregates or score.
 *
 * Each read/write hop gets its own request deadline so a slow first hop does not
 * consume the entire budget for the write that follows (or 23505 recovery).
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
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const timeoutOptions = {
    signal: options.signal,
    timeoutMs,
  };

  try {
    const existing = await withRequestTimeout(
      (signal) =>
        fetchUserRatingRow(input.productId, input.userId, client, signal),
      timeoutOptions,
    );

    if (existing) {
      return await withRequestTimeout(
        (signal) => updateUserRatingScores(input, client, signal),
        timeoutOptions,
      );
    }

    try {
      return await withRequestTimeout(
        (signal) => insertUserRating(input, client, signal),
        timeoutOptions,
      );
    } catch (insertError) {
      if (isUniqueViolation(insertError)) {
        return await withRequestTimeout(
          (signal) => updateUserRatingScores(input, client, signal),
          timeoutOptions,
        );
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
 * Owner-only rated product list in one query (no N+1).
 * Stable order: most recently updated first, then product_id.
 * Bounded to {@link RATED_PRODUCTS_QUERY_LIMIT} rows for MVP safety — page/cursor
 * pagination is a separate product decision.
 * Does not place private notes on the list view model.
 */
export const RATED_PRODUCTS_QUERY_LIMIT = 200;

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
    return await withRequestTimeout(
      async (signal) => {
        const { data, error } = await client
          .from('user_ratings')
          .select(RATED_PRODUCTS_SELECT)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .order('product_id', { ascending: true })
          .limit(RATED_PRODUCTS_QUERY_LIMIT)
          .abortSignal(signal);

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as RatedProductsDbRow[];
        return rows
          .map(adaptRatedProduct)
          .filter((item): item is RatedProductItem => item != null);
      },
      {
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      },
    );
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
