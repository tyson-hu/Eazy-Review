import { adaptFeedCollections } from '@/src/features/feed/adapters';
import {
    CatalogError,
    normalizeCatalogError,
} from '@/src/features/products/errors';
import {
    DEFAULT_REQUEST_TIMEOUT_MS,
    isRequestTimeoutError,
    withRequestTimeout,
} from '@/src/lib/network/requestTimeout';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import type { FeedCollection } from '@/src/types/product';

const FEED_COLLECTIONS_SELECT = `
  id,
  slug,
  title,
  caption,
  lead_label,
  signal,
  is_ranked,
  feed_position,
  product_collection_items (
    id,
    product_id,
    position
  )
`;

export type FeedCollectionsRequestOptions = {
  client?: AppSupabaseClient;
  signal?: AbortSignal;
  timeoutMs?: number;
  isOnline?: () => boolean;
};

function responseError(error: unknown, status: number): unknown {
  if (error != null && typeof error === 'object') {
    return { ...(error as Record<string, unknown>), status };
  }
  return { status };
}

function isOffline(options: FeedCollectionsRequestOptions): boolean {
  return options.isOnline?.() === false;
}

export async function getFeedCollections(
  options: FeedCollectionsRequestOptions = {},
): Promise<FeedCollection[]> {
  try {
    const client = options.client ?? getSupabase();
    const response = await withRequestTimeout(
      (signal) =>
        client
          .from('product_collections')
          .select(FEED_COLLECTIONS_SELECT)
          .eq('is_published', true)
          .not('feed_position', 'is', null)
          .order('feed_position', { ascending: true })
          .order('id', { ascending: true })
          .order('position', {
            referencedTable: 'product_collection_items',
            ascending: true,
          })
          .order('id', {
            referencedTable: 'product_collection_items',
            ascending: true,
          })
          .abortSignal(signal)
          .retry(false),
      {
        signal: options.signal,
        timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      },
    );

    if (response.error) {
      throw normalizeCatalogError(
        responseError(response.error, response.status),
        { isOffline: isOffline(options) },
      );
    }
    return adaptFeedCollections(response.data);
  } catch (error) {
    if (
      options.signal?.aborted &&
      !isRequestTimeoutError(error) &&
      !(error instanceof CatalogError)
    ) {
      throw error;
    }
    throw normalizeCatalogError(error, { isOffline: isOffline(options) });
  }
}
