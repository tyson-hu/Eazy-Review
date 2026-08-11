import type { RatingDimensionScores } from '@/src/features/ratings/dimensions';

export type Product = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  sizeType: string | null;
  releaseDate: string | null;
  description: string | null;
  imageUrl?: string | null;
  /** Eazy Score 0–100. */
  eazyScore?: number | null;
  /** Community Score 0–100. */
  communityScore?: number | null;
  ratingCount?: number;
  lowestPrice?: number | null;
};

export type ProductCardData = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  eazyScore: number | null;
  communityScore: number | null;
  ratingCount: number;
  lowestOffer: LowestVerifiedOffer | null;
};

export type LowestVerifiedOffer = {
  retailer: string;
  amount: number;
  currency: string;
  market: string;
  sizeLabel: string | null;
  checkedAt: string;
};

/** Ten canonical 0–10 dimensions (shared Eazy / Community / My Rating). */
export type RatingBreakdown = RatingDimensionScores & {
  /** Derived 0–100 composite when complete. */
  score100?: number | null;
  /**
   * Connected My Rating uses `privateNote` (DB `private_note`).
   * Legacy mock-era name retained only for historical fixtures/tests.
   */
  comment?: string | null;
  /** Owner-only optional note; max 500 characters. */
  privateNote?: string | null;
};

/** Category averages on the 0–10 scale (community aggregate). */
export type ProductRatingSummary = {
  productId: string;
  ratingCount: number;
  lookAvg: number | null;
  outfitAvg: number | null;
  materialAvg: number | null;
  craftsmanshipAvg: number | null;
  maintenanceAvg: number | null;
  comfortAvg: number | null;
  collectionAvg: number | null;
  valueAvg: number | null;
  resalePotentialAvg: number | null;
  acquisitionEaseAvg: number | null;
  /** Community Score 0–100; maps from DB rating_aggregates.score. */
  communityScore: number | null;
  methodologyVersion?: string | null;
};

export type ProductOffer = {
  id: string;
  productId: string;
  websiteName: string;
  websiteLink: string;
  size: number | null;
  sizeRegion: string;
  currency: string;
  price: number | null;
};

export type VerifiedProductOffer = LowestVerifiedOffer & {
  id: string;
};

/** Ten 0–10 Eazy dimensions when assessment is complete. */
export type EazyAssessmentDimensions = RatingDimensionScores;

export type EazyAssessmentViewModel = {
  /** Eazy Score 0–100. */
  score100: number;
  methodologyVersion: string | null;
  assessedAt: string | null;
  dimensions: EazyAssessmentDimensions | null;
};

/** Public/cacheable Product Detail data; never contains viewer-owned state. */
export type ProductDetailPublicData = {
  product: Product;
  imageUrls: string[];
  eazyAssessment: EazyAssessmentViewModel | null;
  offers: VerifiedProductOffer[];
  ratingSummary: ProductRatingSummary;
};

/** Composed Product Detail payload. My Rating is user-specific, not a catalog Product field. */
export type ProductDetailData = {
  product: Product;
  offers: ProductOffer[];
  ratingSummary: ProductRatingSummary;
  myRating: RatingBreakdown | null;
};
