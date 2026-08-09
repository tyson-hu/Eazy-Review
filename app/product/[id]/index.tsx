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
import { useUserRatingQuery } from '@/src/features/ratings/queries';
import type {
  ProductRatingSummary,
  VerifiedProductOffer,
} from '@/src/types/product';
import { formatPrice } from '@/src/utils/formatPrice';
import { formatVerifiedDate } from '@/src/utils/formatVerifiedDate';

type CommunityCategoryAvg = { label: string; value: number | null };
type CommunityHighlight = { label: string; value: number };

const COMMUNITY_CATEGORY_FIELDS: {
  label: string;
  avgKey: keyof Pick<
    ProductRatingSummary,
    'lookAvg' | 'comfortAvg' | 'qualityAvg' | 'outfitAvg' | 'valueAvg'
  >;
}[] = [
  { label: 'Look', avgKey: 'lookAvg' },
  { label: 'Comfort', avgKey: 'comfortAvg' },
  { label: 'Quality', avgKey: 'qualityAvg' },
  { label: 'Outfit', avgKey: 'outfitAvg' },
  { label: 'Value', avgKey: 'valueAvg' },
];

function getCommunityCategoryAvgs(
  summary: ProductRatingSummary,
): CommunityCategoryAvg[] {
  return COMMUNITY_CATEGORY_FIELDS.map(({ label, avgKey }) => ({
    label,
    value: summary[avgKey],
  }));
}

function getCommunityCategoryRows(
  summary: ProductRatingSummary,
): CommunityCategoryAvg[] {
  return [
    { label: 'Overall', value: summary.overallAvg },
    ...getCommunityCategoryAvgs(summary),
  ];
}

function hasMeaningfulCommunityCategories(
  summary: ProductRatingSummary,
): boolean {
  return (
    summary.ratingCount > 0 &&
    getCommunityCategoryRows(summary).some((row) => row.value != null)
  );
}

function getCommunityHighlights(
  summary: ProductRatingSummary,
): { strongest: CommunityHighlight; weakest: CommunityHighlight } | null {
  if (summary.ratingCount <= 0) {
    return null;
  }
  const categories = getCommunityCategoryAvgs(summary).filter(
    (category): category is CommunityHighlight => category.value != null,
  );
  if (categories.length < 2) {
    return null;
  }
  const ranked = [...categories].sort((a, b) => b.value - a.value);
  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  return strongest.value.toFixed(1) === weakest.value.toFixed(1)
    ? null
    : { strongest, weakest };
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
  const showCommunityBreakdown =
    hasMeaningfulCommunityCategories(ratingSummary);
  const communityHighlights = getCommunityHighlights(ratingSummary);
  const communityCategoryRows = getCommunityCategoryRows(ratingSummary);
  const lowestOffer = offers[0] ?? null;
  const showSignInCta = authStatus !== 'initializing' && !isSignedIn;
  const myRating = isSignedIn ? (myRatingQuery.data ?? null) : null;
  const hasMyRating = myRating != null;
  const myRatingLoading =
    isSignedIn && myRatingQuery.isPending && myRatingQuery.data === undefined;
  const publicRefreshing =
    productQuery.isFetching || (isSignedIn && myRatingQuery.isFetching);

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
          score={eazyAssessment?.score ?? null}
          emptyLabel="Not assessed yet"
          sourceLabel="Eazy Assessment · Editorial evaluation"
          className="flex-1"
        />
        <ScoreBadge
          label="Community Score"
          score={ratingSummary.communityScore}
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
        <AppText variant="label">Decision summary</AppText>
        {communityHighlights ? (
          <View className="mt-4 gap-4">
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
            <AppText variant="caption">
              Based on community category averages.
            </AppText>
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            {ratingSummary.ratingCount > 0
              ? 'No clear category strengths or weaknesses yet.'
              : 'No ratings yet'}
          </AppText>
        )}
      </Card>

      <Card className="mt-5">
        <AppText variant="label">Community ratings</AppText>
        {showCommunityBreakdown ? (
          <View className="mt-3 gap-3">
            {communityCategoryRows.map((row) => (
              <RatingRow key={row.label} label={row.label} value={row.value} />
            ))}
          </View>
        ) : (
          <AppText variant="body" className="mt-2">
            No ratings yet
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
            <RatingRow label="Overall" value={myRating.overall} />
            <RatingRow label="Look" value={myRating.look} />
            <RatingRow label="Comfort" value={myRating.comfort} />
            <RatingRow label="Quality" value={myRating.quality} />
            <RatingRow label="Outfit" value={myRating.outfit} />
            <RatingRow label="Value" value={myRating.value} />
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
