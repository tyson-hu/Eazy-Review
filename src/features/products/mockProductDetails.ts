import { mockProducts } from '@/src/features/products/mockProducts';
import type {
  ProductDetailData,
  ProductOffer,
  ProductRatingSummary,
  RatingBreakdown,
} from '@/src/types/product';

const mockOffersByProductId: Record<string, ProductOffer[]> = {
  '1': [
    {
      id: 'offer-1-a',
      productId: '1',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/e53ccfe7-1cd7-494c-b',
      size: 3.5,
      sizeRegion: 'US',
      currency: 'USD',
      price: 248,
    },
    {
      id: 'offer-1-b',
      productId: '1',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/e53ccfe7-1cd7-494c-b',
      size: 4,
      sizeRegion: 'US',
      currency: 'USD',
      price: 120,
    },
  ],
  '2': [
    {
      id: 'offer-2-a',
      productId: '2',
      websiteName: 'GOAT',
      websiteLink: 'https://www.goat.com/sneakers/dunk-low-retro-white-black',
      size: 10,
      sizeRegion: 'US',
      currency: 'USD',
      price: 115,
    },
  ],
  '3': [
    {
      id: 'offer-3-a',
      productId: '3',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/new-balance-990v6-grey',
      size: 10.5,
      sizeRegion: 'US',
      currency: 'USD',
      price: 199,
    },
  ],
  '4': [
    {
      id: 'offer-4-a',
      productId: '4',
      websiteName: 'GOAT',
      websiteLink: 'https://www.goat.com/sneakers/gel-kayano-14-white-midnight',
      size: 9,
      sizeRegion: 'US',
      currency: 'USD',
      price: 150,
    },
  ],
  // Empty offers — Detail uses catalog `lowestPrice` fallback when present.
  '5': [],
  '6': [
    {
      id: 'offer-6-a',
      productId: '6',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/salomon-xt-6-black-phantom',
      size: 10,
      sizeRegion: 'US',
      currency: 'USD',
      price: 200,
    },
  ],
  // Offers present but no usable prices — same catalog-fallback path as empty offers.
  '7': [
    {
      id: 'offer-7-a',
      productId: '7',
      websiteName: 'GOAT',
      websiteLink: 'https://www.goat.com/sneakers/samba-og-cloud-white-core-black',
      size: 8.5,
      sizeRegion: 'US',
      currency: 'USD',
      price: null,
    },
  ],
  '8': [
    {
      id: 'offer-8-a',
      productId: '8',
      websiteName: 'StockX',
      websiteLink: 'https://stockx.com/vans-old-skool-black-white',
      size: 9,
      sizeRegion: 'US',
      currency: 'USD',
      price: 70,
    },
  ],
};

