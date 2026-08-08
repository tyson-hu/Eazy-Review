import { CatalogError } from '@/src/features/products/errors';
import type {
  EazyAssessmentViewModel,
  Product,
  ProductCardData,
  ProductDetailPublicData,
  ProductRatingSummary,
  VerifiedProductOffer,
} from '@/src/types/product';

type UnknownRecord = Record<string, unknown>;

type NormalizedImage = {
  id: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
};

type ParsedProduct = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  sizeType: string | null;
  releaseDate: string | null;
  description: string | null;
  images: NormalizedImage[];
  assessment: EazyAssessmentViewModel | null;
  offers: VerifiedProductOffer[];
  ratingSummary: ProductRatingSummary;
};

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

function nullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  return string(value, field);
}

function number(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return invalidResponse(field);
  }
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) {
    return null;
  }
  return number(value, field);
}

function integer(value: unknown, field: string): number {
  const parsed = number(value, field);
  if (!Number.isInteger(parsed)) {
    return invalidResponse(field);
  }
  return parsed;
}

function timestamp(value: unknown, field: string): string {
  const parsed = string(value, field);
  if (!Number.isFinite(Date.parse(parsed))) {
    return invalidResponse(field);
  }
  return parsed;
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function parseImages(value: unknown): NormalizedImage[] {
  return array(value, 'product_images')
    .map((entry) => {
      const row = record(entry, 'product_images row');
      return {
        id: string(row.id, 'product_images.id'),
        imageUrl: string(row.image_url, 'product_images.image_url'),
        sortOrder: integer(row.sort_order, 'product_images.sort_order'),
        createdAt: timestamp(row.created_at, 'product_images.created_at'),
      };
    })
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        compareText(a.createdAt, b.createdAt) ||
        compareText(a.id, b.id),
    );
}

function parseAssessment(value: unknown): EazyAssessmentViewModel | null {
  const current = array(value, 'eazy_assessments').filter((entry) => {
    const row = record(entry, 'eazy_assessments row');
    if (typeof row.is_current !== 'boolean') {
      invalidResponse('eazy_assessments.is_current');
    }
    return row.is_current;
  });

  if (current.length === 0) {
    return null;
  }
  if (current.length > 1) {
    return invalidResponse('current eazy_assessments rows');
  }

  const row = record(current[0], 'eazy_assessments row');
  const score = nullableNumber(row.score, 'eazy_assessments.score');
  if (score === null) {
    return null;
  }
  const methodologyVersion = nullableString(
    row.methodology_version,
    'eazy_assessments.methodology_version',
  );
  return {
    score,
    methodologyVersion,
    assessedAt:
      row.created_at === null
        ? null
        : timestamp(row.created_at, 'eazy_assessments.created_at'),
  };
}

function parseCardAssessmentScore(value: unknown): number | null {
  const current = array(value, 'eazy_assessments').filter((entry) => {
    const row = record(entry, 'eazy_assessments row');
    if (typeof row.is_current !== 'boolean') {
      invalidResponse('eazy_assessments.is_current');
    }
    return row.is_current;
  });
  if (current.length === 0) {
    return null;
  }
  if (current.length > 1) {
    return invalidResponse('current eazy_assessments rows');
  }
  return nullableNumber(
    record(current[0], 'eazy_assessments row').score,
    'eazy_assessments.score',
  );
}

function formatSizeLabel(market: string, size: number | null): string | null {
  return size === null ? null : `${market} ${size}`;
}

function parseOffers(value: unknown): VerifiedProductOffer[] {
  const offers = array(value, 'product_offers').flatMap((entry) => {
    const row = record(entry, 'product_offers row');
    const amount = nullableNumber(row.price, 'product_offers.price');
    const checkedAt = nullableString(
      row.last_checked_at,
      'product_offers.last_checked_at',
    );

    // An offer is displayable only when it carries both a price and a real
    // verification timestamp. Missing data stays missing; it never becomes $0.
    if (amount === null || checkedAt === null) {
      return [];
    }
    if (amount < 0) {
      return invalidResponse('product_offers.price');
    }

    const market = string(row.size_region, 'product_offers.size_region');
    const size = nullableNumber(row.size, 'product_offers.size');
    return [
      {
        id: string(row.id, 'product_offers.id'),
        retailer: string(row.website_name, 'product_offers.website_name'),
        amount,
        currency: string(row.currency, 'product_offers.currency'),
        market,
        sizeLabel: formatSizeLabel(market, size),
        checkedAt: timestamp(
          checkedAt,
          'product_offers.last_checked_at',
        ),
      },
    ];
  });

  const currencies = new Set(offers.map((offer) => offer.currency));
  if (currencies.size > 1) {
    return invalidResponse('mixed product_offers currencies');
  }

  return offers.sort(
    (a, b) =>
      a.amount - b.amount ||
      compareText(a.retailer, b.retailer) ||
      compareText(a.sizeLabel ?? '\uffff', b.sizeLabel ?? '\uffff') ||
      compareText(a.checkedAt, b.checkedAt) ||
      compareText(a.id, b.id),
  );
}

function emptyRatingSummary(productId: string): ProductRatingSummary {
  return {
    productId,
    ratingCount: 0,
    lookAvg: null,
    comfortAvg: null,
    qualityAvg: null,
    outfitAvg: null,
    valueAvg: null,
    overallAvg: null,
    communityScore: null,
  };
}

