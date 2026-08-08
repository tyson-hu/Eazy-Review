import {
  COMPLETE_PRODUCT_ID,
  SPARSE_PRODUCT_ID,
} from '@/src/features/products/catalogTestFixtures';
import type {
  ProductCardData,
  ProductDetailPublicData,
} from '@/src/types/product';

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
    score: 79,
    methodologyVersion: 'task13-seed-v1',
    assessedAt: '2026-08-03T16:17:14.000Z',
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
  ratingSummary: {
    productId: COMPLETE_PRODUCT_ID,
    ratingCount: 0,
    lookAvg: null,
    comfortAvg: null,
    qualityAvg: null,
    outfitAvg: null,
    valueAvg: null,
    overallAvg: null,
    communityScore: null,
  },
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
  ratingSummary: {
    productId: SPARSE_PRODUCT_ID,
    ratingCount: 0,
    lookAvg: null,
    comfortAvg: null,
    qualityAvg: null,
    outfitAvg: null,
    valueAvg: null,
    overallAvg: null,
    communityScore: null,
  },
};
