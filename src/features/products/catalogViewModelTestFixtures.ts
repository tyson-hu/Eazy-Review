import {
  COMPLETE_PRODUCT_ID,
  SPARSE_PRODUCT_ID,
} from '@/src/features/products/catalogTestFixtures';
import type {
  ProductCardData,
  ProductDetailPublicData,
  ProductRatingSummary,
} from '@/src/types/product';

function emptySummary(productId: string): ProductRatingSummary {
  return {
    productId,
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
    methodologyVersion: null,
  };
}

export const completeProductCard: ProductCardData = {
  id: COMPLETE_PRODUCT_ID,
  brand: 'Nike',
  name: 'Nike Air Force 1 Low White',
  sku: 'CW2288-111',
  imageUrl:
    'https://raw.githubusercontent.com/tyson-hu/Eazy-Review/test/air-force.png',
  eazyScore: 79,
  communityScore: null,
  ratingCount: 0,
  lowestOffer: {
    retailer: "DICK'S Sporting Goods",
    amount: 114.99,
    currency: 'USD',
    market: 'US',
    sizeLabel: 'US 10',
    checkedAt: '2026-08-03T16:17:14.000Z',
  },
};

export const sparseProductCard: ProductCardData = {
  id: SPARSE_PRODUCT_ID,
  brand: 'Adidas',
  name: 'Adidas Samba OG Cloud White Core Black',
  sku: 'B75806',
  imageUrl: null,
  eazyScore: null,
  communityScore: null,
  ratingCount: 0,
  lowestOffer: null,
};

export const completeProductDetail: ProductDetailPublicData = {
  product: {
    id: COMPLETE_PRODUCT_ID,
    brand: 'Nike',
    name: 'Nike Air Force 1 Low White',
    sku: 'CW2288-111',
    sizeType: 'men',
    releaseDate: '2020-07-15',
    description: 'The all-white staple Air Force 1 Low.',
    imageUrl:
      'https://raw.githubusercontent.com/tyson-hu/Eazy-Review/test/air-force-primary.png',
    eazyScore: 79,
    communityScore: null,
    ratingCount: 0,
    lowestPrice: 114.99,
  },
  imageUrls: [
    'https://raw.githubusercontent.com/tyson-hu/Eazy-Review/test/air-force-primary.png',
    'https://raw.githubusercontent.com/tyson-hu/Eazy-Review/test/air-force-secondary.png',
  ],
  eazyAssessment: {
    score100: 79,
    methodologyVersion: 'sneaker-10-v1',
    assessedAt: '2026-08-03T16:17:14.000Z',
    dimensions: {
      look: 8,
      outfit: 8,
      material: 8,
      craftsmanship: 8,
      maintenance: 7,
      comfort: 8,
      collection: 8,
      value: 8,
      resalePotential: 8,
      acquisitionEase: 8,
    },
  },
  offers: [
    {
      id: 'offer-dicks',
      retailer: "DICK'S Sporting Goods",
      amount: 114.99,
      currency: 'USD',
      market: 'US',
      sizeLabel: 'US 10',
      checkedAt: '2026-08-03T16:17:14.000Z',
    },
    {
      id: 'offer-finish-line',
      retailer: 'Finish Line',
      amount: 115,
      currency: 'USD',
      market: 'US',
      sizeLabel: 'US 10',
      checkedAt: '2026-08-03T16:17:14.000Z',
    },
  ],
  ratingSummary: emptySummary(COMPLETE_PRODUCT_ID),
};

export const sparseProductDetail: ProductDetailPublicData = {
  product: {
    id: SPARSE_PRODUCT_ID,
    brand: 'Adidas',
    name: 'Adidas Samba OG Cloud White Core Black',
    sku: 'B75806',
    sizeType: 'unisex',
    releaseDate: null,
    description: null,
    imageUrl: null,
    eazyScore: null,
    communityScore: null,
    ratingCount: 0,
    lowestPrice: null,
  },
  imageUrls: [],
  eazyAssessment: null,
  offers: [],
  ratingSummary: emptySummary(SPARSE_PRODUCT_ID),
};