/** Aligns with catalog communityScore / ratingCount; edge cases for ids 6 and 8. */
const mockRatingSummariesByProductId: Record<string, ProductRatingSummary> = {
  '1': {
    productId: '1',
    ratingCount: 24,
    lookAvg: 7.8,
    comfortAvg: 7.5,
    qualityAvg: 8.0,
    outfitAvg: 7.6,
    valueAvg: 7.4,
    overallAvg: 7.8,
    communityScore: 78,
  },
  '2': {
    productId: '2',
    ratingCount: 142,
    lookAvg: 8.2,
    comfortAvg: 7.9,
    qualityAvg: 8.1,
    outfitAvg: 8.0,
    valueAvg: 7.8,
    overallAvg: 8.1,
    communityScore: 81,
  },
  '3': {
    productId: '3',
    ratingCount: 97,
    lookAvg: 8.5,
    comfortAvg: 8.8,
    qualityAvg: 8.7,
    outfitAvg: 8.2,
    valueAvg: 8.0,
    overallAvg: 8.6,
    communityScore: 86,
  },
  '4': {
    productId: '4',
    ratingCount: 61,
    lookAvg: 8.4,
    comfortAvg: 8.6,
    qualityAvg: 8.3,
    outfitAvg: 8.1,
    valueAvg: 8.0,
    overallAvg: 8.4,
    communityScore: 84,
  },
  '5': {
    productId: '5',
    ratingCount: 305,
    lookAvg: 7.5,
    comfortAvg: 7.2,
    qualityAvg: 7.8,
    outfitAvg: 7.4,
    valueAvg: 7.6,
    overallAvg: 7.4,
    communityScore: 74,
  },
  // Zero ratings / null Community Score (catalog id 6).
  '6': {
    productId: '6',
    ratingCount: 0,
    lookAvg: null,
    comfortAvg: null,
    qualityAvg: null,
    outfitAvg: null,
    valueAvg: null,
    overallAvg: null,
    communityScore: null,
  },
  '7': {
    productId: '7',
    ratingCount: 218,
    lookAvg: 8.3,
    comfortAvg: 8.0,
    qualityAvg: 8.2,
    outfitAvg: 8.5,
    valueAvg: 8.4,
    overallAvg: 8.3,
    communityScore: 83,
  },
  // Null Eazy Score on catalog product; community summary still present (catalog id 8).
  '8': {
    productId: '8',
    ratingCount: 88,
    lookAvg: 7.2,
    comfortAvg: 7.0,
    qualityAvg: 7.4,
    outfitAvg: 7.3,
    valueAvg: 7.5,
    overallAvg: 7.2,
    communityScore: 72,
  },
};

/** User-specific My Rating fixtures. Null means the mock viewer has not rated. */
const mockMyRatingsByProductId: Record<string, RatingBreakdown | null> = {
  '1': {
    look: 8,
    comfort: 7,
    quality: 8,
    outfit: 7,
    value: 7,
    overall: 8,
    comment: 'Great kids colorway; Gore-Tex is a plus.',
  },
  '2': null,
  '3': {
    look: 9,
    comfort: 9,
    quality: 9,
    outfit: 8,
    value: 7,
    overall: 9,
    comment: null,
  },
  '4': null,
  '5': null,
  '6': null,
  '7': {
    look: 8,
    comfort: 7,
    quality: 8,
    outfit: 9,
    value: 9,
    overall: 8,
    comment: 'Everyday classic.',
  },
  '8': null,
};

/**
 * Lookup-ready Product Detail fixture for a catalog product id.
 * Catalog identity/metadata come from `mockProducts`; offers, rating summary,
 * and My Rating live here so catalog Product records stay card/list-shaped.
 */
export function getMockProductDetailById(
  productId: string,
): ProductDetailData | null {
  const product = mockProducts.find((entry) => entry.id === productId);
  if (!product) {
    return null;
  }

  const ratingSummary = mockRatingSummariesByProductId[productId];
  if (!ratingSummary) {
    return null;
  }

  return {
    product,
    offers: mockOffersByProductId[productId] ?? [],
    ratingSummary,
    myRating: mockMyRatingsByProductId[productId] ?? null,
  };
}

/**
 * Session-only mock write for My Rating. Mutates the private fixture map;
 * does not touch community score / rating summary fixtures or persist across reload.
 * Returns false when the product/detail fixture does not exist (same rules as get).
 */
export function saveMockMyRating(
  productId: string,
  rating: RatingBreakdown,
): boolean {
  const product = mockProducts.find((entry) => entry.id === productId);
  if (!product) {
    return false;
  }

  if (!mockRatingSummariesByProductId[productId]) {
    return false;
  }

  const trimmedComment =
    rating.comment == null || String(rating.comment).trim() === ''
      ? null
      : String(rating.comment).trim();

  mockMyRatingsByProductId[productId] = {
    look: rating.look,
    comfort: rating.comfort,
    quality: rating.quality,
    outfit: rating.outfit,
    value: rating.value,
    overall: rating.overall,
    comment: trimmedComment,
  };

  return true;
}
