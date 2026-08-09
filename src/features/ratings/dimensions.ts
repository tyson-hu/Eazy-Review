/**
 * Canonical sneaker rating rubric (methodology sneaker-10-v1).
 * Shared by Eazy Score, Community Score, and My Rating.
 */

export const RATING_METHODOLOGY_VERSION = 'sneaker-10-v1' as const;

export type RatingMethodologyVersion = typeof RATING_METHODOLOGY_VERSION;

/** Database / TypeScript snake→camel for resale and acquisition. */
export type RatingDimensionKey =
  | 'look'
  | 'outfit'
  | 'material'
  | 'craftsmanship'
  | 'maintenance'
  | 'comfort'
  | 'collection'
  | 'value'
  | 'resalePotential'
  | 'acquisitionEase';

export type RatingDimensionDbColumn =
  | 'look'
  | 'outfit'
  | 'material'
  | 'craftsmanship'
  | 'maintenance'
  | 'comfort'
  | 'collection'
  | 'value'
  | 'resale_potential'
  | 'acquisition_ease';

export type RatingDimensionGroupId =
  | 'style'
  | 'buildAndWear'
  | 'marketAndOwnership';

export type RatingDimensionDefinition = {
  key: RatingDimensionKey;
  dbColumn: RatingDimensionDbColumn;
  label: string;
  description: string;
  groupId: RatingDimensionGroupId;
  groupLabel: string;
};

/**
 * Ordered ten-dimension configuration. Do not reorder without a new methodology
 * version — order participates in equal-weight composite derivation display.
 */
export const RATING_DIMENSIONS: readonly RatingDimensionDefinition[] = [
  {
    key: 'look',
    dbColumn: 'look',
    label: 'Appearance',
    description: 'Silhouette, proportions, and overall visual appeal.',
    groupId: 'style',
    groupLabel: 'Style',
  },
  {
    key: 'outfit',
    dbColumn: 'outfit',
    label: 'Styling',
    description: 'How easily the product works into real outfits.',
    groupId: 'style',
    groupLabel: 'Style',
  },
  {
    key: 'material',
    dbColumn: 'material',
    label: 'Materials',
    description: 'Feel and perceived quality of materials used.',
    groupId: 'buildAndWear',
    groupLabel: 'Build and Wear',
  },
  {
    key: 'craftsmanship',
    dbColumn: 'craftsmanship',
    label: 'Craftsmanship',
    description: 'Construction precision, finishing, and durability of build.',
    groupId: 'buildAndWear',
    groupLabel: 'Build and Wear',
  },
  {
    key: 'maintenance',
    dbColumn: 'maintenance',
    label: 'Care',
    description: 'How easy the product is to maintain (10 = easy to maintain).',
    groupId: 'buildAndWear',
    groupLabel: 'Build and Wear',
  },
  {
    key: 'comfort',
    dbColumn: 'comfort',
    label: 'Comfort',
    description: 'On-foot comfort and all-day wearability.',
    groupId: 'buildAndWear',
    groupLabel: 'Build and Wear',
  },
  {
    key: 'collection',
    dbColumn: 'collection',
    label: 'Collectibility',
    description: 'Appeal as a collectible or collection piece.',
    groupId: 'marketAndOwnership',
    groupLabel: 'Market and Ownership',
  },
  {
    key: 'value',
    dbColumn: 'value',
    label: 'Product Value',
    description:
      'Value relative to execution, price, and concept (10 = strong value).',
    groupId: 'marketAndOwnership',
    groupLabel: 'Market and Ownership',
  },
  {
    key: 'resalePotential',
    dbColumn: 'resale_potential',
    label: 'Resale Potential',
    description: 'Retention and upside on resale (10 = strong retention/upside).',
    groupId: 'marketAndOwnership',
    groupLabel: 'Market and Ownership',
  },
  {
    key: 'acquisitionEase',
    dbColumn: 'acquisition_ease',
    label: 'Acquisition Ease',
    description: 'How easy or reasonable it is to obtain (10 = easy to obtain).',
    groupId: 'marketAndOwnership',
    groupLabel: 'Market and Ownership',
  },
] as const;

export const RATING_DIMENSION_KEYS = RATING_DIMENSIONS.map((d) => d.key);

export const RATING_DIMENSION_GROUPS: readonly {
  id: RatingDimensionGroupId;
  label: string;
  keys: readonly RatingDimensionKey[];
}[] = [
  {
    id: 'style',
    label: 'Style',
    keys: ['look', 'outfit'],
  },
  {
    id: 'buildAndWear',
    label: 'Build and Wear',
    keys: ['material', 'craftsmanship', 'maintenance', 'comfort'],
  },
  {
    id: 'marketAndOwnership',
    label: 'Market and Ownership',
    keys: ['collection', 'value', 'resalePotential', 'acquisitionEase'],
  },
];

/** Fully answered dimension set (0 is valid; null is unanswered). */
export type RatingDimensionScores = {
  [K in RatingDimensionKey]: number;
};

/** Form / partial assessment state: null means unanswered, not zero. */
export type PartialRatingDimensions = {
  [K in RatingDimensionKey]: number | null;
};
