import { mockProducts } from '@/src/features/products/mockProducts';
import type {
  ProductDetailData,
  ProductOffer,
  ProductRatingSummary,
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
    outfitAvg: 7.6,
    materialAvg: 8.0,
    craftsmanshipAvg: 8.0,
    maintenanceAvg: 7.5,
    comfortAvg: 7.5,
    collectionAvg: 7.7,
    valueAvg: 7.4,
    resalePotentialAvg: 7.8,
    acquisitionEaseAvg: 7.6,
    communityScore: 78,
  },
  '2': {
    productId: '2',
    ratingCount: 142,
    lookAvg: 8.2,
    outfitAvg: 8.0,
    materialAvg: 8.1,
    craftsmanshipAvg: 8.1,
    maintenanceAvg: 7.9,
    comfortAvg: 7.9,
    collectionAvg: 8.0,
    valueAvg: 7.8,
    resalePotentialAvg: 8.1,
    acquisitionEaseAvg: 7.9,
    communityScore: 81,
  },
  '3': {
    productId: '3',
    ratingCount: 97,
    lookAvg: 8.5,
    outfitAvg: 8.2,
    materialAvg: 8.6,
    craftsmanshipAvg: 8.7,
    maintenanceAvg: 8.4,
    comfortAvg: 8.8,
    collectionAvg: 8.3,
    valueAvg: 8.0,
    resalePotentialAvg: 8.6,
    acquisitionEaseAvg: 8.1,
    communityScore: 86,
  },
  '4': {
    productId: '4',
    ratingCount: 61,
    lookAvg: 8.4,
    outfitAvg: 8.1,
    materialAvg: 8.3,
    craftsmanshipAvg: 8.3,
    maintenanceAvg: 8.2,
    comfortAvg: 8.6,
    collectionAvg: 8.2,
    valueAvg: 8.0,
    resalePotentialAvg: 8.4,
    acquisitionEaseAvg: 8.0,
    communityScore: 84,
  },
  '5': {
    productId: '5',
    ratingCount: 305,
    lookAvg: 7.5,
    outfitAvg: 7.4,
    materialAvg: 7.6,
    craftsmanshipAvg: 7.8,
    maintenanceAvg: 7.3,
    comfortAvg: 7.2,
    collectionAvg: 7.5,
    valueAvg: 7.6,
    resalePotentialAvg: 7.4,
    acquisitionEaseAvg: 7.5,
    communityScore: 74,
  },
  '6': {
    productId: '6',
    ratingCount: 0,
    lookAvg: null,
    outfitAvg: null,
    materialAvg: null,
    craftsmanshipAvg: null,
    maintenanceAvg: null,
    comfortAvg: null,
    collectionAvg: null,
    valueAvg: null,
    resalePotentialAvg: null,
    acquisitionEaseAvg: null,
    communityScore: null,
  },
  '7': {
    productId: '7',
    ratingCount: 218,
    lookAvg: 8.3,
    outfitAvg: 8.5,
    materialAvg: 8.2,
    craftsmanshipAvg: 8.2,
    maintenanceAvg: 8.1,
    comfortAvg: 8.0,
    collectionAvg: 8.4,
    valueAvg: 8.4,
    resalePotentialAvg: 8.3,
    acquisitionEaseAvg: 8.2,
    communityScore: 83,
  },
  '8': {
    productId: '8',
    ratingCount: 88,
    lookAvg: 7.2,
    outfitAvg: 7.3,
    materialAvg: 7.4,
    craftsmanshipAvg: 7.4,
    maintenanceAvg: 7.1,
    comfortAvg: 7.0,
    collectionAvg: 7.3,
    valueAvg: 7.5,
    resalePotentialAvg: 7.2,
    acquisitionEaseAvg: 7.4,
    communityScore: 72,
  },
};


/**
 * Lookup-ready Product Detail fixture for a catalog product id.
 * Catalog identity/metadata come from `mockProducts`; offers and rating summary
 * live here so catalog Product records stay card/list-shaped.
 * Task 15 removed the product-ID-only mock My Rating map and session write API;
 * `myRating` is always null here until Tasks 16–17 own real persistence.
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
    myRating: null,
  };
}
