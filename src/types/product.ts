export type Product = {
  id: string;
  brand: string;
  name: string;
  sku: string | null;
  sizeType: string | null;
  releaseDate: string | null;
  description: string | null;
  imageUrl?: string | null;
  eazyScore?: number | null;
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

export type RatingBreakdown = {
  look: number;
  comfort: number;
  quality: number;
  outfit: number;
  value: number;
  overall: number;
  /**
   * Connected My Rating uses `privateNote` (DB `private_note`).
   * Legacy mock-era name retained only for historical fixtures/tests.
   */
  comment?: string | null;
  /** Owner-only optional note; max 500 characters. */
  privateNote?: string | null;
};

export type ProductRatingSummary = {
  productId: string;
  ratingCount: number;
  lookAvg: number | null;
  comfortAvg: number | null;
  qualityAvg: number | null;
  outfitAvg: number | null;
  valueAvg: number | null;
  overallAvg: number | null;
  /** Community aggregate; maps from DB rating_aggregates.score. */
  communityScore: number | null;
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

export type EazyAssessmentViewModel = {
  score: number;
  methodologyVersion: string | null;
  assessedAt: string | null;
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
