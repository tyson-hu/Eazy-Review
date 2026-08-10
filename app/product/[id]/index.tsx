import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/features/auth/hooks';
import { productDetailReturnPath } from '@/src/features/auth/returnPath';
import { CatalogStatusBanner } from '@/src/features/products/CatalogStatusBanner';
import { getCatalogErrorPresentation } from '@/src/features/products/errors';
import { useProductQuery } from '@/src/features/products/queries';
import { RATING_DIMENSIONS } from '@/src/features/ratings/dimensions';
import { useUserRatingQuery } from '@/src/features/ratings/queries';
import { formatDimensionScore10 } from '@/src/features/ratings/score';
import { getScoreLabel } from '@/src/lib/constants';
import type {
  ProductRatingSummary,
  VerifiedProductOffer,
} from '@/src/types/product';
import { formatPrice } from '@/src/utils/formatPrice';
import { formatVerifiedDate } from '@/src/utils/formatVerifiedDate';

function avgForDimension(
  summary: ProductRatingSummary,
  key: (typeof RATING_DIMENSIONS)[number]['key'],
): number | null {
  switch (key) {
    case 'look':
      return summary.lookAvg;
    case 'outfit':
      return summary.outfitAvg;
    case 'material':
      return summary.materialAvg;
    case 'craftsmanship':
      return summary.craftsmanshipAvg;
    case 'maintenance':
      return summary.maintenanceAvg;
    case 'comfort':
      return summary.comfortAvg;
    case 'collection':
      return summary.collectionAvg;
    case 'value':
      return summary.valueAvg;
    case 'resalePotential':
      return summary.resalePotentialAvg;
    case 'acquisitionEase':
      return summary.acquisitionEaseAvg;
  }
}

type CommunityHighlight = { label: string; value: number };

function getCommunityHighlights(
  summary: ProductRatingSummary,
): { strongest: CommunityHighlight; weakest: CommunityHighlight } | null {
  if (summary.ratingCount <= 0) {
    return null;
  }

  const ranked = RATING_DIMENSIONS.map((dimension) => ({
    label: dimension.label,
    value: avgForDimension(summary, dimension.key),
  }))
    .filter(
      (dimension): dimension is CommunityHighlight => dimension.value != null,
    )
    .sort((a, b) => b.value - a.value);

  if (ranked.length < 2) {
    return null;
  }

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  return strongest.value.toFixed(1) === weakest.value.toFixed(1)
    ? null
    : { strongest, weakest };
}

function communityRatingContext(ratingCount: number): string | undefined {
  if (ratingCount <= 0) {
    return undefined;
  }
  const countLabel = `${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'}`;
  return ratingCount < 5 ? `Early score · ${countLabel}` : countLabel;
}

function scoreDeltaCopy(
  eazyScore100: number | null | undefined,
  communityScore100: number | null | undefined,
): string | null {
  if (eazyScore100 == null || communityScore100 == null) {
    return null;
  }

  const difference = communityScore100 - eazyScore100;
  if (difference === 0) {
    return 'Community matches Eazy overall.';
  }
  const points = Math.abs(difference);
  const pointLabel = points === 1 ? 'point' : 'points';
  return `Community is ${points} ${pointLabel} ${difference > 0 ? 'above' : 'below'} Eazy.`;
}

function scoreAccessibilityCopy(
  source: 'Eazy' | 'Community',
  score10: number | null,
): string {
  return score10 == null
    ? `${source} not available`
    : `${source} ${formatDimensionScore10(score10)} out of 10`;
}

function comparisonRowAccessibilityLabel(
  dimension: string,
  eazyScore10: number | null,
  communityScore10: number | null,
): string {
  return `${dimension}. ${scoreAccessibilityCopy('Eazy', eazyScore10)}. ${scoreAccessibilityCopy('Community', communityScore10)}.`;
}

function ProductHeader({ title = 'Product' }: { title?: string }) {
  return (
    <Stack.Screen
      options={{
        title,
        headerLeft: ({ canGoBack }) => (
          <HeaderBackButton canGoBack={canGoBack} />
        ),
      }}
    />
  );
}

