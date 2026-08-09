import { Stack, useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/features/auth/hooks';
import { getRatingErrorMessage } from '@/src/features/ratings/errors';
import { useUserRatedProductsQuery } from '@/src/features/ratings/queries';
import type { RatedProductItem } from '@/src/features/ratings/types';

function RatedProductRow({
  item,
  onPress,
}: {
  item: RatedProductItem;
  onPress: () => void;
}) {
  const imageSource = item.imageUrl ? { uri: item.imageUrl } : undefined;

  return (
    <Pressable
      testID={`rated-product-${item.productId}`}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.brand} ${item.name}, your rating ${item.myOverall} out of 10`}
      onPress={onPress}
      className="rounded-card border border-border bg-card p-5"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View className="flex-row gap-4">
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-card bg-background">
          {imageSource ? (
            <Image
              source={imageSource}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
              accessible={false}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <AppText variant="caption">No image</AppText>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <AppText variant="label">{item.brand}</AppText>
          <AppText variant="subtitle" className="mt-1">
            {item.name}
          </AppText>
          {item.sku ? (
            <AppText variant="caption" className="mt-1">
              {item.sku}
            </AppText>
          ) : null}
          <View className="mt-3 flex-row gap-3">
            <ScoreBadge
              label="My Rating"
              score={item.myOverall}
              emptyLabel="No score"
              className="flex-1"
            />
            <ScoreBadge
              label="Community Score"
              score={item.communityScore}
              emptyLabel={
                item.ratingCount === 0 ? 'No ratings yet' : 'No score yet'
              }
              className="flex-1"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Owner-only rated products list (Task 17).
 * One bounded owner query; taps open existing Product Detail.
 */
export default function RatedProductsScreen() {
  const router = useRouter();
  const { status, isSignedIn } = useAuth();
  const query = useUserRatedProductsQuery();

  if (status === 'initializing') {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rated Products',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <LoadingState message="Checking account..." />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rated Products',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <EmptyState
          title="Sign in required"
          message="Sign in to see products you have rated."
        />
      </Screen>
    );
  }

  if (query.isPending && query.data === undefined) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rated Products',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <LoadingState message="Loading rated products..." />
      </Screen>
    );
  }

  if (query.isError && query.data === undefined) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rated Products',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <ErrorState
          title="Could not load rated products"
          message={getRatingErrorMessage(query.error)}
          onRetry={() => {
            void query.refetch();
          }}
        />
      </Screen>
    );
  }

  const items = query.data ?? [];

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          title: 'Rated Products',
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No rated products yet"
          message="Rate a product from Product Detail to see it here."
        />
      ) : (
        <View className="mt-2 gap-4 pb-6">
          <AppText variant="caption">
            {items.length} {items.length === 1 ? 'product' : 'products'} rated
          </AppText>
          {items.map((item) => (
            <RatedProductRow
              key={item.productId}
              item={item}
              onPress={() => {
                router.push(`/product/${item.productId}`);
              }}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
