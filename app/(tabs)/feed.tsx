import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ProductRankRow } from '@/src/components/ui/ProductRankRow';
import { ProductSpotlightCard } from '@/src/components/ui/ProductSpotlightCard';
import { Screen } from '@/src/components/ui/Screen';
import { useFeedCollectionsQuery } from '@/src/features/feed/queries';
import { selectFeedSections } from '@/src/features/feed/selectFeedSections';
import { CatalogStatusBanner } from '@/src/features/products/CatalogStatusBanner';
import { getCatalogErrorPresentation } from '@/src/features/products/errors';
import { useProductsQuery } from '@/src/features/products/queries';

export default function FeedScreen() {
  const router = useRouter();
  const productsQuery = useProductsQuery();
  const collectionsQuery = useFeedCollectionsQuery();
  const products = productsQuery.data;
  const hasData = products !== undefined;
  const collections = collectionsQuery.data ?? [];
  const sections = selectFeedSections(products ?? [], collections);
  const collectionsUnresolved =
    collectionsQuery.data === undefined &&
    collectionsQuery.isPending &&
    !collectionsQuery.error &&
    !collectionsQuery.isOffline;
  const errorPresentation = productsQuery.error
    ? getCatalogErrorPresentation(productsQuery.error, 'products')
    : null;

  const retry = () => {
    void productsQuery.refetch();
    void collectionsQuery.refetch();
  };

  return (
    <Screen scroll>
      {productsQuery.isOffline && !hasData ? (
        <ErrorState
          title="You're offline."
          message="Connect to the internet and try again."
          onRetry={retry}
        />
      ) : productsQuery.isPending && !hasData ? (
        <LoadingState message="Loading products..." />
      ) : productsQuery.error && !hasData && errorPresentation ? (
        <ErrorState
          title={errorPresentation.title}
          message={errorPresentation.message}
          onRetry={errorPresentation.canRetry ? retry : undefined}
        />
      ) : collectionsUnresolved ? (
        <LoadingState message="Loading products..." />
      ) : (
        <>
          {productsQuery.isOffline ? (
            <CatalogStatusBanner
              title="You're offline."
              message="Prices and availability may have changed."
            />
          ) : productsQuery.isFetching ? (
            <CatalogStatusBanner title="Refreshing catalog..." />
          ) : productsQuery.error ? (
            <CatalogStatusBanner
              title="Could not refresh catalog."
              message="Showing the last available product data."
              onRetry={retry}
            />
          ) : null}

          {products?.length === 0 ? (
            <EmptyState
              title="No published products yet"
              message="The public catalog is currently empty."
            />
          ) : (
            <View className="mt-4 gap-8">
              {sections.map((section, sectionIndex) => {
                // Only the first populated section leads with the spotlight;
                // its remaining products continue as compact rows below it.
                const isLead = sectionIndex === 0;
                const spotlight = isLead ? section.products[0] : undefined;
                const rows = isLead ? section.products.slice(1) : section.products;
                // A ranked lead consumes rank 1 on the spotlight; rows continue from 2.
                const rankOffset = isLead && section.ranked ? 1 : 0;

                return (
                  <View
                    key={section.id}
                    testID={`feed-section-${section.id}`}
                    className="gap-4"
                  >
                    <View>
                      <AppText variant="subtitle" accessibilityRole="header">
                        {section.title}
                      </AppText>
                      <AppText variant="caption" className="mt-1">
                        {section.caption}
                      </AppText>
                    </View>

                    {spotlight ? (
                      <ProductSpotlightCard
                        product={spotlight}
                        eyebrow={section.leadLabel}
                        rank={section.ranked ? 1 : undefined}
                        onPress={() => router.push(`/product/${spotlight.id}`)}
                      />
                    ) : null}

                    {rows.length > 0 ? (
                      <View
                        testID={`feed-list-${section.id}`}
                        className="overflow-hidden rounded-card border border-border bg-card"
                      >
                        {rows.map((product, index) => (
                          <ProductRankRow
                            key={`${section.id}-${product.id}`}
                            product={product}
                            signal={section.signal}
                            rank={
                              section.ranked ? index + 1 + rankOffset : undefined
                            }
                            className={index > 0 ? 'border-t border-border' : ''}
                            onPress={() => router.push(`/product/${product.id}`)}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
