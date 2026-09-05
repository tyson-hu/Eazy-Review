import type { ProductCardData } from '@/src/types/product';

export const FEED_SECTION_CAP = 5;
export const RANKED_SECTION_MIN = 2;

export const AUTO_FEED_POSITIONS = {
  newlyAdded: 100,
  bestEazyScores: 200,
  mostRated: 300,
} as const;

/** Which composite score the section's rows foreground on the right. */
export type FeedSectionSignal = 'eazy' | 'community';

export type FeedSectionKind = 'auto' | 'curated';

export type FeedSection = {
  id: string;
  kind: FeedSectionKind;
  position: number;
  title: string;
  /** One-line, truthful explanation of how the section is ordered. */
  caption: string;
  /** Eyebrow for the section's lead product when it renders as the spotlight. */
  leadLabel: string;
  /** Score shown on every row; Most Rated foregrounds Community Score. */
  signal: FeedSectionSignal;
  /** Ranked sections number their rows; recency and editorial lists do not. */
  ranked: boolean;
  products: ProductCardData[];
};

export function curatedSectionId(slug: string): string {
  return `collection:${slug}`;
}
