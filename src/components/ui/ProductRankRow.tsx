import { Image, Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { getScoreLabel, getScoreTone } from '@/src/lib/constants';
import type { ProductCardData } from '@/src/types/product';
import { formatRatingCount } from '@/src/utils/formatRatingCount';

export type ProductRankRowSignal = 'eazy' | 'community';

type ProductRankRowProps = {
  product: ProductCardData;
  /** Which composite score the trailing column shows. */
  signal: ProductRankRowSignal;
  /** Shown when the enclosing list is an honest ranking; omit for recency. */
  rank?: number;
  onPress?: () => void;
  className?: string;
};

const toneClasses = {
  positive: 'text-positive',
  warning: 'text-warning',
  negative: 'text-negative',
  neutral: 'text-secondary',
} as const;

function trailingColumn(product: ProductCardData, signal: ProductRankRowSignal) {
  if (signal === 'eazy') {
    return {
      label: 'Eazy Score',
      score100: product.eazyScore,
      caption:
        product.eazyScore == null
          ? 'Not assessed yet'
          : getScoreLabel(product.eazyScore),
    };
  }
  return {
    label: 'Community Score',
    score100: product.communityScore,
    caption:
      product.ratingCount === 0
        ? 'No ratings yet'
        : product.communityScore == null
          ? 'No score yet'
          : formatRatingCount(product.ratingCount),
  };
}

/**
 * Compact list row for Feed rankings: rank, thumbnail, identity, and one
 * labeled composite score. Lists of these rows sit inside one bordered card
 * so the Feed reads as a scoreboard rather than a second Browse list.
 */
export function ProductRankRow({
  product,
  signal,
  rank,
  onPress,
  className,
}: ProductRankRowProps) {
  const imageSource = product.imageUrl ? { uri: product.imageUrl } : undefined;
  const trailing = trailingColumn(product, signal);
  const tone = getScoreTone(trailing.score100);

  return (
    <Pressable
      testID={`feed-row-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.brand} ${product.name}`}
      onPress={onPress}
      className={`min-h-[72px] flex-row items-center gap-3 px-4 py-3 ${className ?? ''}`}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      {rank != null ? (
        <AppText
          testID={`feed-row-rank-${product.id}`}
          className="w-5 text-lg font-semibold text-secondary">
          {rank}
        </AppText>
      ) : null}

      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-background">
        {imageSource ? (
          <Image
            testID={`feed-row-image-${product.id}`}
            source={imageSource}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
            accessible={false}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>

      <View className="flex-1">
        <AppText variant="label">{product.brand}</AppText>
        {/* Sneaker names run long; three lines keeps sibling rows distinguishable. */}
        <AppText
          className="mt-0.5 text-base font-semibold text-primary"
          numberOfLines={3}>
          {product.name}
        </AppText>
      </View>

      <View className="items-end">
        <AppText variant="label">{trailing.label}</AppText>
        <AppText className={`mt-0.5 text-lg font-semibold ${toneClasses[tone]}`}>
          {trailing.score100 == null ? '—' : `${trailing.score100} / 100`}
        </AppText>
        <AppText variant="caption" className="mt-0.5">
          {trailing.caption}
        </AppText>
      </View>
    </Pressable>
  );
}
