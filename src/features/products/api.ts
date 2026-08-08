import { adaptProductCards, adaptProductDetail } from '@/src/features/products/adapters';
import { CatalogError, normalizeCatalogError } from '@/src/features/products/errors';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import type {
  ProductCardData,
  ProductDetailPublicData,
} from '@/src/types/product';

const DEFAULT_CATALOG_TIMEOUT_MS = 10_000;

const BROWSE_SELECT = `
  id,
  brand,
  name,
  sku,
  created_at,
  product_images (
    id,
    image_url,
    sort_order,
    created_at
  ),
  eazy_assessments (
    score,
    is_current
  ),
  rating_aggregates (
    product_id,
    rating_count,
    score
  ),
  product_offers (
    id,
    website_name,
    size,
    size_region,
    currency,
    price,
    last_checked_at
  )
`;

const PRODUCT_DETAIL_SELECT = `
  id,
  brand,
  name,
  sku,
  size_type,
  release_date,
  description,
  product_images (
    id,
    image_url,
    sort_order,
    created_at
  ),
  eazy_assessments (
    score,
    methodology_version,
    created_at,
    is_current
  ),
  rating_aggregates (
    product_id,
    rating_count,
    look_avg,
    comfort_avg,
    quality_avg,
    outfit_avg,
    value_avg,
    overall_avg,
    score
  ),
  product_offers (
    id,
    website_name,
    size,
    size_region,
    currency,
    price,
    last_checked_at
  )
`;

export type CatalogRequestOptions = {
  client?: AppSupabaseClient;
  signal?: AbortSignal;
  timeoutMs?: number;
  isOnline?: () => boolean;
};

function abortError(): Error {
  const error = new Error('Catalog request aborted.');
  error.name = 'AbortError';
  return error;
}

function timeoutError(cause?: unknown): CatalogError {
  return new CatalogError('timeout', 'The catalog request timed out.', {
    source: 'transport',
    cause,
  });
}

async function runCatalogRequest<T>(
  build: (signal: AbortSignal) => PromiseLike<T>,
  options: CatalogRequestOptions,
): Promise<T> {
  const controller = new AbortController();
  let didTimeout = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbort: (() => void) | undefined;

  const timeoutMs = options.timeoutMs ?? DEFAULT_CATALOG_TIMEOUT_MS;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      reject(timeoutError());
    }, timeoutMs);
  });

  const externalAbortPromise = new Promise<never>((_, reject) => {
    const signal = options.signal;
    if (!signal) {
      return;
    }
    const onAbort = () => {
      controller.abort();
      reject(abortError());
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    removeExternalAbort = () => signal.removeEventListener('abort', onAbort);
  });

  try {
    return await Promise.race([
      Promise.resolve(build(controller.signal)),
      timeoutPromise,
      externalAbortPromise,
    ]);
  } catch (error) {
    // An abort-aware transport can reject before the timer's own rejection
    // reaches Promise.race. Once the deadline fired, the domain result is
    // always a timeout regardless of which rejected promise won the race.
    if (
      didTimeout &&
      !(error instanceof CatalogError && error.code === 'timeout')
    ) {
      throw timeoutError(error);
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    removeExternalAbort?.();
  }
}

function responseError(error: unknown, status: number): unknown {
  if (error != null && typeof error === 'object') {
    return { ...(error as Record<string, unknown>), status };
  }
  return { status };
}

function isOffline(options: CatalogRequestOptions): boolean {
  return options.isOnline?.() === false;
}

export async function getProducts(
  options: CatalogRequestOptions = {},
): Promise<ProductCardData[]> {
  try {
    const client = options.client ?? getSupabase();
    const response = await runCatalogRequest(
      (signal) =>
        client
          .from('products')
          .select(BROWSE_SELECT)
          .eq('is_published', true)
          .eq('eazy_assessments.is_current', true)
          .not('product_offers.price', 'is', null)
          .not('product_offers.last_checked_at', 'is', null)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .order('sort_order', {
            referencedTable: 'product_images',
            ascending: true,
          })
          .order('created_at', {
            referencedTable: 'product_images',
            ascending: true,
          })
          .order('id', {
            referencedTable: 'product_images',
            ascending: true,
          })
          .limit(1, { referencedTable: 'product_images' })
          .order('price', {
            referencedTable: 'product_offers',
            ascending: true,
            nullsFirst: false,
          })
          .order('website_name', {
            referencedTable: 'product_offers',
            ascending: true,
          })
          .abortSignal(signal)
          .retry(false),
      options,
    );

    if (response.error) {
      throw normalizeCatalogError(
        responseError(response.error, response.status),
        { isOffline: isOffline(options) },
      );
    }
    return adaptProductCards(response.data);
  } catch (error) {
    if (options.signal?.aborted && !(error instanceof CatalogError)) {
      throw error;
    }
    throw normalizeCatalogError(error, { isOffline: isOffline(options) });
  }
}

export async function getProductById(
  productId: string,
  options: CatalogRequestOptions = {},
): Promise<ProductDetailPublicData> {
  try {
    const client = options.client ?? getSupabase();
    const response = await runCatalogRequest(
      (signal) =>
        client
          .from('products')
          .select(PRODUCT_DETAIL_SELECT)
          .eq('is_published', true)
          .eq('id', productId)
          .eq('eazy_assessments.is_current', true)
          .not('product_offers.price', 'is', null)
          .not('product_offers.last_checked_at', 'is', null)
          .order('sort_order', {
            referencedTable: 'product_images',
            ascending: true,
          })
          .order('created_at', {
            referencedTable: 'product_images',
            ascending: true,
          })
          .order('id', {
            referencedTable: 'product_images',
            ascending: true,
          })
          .order('price', {
            referencedTable: 'product_offers',
            ascending: true,
            nullsFirst: false,
          })
          .order('website_name', {
            referencedTable: 'product_offers',
            ascending: true,
          })
          .abortSignal(signal)
          .maybeSingle()
          .retry(false),
      options,
    );

    if (response.error) {
      throw normalizeCatalogError(
        responseError(response.error, response.status),
        { isOffline: isOffline(options) },
      );
    }
    if (response.data === null) {
      throw new CatalogError('not-found', 'Product not found.');
    }
    return adaptProductDetail(response.data);
  } catch (error) {
    if (options.signal?.aborted && !(error instanceof CatalogError)) {
      throw error;
    }
    throw normalizeCatalogError(error, { isOffline: isOffline(options) });
  }
}
