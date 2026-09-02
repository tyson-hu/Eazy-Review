import { adaptProductCards, adaptProductDetail } from '@/src/features/products/adapters';
import { CatalogError, normalizeCatalogError } from '@/src/features/products/errors';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  isRequestTimeoutError,
  withRequestTimeout,
} from '@/src/lib/network/requestTimeout';
import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import type {
  ProductCardData,
  ProductDetailPublicData,
} from '@/src/types/product';

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
    is_current,
    look,
    outfit,
    material,
    craftsmanship,
    maintenance,
    comfort,
    collection,
    value,
    resale_potential,
    acquisition_ease
  ),
  rating_aggregates (
    product_id,
    rating_count,
    look_avg,
    outfit_avg,
    material_avg,
    craftsmanship_avg,
    maintenance_avg,
    comfort_avg,
    collection_avg,
    value_avg,
    resale_potential_avg,
    acquisition_ease_avg,
    score,
    methodology_version
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
    const response = await withRequestTimeout(
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
    return adaptProductCards(response.data);
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

export async function getProductById(
  productId: string,
  options: CatalogRequestOptions = {},
): Promise<ProductDetailPublicData> {
  try {
    const client = options.client ?? getSupabase();
    const response = await withRequestTimeout(
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
    if (response.data === null) {
      throw new CatalogError('not-found', 'Product not found.');
    }
    return adaptProductDetail(response.data);
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