function parseRatingSummary(
  value: unknown,
  productId: string,
): ProductRatingSummary {
  if (value === null) {
    return emptyRatingSummary(productId);
  }
  const row = record(value, 'rating_aggregates');
  const aggregateProductId = string(
    row.product_id,
    'rating_aggregates.product_id',
  );
  if (aggregateProductId !== productId) {
    return invalidResponse('rating_aggregates.product_id');
  }
  const ratingCount = integer(
    row.rating_count,
    'rating_aggregates.rating_count',
  );
  if (ratingCount < 0) {
    return invalidResponse('rating_aggregates.rating_count');
  }
  if (ratingCount === 0) {
    return emptyRatingSummary(productId);
  }
  return {
    productId,
    ratingCount,
    lookAvg: nullableNumber(row.look_avg, 'rating_aggregates.look_avg'),
    comfortAvg: nullableNumber(
      row.comfort_avg,
      'rating_aggregates.comfort_avg',
    ),
    qualityAvg: nullableNumber(
      row.quality_avg,
      'rating_aggregates.quality_avg',
    ),
    outfitAvg: nullableNumber(
      row.outfit_avg,
      'rating_aggregates.outfit_avg',
    ),
    valueAvg: nullableNumber(row.value_avg, 'rating_aggregates.value_avg'),
    overallAvg: nullableNumber(
      row.overall_avg,
      'rating_aggregates.overall_avg',
    ),
    communityScore: nullableNumber(
      row.score,
      'rating_aggregates.score',
    ),
  };
}

function parseCardRatingSummary(
  value: unknown,
  productId: string,
): Pick<ProductRatingSummary, 'ratingCount' | 'communityScore'> {
  if (value === null) {
    return { ratingCount: 0, communityScore: null };
  }
  const row = record(value, 'rating_aggregates');
  if (string(row.product_id, 'rating_aggregates.product_id') !== productId) {
    return invalidResponse('rating_aggregates.product_id');
  }
  const ratingCount = integer(
    row.rating_count,
    'rating_aggregates.rating_count',
  );
  if (ratingCount < 0) {
    return invalidResponse('rating_aggregates.rating_count');
  }
  return {
    ratingCount,
    communityScore:
      ratingCount === 0
        ? null
        : nullableNumber(row.score, 'rating_aggregates.score'),
  };
}

function parseProduct(value: unknown): ParsedProduct {
  const row = record(value, 'product row');
  const id = string(row.id, 'products.id');
  return {
    id,
    brand: string(row.brand, 'products.brand'),
    name: string(row.name, 'products.name'),
    sku: nullableString(row.sku, 'products.sku'),
    sizeType: nullableString(row.size_type, 'products.size_type'),
    releaseDate: nullableString(row.release_date, 'products.release_date'),
    description: nullableString(row.description, 'products.description'),
    images: parseImages(row.product_images),
    assessment: parseAssessment(row.eazy_assessments),
    offers: parseOffers(row.product_offers),
    ratingSummary: parseRatingSummary(row.rating_aggregates, id),
  };
}

export function adaptProductCards(value: unknown): ProductCardData[] {
  return array(value, 'products')
    .map((entry) => {
      const row = record(entry, 'product row');
      const id = string(row.id, 'products.id');
      const images = parseImages(row.product_images);
      const offers = parseOffers(row.product_offers);
      const ratingSummary = parseCardRatingSummary(
        row.rating_aggregates,
        id,
      );
      return {
        createdAt: timestamp(row.created_at, 'products.created_at'),
        card: {
          id,
          brand: string(row.brand, 'products.brand'),
          name: string(row.name, 'products.name'),
          sku: nullableString(row.sku, 'products.sku'),
          imageUrl: images[0]?.imageUrl ?? null,
          eazyScore: parseCardAssessmentScore(row.eazy_assessments),
          communityScore: ratingSummary.communityScore,
          ratingCount: ratingSummary.ratingCount,
          lowestOffer: offers[0]
            ? {
                retailer: offers[0].retailer,
                amount: offers[0].amount,
                currency: offers[0].currency,
                market: offers[0].market,
                sizeLabel: offers[0].sizeLabel,
                checkedAt: offers[0].checkedAt,
              }
            : null,
        } satisfies ProductCardData,
      };
    })
    .sort(
      (a, b) =>
        compareText(a.createdAt, b.createdAt) ||
        compareText(a.card.id, b.card.id),
    )
    .map(({ card }) => card);
}

export function adaptProductDetail(value: unknown): ProductDetailPublicData {
  const parsed = parseProduct(value);
  const product: Product = {
    id: parsed.id,
    brand: parsed.brand,
    name: parsed.name,
    sku: parsed.sku,
    sizeType: parsed.sizeType,
    releaseDate: parsed.releaseDate,
    description: parsed.description,
    imageUrl: parsed.images[0]?.imageUrl ?? null,
    eazyScore: parsed.assessment?.score ?? null,
    communityScore: parsed.ratingSummary.communityScore,
    ratingCount: parsed.ratingSummary.ratingCount,
    lowestPrice: parsed.offers[0]?.amount ?? null,
  };

  return {
    product,
    imageUrls: parsed.images.map((image) => image.imageUrl),
    eazyAssessment: parsed.assessment,
    offers: parsed.offers,
    ratingSummary: parsed.ratingSummary,
  };
}
