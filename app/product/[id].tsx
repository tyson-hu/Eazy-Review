import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { RatingRow } from '@/src/components/ui/RatingRow';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { Screen } from '@/src/components/ui/Screen';
import { getMockProductDetailById } from '@/src/features/products/mockProductDetails';
import type { ProductOffer, ProductRatingSummary } from '@/src/types/product';
import { formatPrice } from '@/src/utils/formatPrice';

function formatSizeLabel(offer: ProductOffer): string | null {
  if (offer.size == null) {
    return offer.sizeRegion ? offer.sizeRegion : null;
  }
  return `${offer.sizeRegion} ${offer.size}`.trim();
}

/** Prefer min of non-null offer prices; fall back to catalog lowestPrice when needed. */
function resolveLowestPrice(
  offers: ProductOffer[],
  catalogLowest: number | null | undefined,
): { amount: number; currency: string; fromOffers: boolean } | null {
  const priced = offers.filter(
    (offer): offer is ProductOffer & { price: number } => offer.price != null,
  );
  if (priced.length > 0) {
    const cheapest = priced.reduce((min, offer) =>
      offer.price < min.price ? offer : min,
    );
    return {
      amount: cheapest.price,
      currency: cheapest.currency,
      fromOffers: true,
    };
  }
  if (catalogLowest != null) {
    return { amount: catalogLowest, currency: 'USD', fromOffers: false };
  }
  return null;
}

function hasMeaningfulCommunityCategories(summary: ProductRatingSummary): boolean {
  if (summary.ratingCount <= 0) {
    return false;
  }
  return [
    summary.lookAvg,
    summary.comfortAvg,
    summary.qualityAvg,
    summary.outfitAvg,
    summary.valueAvg,
    summary.overallAvg,
  ].some((avg) => avg != null);
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = typeof id === 'string' ? getMockProductDetailById(id) : null;

  if (!detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Product' }} />
        <EmptyState title="Product not found" message="This product is not in the catalog." />
      </Screen>
    );
  }

  const { product, offers, ratingSummary, myRating } = detail;
  const pricedOffers = offers.filter(
    (offer): offer is ProductOffer & { price: number } => offer.price != null,
  );
  const lowest = resolveLowestPrice(offers, product.lowestPrice);
  const metadataParts = [
    product.sku,
    product.releaseDate,
    product.sizeType,
  ].filter((part): part is string => Boolean(part));
  const showCommunityBreakdown = hasMeaningfulCommunityCategories(ratingSummary);
  const communityCategoryRows = [
    { label: 'Look', value: ratingSummary.lookAvg },
    { label: 'Comfort', value: ratingSummary.comfortAvg },
    { label: 'Quality', value: ratingSummary.qualityAvg },
    { label: 'Outfit', value: ratingSummary.outfitAvg },
    { label: 'Value', value: ratingSummary.valueAvg },
    { label: 'Overall', value: ratingSummary.overallAvg },
  ];
  const myRatingCategoryRows = myRating
    ? [
        { label: 'Look', value: myRating.look },
        { label: 'Comfort', value: myRating.comfort },
        { label: 'Quality', value: myRating.quality },
        { label: 'Outfit', value: myRating.outfit },
        { label: 'Value', value: myRating.value },
      ]
    : [];

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: product.name }} />

      <View className="mt-4 h-56 items-center justify-center overflow-hidden rounded-card bg-card">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <AppText variant="caption">Image coming soon</AppText>
        )}
      </View>

      <View className="mt-4">
        <AppText variant="label">{product.brand}</AppText>
        <AppText variant="title" className="mt-1">
          {product.name}
        </AppText>
        {metadataParts.length > 0 ? (
          <AppText variant="caption" className="mt-1">
            {metadataParts.join(' · ')}
          </AppText>
        ) : null}
      </View>

      <View className="mt-4 flex-row gap-3">
        <ScoreBadge label="Eazy Score" score={product.eazyScore} className="flex-1" />
        <ScoreBadge
          label="Community Score"
          score={ratingSummary.communityScore}
          className="flex-1"
        />
      </View>
      {ratingSummary.ratingCount > 0 ? (
        <AppText variant="caption" className="mt-2">
          {ratingSummary.ratingCount}{' '}
          {ratingSummary.ratingCount === 1 ? 'community rating' : 'community ratings'}
        </AppText>
      ) : null}

      <Card className="mt-4">
        <AppText variant="label">Community ratings</AppText>
        {showCommunityBreakdown ? (
          <View className="mt-3 gap-3">
            {communityCategoryRows.map((row) => (
              <RatingRow key={row.label} label={row.label} value={row.value} />
            ))}
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            No community ratings yet
          </AppText>
        )}
      </Card>

      <Card className="mt-4">
        <AppText variant="label">Purchase</AppText>
        {lowest ? (
          <>
            <View className="mt-2 flex-row items-end justify-between">
              <AppText variant="caption">Lowest price</AppText>
              <AppText className="text-2xl font-bold text-primary">
                {formatPrice(lowest.amount, lowest.currency)}
              </AppText>
            </View>
            {!lowest.fromOffers ? (
              <AppText variant="caption" className="mt-1">
                Catalog estimate — no live size offers
              </AppText>
            ) : null}
            {pricedOffers.length > 0 ? (
              <View className="mt-4 gap-3">
                <AppText variant="label">Price by size</AppText>
                {pricedOffers.map((offer) => {
                  const sizeLabel = formatSizeLabel(offer);
                  return (
                    <View
                      key={offer.id}
                      className="flex-row items-center justify-between border-t border-border pt-3">
                      <View className="flex-1 pr-3">
                        {sizeLabel ? (
                          <AppText variant="body">{sizeLabel}</AppText>
                        ) : null}
                        <AppText variant="caption" className={sizeLabel ? 'mt-0.5' : undefined}>
                          {offer.websiteName}
                        </AppText>
                      </View>
                      <AppText className="text-lg font-bold text-primary">
                        {formatPrice(offer.price, offer.currency)}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            ) : (
              <AppText variant="caption" className="mt-3">
                No size offers available right now.
              </AppText>
            )}
          </>
        ) : (
          <AppText variant="body" className="mt-2">
            Purchase unavailable
          </AppText>
        )}
      </Card>

      <Card className="mt-4 border-accent">
        <AppText variant="label">My Rating</AppText>
        {myRating == null ? (
          <AppText variant="body" className="mt-2">
            Not rated yet
          </AppText>
        ) : (
          <>
            <View className="mt-2 flex-row items-end justify-between">
              <AppText variant="caption">Overall</AppText>
              <AppText className="text-2xl font-bold text-primary">
                {myRating.overall}/10
              </AppText>
            </View>
            <View className="mt-4 gap-3">
              {myRatingCategoryRows.map((row) => (
                <RatingRow key={row.label} label={row.label} value={row.value} />
              ))}
            </View>
            {myRating.comment ? (
              <AppText variant="body" className="mt-4">
                {myRating.comment}
              </AppText>
            ) : null}
          </>
        )}
      </Card>
    </Screen>
  );
}
