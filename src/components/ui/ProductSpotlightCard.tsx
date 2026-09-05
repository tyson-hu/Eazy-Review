import { Image, Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { productImageShadow } from '@/src/components/ui/productImageShadow';
import { getScoreLabel, getScoreTone } from '@/src/lib/constants';
import type { ProductCardData } from '@/src/types/product';
import { formatPrice } from '@/src/utils/formatPrice';
import { formatCommunityRatingContext } from '@/src/utils/formatRatingCount';

type ProductSpotlightCardProps = {
  product: ProductCardData;
  /** Truthful eyebrow naming why this product leads, e.g. `Latest addition`. */
  eyebrow: string;
  onPress?: () => void;
};

const toneClasses = {
  positive: 'text-positive',
  warning: 'text-warning',
  negative: 'text-negative',
  neutral: 'text-secondary',
} as const;

function spokenScore100(score: number | null | undefined): string {
  return score == null ? 'not available' : `${score} out of 100`;
}

function spotlightAccessibilityLabel(
  product: ProductCardData,
  eyebrow: string,
  eazyCaption: string,
  communityCaption: string,
  offerCaption: string,
): string {
  return [
    `Open ${product.brand} ${product.name}`,
    eyebrow,
    `Eazy Score ${spokenScore100(product.eazyScore)}`,
    eazyCaption,
    `Community Score ${spokenScore100(product.communityScore)}`,
    communityCaption,
    offerCaption,
  ].join('. ') + '.';
}

/**
 * The Feed's single focal card: editorial image, identity, one large Eazy
 * Score, compact Community proof, and a one-line price signal. It follows the
 * `docs/DESIGN.md` reading order (image -> name -> score -> reason -> price ->
 * community -> action) and stays the only hero-sized surface on the screen.
 */
export function ProductSpotlightCard({
  product,
  eyebrow,
  onPress,
}: ProductSpotlightCardProps) {
  const imageSource = product.imageUrl ? { uri: product.imageUrl } : undefined;
  const eazyTone = getScoreTone(product.eazyScore);
  const communityTone = getScoreTone(product.communityScore);
  const eazyCaption =
    product.eazyScore == null
      ? 'Not assessed yet'
      : `${getScoreLabel(product.eazyScore)} · Editorial assessment`;
  const communityCaption =
    product.ratingCount === 0
      ? 'No ratings yet'
      : product.communityScore == null
        ? 'No score yet'
        : formatCommunityRatingContext(product.ratingCount);
  const offerCaption = product.lowestOffer
    ? `${formatPrice(
        product.lowestOffer.amount,
        product.lowestOffer.currency,
      )} ${product.lowestOffer.currency} · ${product.lowestOffer.retailer}`
    : 'No verified offer available';

  return (
    <Pressable
      testID={`feed-spotlight-${product.id}`}
      accessibilityRole="button"
      accessibilityLabel={spotlightAccessibilityLabel(
        product,
        eyebrow,
        eazyCaption,
        communityCaption,
        offerCaption,
      )}
      onPress={onPress}
      className="rounded-card border border-border bg-card p-6"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      <AppText variant="label">{eyebrow}</AppText>

      {/* Shadow + bg on outer wrapper (Android elevation); overflow-hidden only on the clip. */}
      <View className="mt-4 rounded-card bg-background" style={productImageShadow}>
        <View className="h-56 items-center justify-center overflow-hidden rounded-card">
          {imageSource ? (
            <Image
              testID={`feed-spotlight-image-${product.id}`}
              source={imageSource}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
              accessible={false}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <AppText variant="caption">No image available</AppText>
          )}
        </View>
      </View>

      <AppText variant="label" className="mt-5">
        {product.brand}
      </AppText>
      <AppText variant="title" className="mt-1">
        {product.name}
      </AppText>
      {product.sku ? (
        <AppText variant="caption" className="mt-1">
          {product.sku}
        </AppText>
      ) : null}

      <View className="mt-5 flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <AppText variant="label">Eazy Score</AppText>
          <AppText variant="score" className={`mt-1 ${toneClasses[eazyTone]}`}>
            {product.eazyScore == null ? '—' : `${product.eazyScore} / 100`}
          </AppText>
          <AppText variant="caption" className="mt-1">
            {eazyCaption}
          </AppText>
        </View>
        <View className="items-end">
          <AppText variant="label">Community Score</AppText>
          <AppText
            className={`mt-1 text-xl font-semibold ${toneClasses[communityTone]}`}>
            {product.communityScore == null
              ? '—'
              : `${product.communityScore} / 100`}
          </AppText>
          <AppText variant="caption" className="mt-1">
            {communityCaption}
          </AppText>
        </View>
      </View>

      <View className="mt-5 flex-row items-center justify-between gap-4 border-t border-border pt-4">
        <View className="flex-1">
          <AppText variant="label">Lowest verified offer</AppText>
          <AppText variant="caption" className="mt-1">
            {offerCaption}
          </AppText>
        </View>
        <AppText variant="action">View product</AppText>
      </View>
    </Pressable>
  );
}