function offerContext(offer: VerifiedProductOffer): string {
  return `${offer.retailer} · ${offer.sizeLabel ?? offer.market}`;
}

function OfferPrice({ offer }: { offer: VerifiedProductOffer }) {
  return (
    <AppText className="text-lg font-semibold text-primary">
      {formatPrice(offer.amount, offer.currency)} {offer.currency}
    </AppText>
  );
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' ? id : '';
  const { isSignedIn, status: authStatus } = useAuth();
  const productQuery = useProductQuery(productId);
  // My Rating is owner-scoped; never stored under public catalog keys.
  const myRatingQuery = useUserRatingQuery(productId);
  const hasData = productQuery.data !== undefined;
  const retry = () => {
    void productQuery.refetch();
    if (isSignedIn) {
      void myRatingQuery.refetch();
    }
  };

  if (!productId) {
    return (
      <Screen>
        <ProductHeader />
        <EmptyState
          title="Product not found"
          message="This product is not publicly available."
        />
      </Screen>
    );
  }

  if (productQuery.isOffline && !hasData) {
    return (
      <Screen>
        <ProductHeader />
        <ErrorState
          title="You're offline."
          message="Connect to the internet and try again."
          onRetry={retry}
        />
      </Screen>
    );
  }

  if (productQuery.isPending && !hasData) {
    return (
      <Screen>
        <ProductHeader />
        <LoadingState message="Loading product..." />
      </Screen>
    );
  }

  if (productQuery.error && !hasData) {
    const presentation = getCatalogErrorPresentation(
      productQuery.error,
      'product',
    );
    return (
      <Screen>
        <ProductHeader />
        {productQuery.error.code === 'not-found' ? (
          <EmptyState
            title={presentation.title}
            message={presentation.message}
          />
        ) : (
          <ErrorState
            title={presentation.title}
            message={presentation.message}
            onRetry={presentation.canRetry ? retry : undefined}
          />
        )}
      </Screen>
    );
  }

  const detail = productQuery.data;
  if (!detail) {
    return null;
  }

  const { product, ratingSummary, eazyAssessment, offers } = detail;
  const productImageUrl = detail.imageUrls[0] ?? product.imageUrl;
  const productImageSource = productImageUrl
    ? { uri: productImageUrl }
    : undefined;
  const metadataParts = [
    product.sku,
    product.releaseDate,
    product.sizeType,
  ].filter((part): part is string => Boolean(part));
  const lowestOffer = offers[0] ?? null;
  const showSignInCta = authStatus !== 'initializing' && !isSignedIn;
  const myRating = isSignedIn ? (myRatingQuery.data ?? null) : null;
  const hasMyRating = myRating != null;
  const myRatingPausedOffline =
    isSignedIn &&
    myRatingQuery.isOffline &&
    myRatingQuery.fetchStatus === 'paused' &&
    myRatingQuery.data === undefined;
  const myRatingLoading =
    isSignedIn &&
    myRatingQuery.isPending &&
    myRatingQuery.data === undefined &&
    myRatingQuery.fetchStatus !== 'paused';
  const publicRefreshing =
    productQuery.isFetching || (isSignedIn && myRatingQuery.isFetching && !myRatingQuery.isOffline);
  const hasEazyDimensions = eazyAssessment?.dimensions != null;
  const hasCommunityDimensions =
    ratingSummary.ratingCount > 0 &&
    RATING_DIMENSIONS.some(
      (dimension) => avgForDimension(ratingSummary, dimension.key) != null,
    );
  const showDimensionComparison =
    hasEazyDimensions || hasCommunityDimensions;
  const methodologiesMatch =
    eazyAssessment?.methodologyVersion != null &&
    ratingSummary.methodologyVersion != null &&
    eazyAssessment.methodologyVersion === ratingSummary.methodologyVersion;
  const comparisonMethodologyMismatch =
    hasEazyDimensions && hasCommunityDimensions && !methodologiesMatch;
  const communityHighlights = getCommunityHighlights(ratingSummary);
  const decisionDelta = methodologiesMatch
    ? scoreDeltaCopy(
        eazyAssessment?.score100,
        ratingSummary.communityScore,
      )
    : null;

  return (
    <Screen
      scroll
      footer={
        <View className="border-t border-border bg-background px-4 py-3">
          {showSignInCta ? (
            <Button
              testID="sign-in-to-rate"
              label="Sign in to rate"
              onPress={() => {
                router.push({
                  pathname: '/auth/sign-in',
                  params: { returnTo: productDetailReturnPath(productId) },
                });
              }}
            />
          ) : isSignedIn ? (
            <Button
              testID={hasMyRating ? 'edit-my-rating' : 'rate-this-product'}
              label={hasMyRating ? 'Edit my rating' : 'Rate this product'}
              onPress={() => {
                router.push(`/product/${productId}/rate`);
              }}
            />
          ) : (
            <Button
              testID="rating-cta-loading"
              label="Checking account..."
              disabled
            />
          )}
        </View>
      }>
      <ProductHeader title={product.name} />

      {productQuery.isOffline ? (
        <CatalogStatusBanner
          title="You're offline."
          message="Prices and availability may have changed."
        />
      ) : publicRefreshing ? (
        <CatalogStatusBanner title="Refreshing product..." />
      ) : productQuery.error ? (
        <CatalogStatusBanner
          title="Could not refresh product."
          message="Showing the last available product data."
          onRetry={retry}
        />
      ) : null}

      <View className="mt-4 h-56 items-center justify-center overflow-hidden rounded-card bg-card">
        {productImageSource ? (
          <Image
            testID="product-detail-image"
            source={productImageSource}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
            accessibilityLabel={`${product.brand} ${product.name}`}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <AppText variant="caption">No image available</AppText>
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

      <View className="mt-5 flex-row gap-5">
        <ScoreBadge
          label="Eazy Score"
          score100={eazyAssessment?.score100 ?? null}
          emptyLabel="Not assessed yet"
          sourceLabel="Editorial assessment"
          className="flex-1"
        />
        <ScoreBadge
          label="Community Score"
          score100={ratingSummary.communityScore}
          emptyLabel={
            ratingSummary.ratingCount === 0
              ? 'No ratings yet'
              : 'No score yet'
          }
          sourceLabel={communityRatingContext(ratingSummary.ratingCount)}
          className="flex-1"
        />
      </View>

      <Card testID="product-detail-section-decision" className="mt-5">
        <AppText variant="label">Decision summary</AppText>
        {ratingSummary.ratingCount === 0 ? (
          <AppText variant="body" className="mt-2">
            No community ratings yet.
          </AppText>
        ) : (
          <View className="mt-4 gap-4">
            {decisionDelta ? (
              <AppText variant="subtitle">{decisionDelta}</AppText>
            ) : null}
            {communityHighlights ? (
              <>
                <View>
                  <AppText variant="caption">Top strength</AppText>
                  <AppText variant="subtitle" className="mt-1">
                    {communityHighlights.strongest.label} ·{' '}
                    {communityHighlights.strongest.value.toFixed(1)}/10
                  </AppText>
                </View>
                <View>
                  <AppText variant="caption">Weakest category</AppText>
                  <AppText variant="subtitle" className="mt-1">
                    {communityHighlights.weakest.label} ·{' '}
                    {communityHighlights.weakest.value.toFixed(1)}/10
                  </AppText>
                </View>
              </>
            ) : (
              <AppText variant="body">
                No clear community strengths or weaknesses yet.
              </AppText>
            )}
          </View>
        )}
      </Card>

      <Card testID="product-detail-section-offers" className="mt-5">
        <AppText variant="label">Verified offers</AppText>
        {lowestOffer ? (
          <View className="mt-3 gap-3">
            <View testID={`verified-offer-${lowestOffer.id}`}>
              <AppText variant="caption">Lowest verified offer</AppText>
              <OfferPrice offer={lowestOffer} />
              <AppText variant="caption" className="mt-1">
                {offerContext(lowestOffer)}
              </AppText>
              <AppText variant="caption" className="mt-1">
                Checked {formatVerifiedDate(lowestOffer.checkedAt)}
              </AppText>
            </View>
            {offers.slice(1).map((offer) => (
              <View
                key={offer.id}
                testID={`verified-offer-${offer.id}`}
                className="border-t border-border pt-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <AppText variant="body">{offerContext(offer)}</AppText>
                    <AppText variant="caption" className="mt-1">
                      Checked {formatVerifiedDate(offer.checkedAt)}
                    </AppText>
                  </View>
                  <OfferPrice offer={offer} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            No verified offer available
          </AppText>
        )}
      </Card>

      <Card testID="product-detail-section-comparison" className="mt-5">
        <AppText variant="label">Score comparison</AppText>
        <AppText variant="caption" className="mt-1">
          Both scores use the same 10 dimensions, scored from 0 to 10.
        </AppText>
        {comparisonMethodologyMismatch ? (
          <AppText variant="body" className="mt-2">
            Direct comparison is unavailable because these scores use different
            methods.
          </AppText>
        ) : showDimensionComparison ? (
          <View className="mt-4">
            <View className="mb-2 flex-row items-center">
              <AppText variant="caption" className="flex-1">
                Dimension
              </AppText>
              <View className="ml-4 flex-row gap-5">
                <AppText variant="caption" className="w-12 text-right">
                  Eazy
                </AppText>
                <AppText variant="caption" className="w-20 text-right">
                  Community
                </AppText>
              </View>
            </View>
            {RATING_DIMENSIONS.map((dim) => {
              const eazy =
                eazyAssessment?.dimensions?.[dim.key] ?? null;
              const community = avgForDimension(ratingSummary, dim.key);
              return (
                <View
                  key={dim.key}
                  testID={`score-compare-${dim.key}`}
                  accessible
                  accessibilityLabel={comparisonRowAccessibilityLabel(
                    dim.label,
                    eazy,
                    community,
                  )}
                  className="flex-row items-center border-t border-border py-2">
                  <AppText variant="body" className="flex-1">
                    {dim.label}
                  </AppText>
                  <View className="ml-4 flex-row gap-5">
                    <AppText variant="caption" className="w-12 text-right">
                      {formatDimensionScore10(eazy)}
                    </AppText>
                    <AppText variant="caption" className="w-20 text-right">
                      {formatDimensionScore10(community)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            No dimension comparison yet.
          </AppText>
        )}
      </Card>

      <Card
        testID="product-detail-section-my-rating"
        className="mt-5 border-accent">
        <AppText variant="label">My Rating</AppText>
        {!isSignedIn ? (
          <>
            <AppText variant="body" className="mt-2">
              Sign in to rate this product.
            </AppText>
            <AppText variant="caption" className="mt-1">
              Your scores and private note stay owner-only.
            </AppText>
          </>
        ) : myRatingPausedOffline ? (
          <>
            <AppText variant="body" className="mt-2">
              You&apos;re offline.
            </AppText>
            <AppText variant="caption" className="mt-1">
              Connect to load or save your rating.
            </AppText>
            <Button
              className="mt-3"
              label="Retry"
              variant="secondary"
              onPress={() => {
                void myRatingQuery.refetch();
              }}
            />
          </>
        ) : myRatingLoading ? (
          <AppText variant="body" className="mt-2">
            Loading your rating...
          </AppText>
        ) : myRatingQuery.isError && !hasMyRating ? (
          <>
            <AppText variant="body" className="mt-2">
              Could not load your rating.
            </AppText>
            <Button
              className="mt-3"
              label="Retry"
              variant="secondary"
              onPress={() => {
                void myRatingQuery.refetch();
              }}
            />
          </>
        ) : hasMyRating && myRating ? (
          <View className="mt-3 gap-3">
            <AppText className="text-xl font-semibold text-primary">
              {myRating.score100} / 100
            </AppText>
            <AppText variant="body">{getScoreLabel(myRating.score100)}</AppText>
            <AppText variant="caption">
              Edit your rating to review all 10 dimensions and your private
              note.
            </AppText>
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            Not rated yet
          </AppText>
        )}
      </Card>

      <Card testID="product-detail-section-description" className="mt-5">
        <AppText variant="label">Description</AppText>
        <AppText variant="body" className="mt-2">
          {product.description ?? 'No product description available yet.'}
        </AppText>
      </Card>
    </Screen>
  );
}
