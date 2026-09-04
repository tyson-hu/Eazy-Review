import { CatalogError } from '@/src/features/products/errors';
import type { FeedCollection } from '@/src/types/product';

type UnknownRecord = Record<string, unknown>;

function invalidResponse(field: string): never {
  throw new CatalogError(
    'invalid-response',
    `The catalog response has an invalid ${field}.`,
  );
}

function record(value: unknown, field: string): UnknownRecord {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return invalidResponse(field);
  }
  return value as UnknownRecord;
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    return invalidResponse(field);
  }
  return value;
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return invalidResponse(field);
  }
  return value;
}

function integer(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return invalidResponse(field);
  }
  return value;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    return invalidResponse(field);
  }
  return value;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseSignal(value: unknown): FeedCollection['signal'] {
  const parsed = string(value, 'product_collections.signal');
  if (parsed !== 'eazy' && parsed !== 'community') {
    return invalidResponse('product_collections.signal');
  }
  return parsed;
}

function parseItemIds(value: unknown): string[] {
  return array(value, 'product_collection_items')
    .map((entry) => {
      const row = record(entry, 'product_collection_items row');
      return {
        productId: string(row.product_id, 'product_collection_items.product_id'),
        position: integer(row.position, 'product_collection_items.position'),
        id: string(row.id, 'product_collection_items.id'),
      };
    })
    .sort(
      (a, b) => a.position - b.position || compareText(a.id, b.id),
    )
    .map((item) => item.productId);
}

export function adaptFeedCollections(value: unknown): FeedCollection[] {
  return array(value, 'product_collections')
    .map((entry) => {
      const row = record(entry, 'product_collections row');
      return {
        id: string(row.id, 'product_collections.id'),
        slug: string(row.slug, 'product_collections.slug'),
        title: string(row.title, 'product_collections.title'),
        caption: string(row.caption, 'product_collections.caption'),
        leadLabel: string(row.lead_label, 'product_collections.lead_label'),
        signal: parseSignal(row.signal),
        isRanked: boolean(row.is_ranked, 'product_collections.is_ranked'),
        feedPosition: integer(
          row.feed_position,
          'product_collections.feed_position',
        ),
        productIds: parseItemIds(row.product_collection_items),
      };
    })
    .sort(
      (a, b) =>
        a.feedPosition - b.feedPosition || compareText(a.id, b.id),
    );
}
