import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { RatingRow } from '@/src/components/ui/RatingRow';
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
  const showDimensionComparison =
    eazyAssessment?.dimensions != null ||
    (ratingSummary.ratingCount > 0 &&
      RATING_DIMENSIONS.some(
        (d) => avgForDimension(ratingSummary, d.key) != null,
      ));

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
          sourceLabel="Eazy Assessment · Editorial evaluation"
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
          className="flex-1"
        />
      </View>
      {ratingSummary.ratingCount > 0 ? (
        <AppText variant="caption" className="mt-2">
          {ratingSummary.ratingCount}{' '}
          {ratingSummary.ratingCount === 1
            ? 'community rating'
            : 'community ratings'}
        </AppText>
      ) : null}

      <Card className="mt-5">
        <AppText variant="label">Score comparison</AppText>
        <AppText variant="caption" className="mt-1">
          Shared 0–10 categories; composites are 0–100.
        </AppText>
        {showDimensionComparison ? (
          <View className="mt-4">
            <View className="mb-2 flex-row items-center">
              <AppText variant="caption" className="flex-1">
                Category
              </AppText>
              <AppText variant="caption" className="w-16 text-right">
                Eazy
              </AppText>
              <AppText variant="caption" className="w-20 text-right">
                Community
              </AppText>
            </View>
            {RATING_DIMENSIONS.map((dim) => {
              const eazy =
                eazyAssessment?.dimensions?.[dim.key] ?? null;
              const community = avgForDimension(ratingSummary, dim.key);
              return (
                <View
                  key={dim.key}
                  testID={`score-compare-${dim.key}`}
                  className="flex-row items-center border-t border-border py-2">
                  <AppText variant="body" className="flex-1">
                    {dim.label}
                  </AppText>
                  <AppText variant="caption" className="w-16 text-right">
                    {formatDimensionScore10(eazy)}
                  </AppText>
                  <AppText variant="caption" className="w-20 text-right">
                    {formatDimensionScore10(community)}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            No category comparison yet.
          </AppText>
        )}
      </Card>

      <Card className="mt-5">
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

      <Card className="mt-5 border-accent">
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
            {RATING_DIMENSIONS.map((dim) => (
              <RatingRow
                key={dim.key}
                label={dim.label}
                score10={myRating[dim.key]}
              />
            ))}
            <AppText variant="caption">
              Private note stays on the Rate form — only you can see it.
            </AppText>
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            Not rated yet
          </AppText>
        )}
      </Card>

      <Card className="mt-5">
        <AppText variant="label">Description</AppText>
        <AppText variant="body" className="mt-2">
          {product.description ?? 'No product description available yet.'}
        </AppText>
      </Card>
    </Screen>
  );
}
