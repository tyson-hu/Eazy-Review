import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ProductCard } from '@/src/components/ui/ProductCard';
import { Screen } from '@/src/components/ui/Screen';
import { CatalogStatusBanner } from '@/src/features/products/CatalogStatusBanner';
import { getCatalogErrorPresentation } from '@/src/features/products/errors';
import { useProductsQuery } from '@/src/features/products/queries';
import { selectFeedSections } from '@/src/features/products/selectFeedSections';

export default function FeedScreen() {
  const router = useRouter();
  const productsQuery = useProductsQuery();
  const products = productsQuery.data;
  const hasData = products !== undefined;
  const sections = selectFeedSections(products ?? []);
  const errorPresentation = productsQuery.error
    ? getCatalogErrorPresentation(productsQuery.error, 'products')
    : null;

  const retry = () => {
    void productsQuery.refetch();
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
            <View className="mt-5 gap-8">
              {sections.map((section) => (
                <View
                  key={section.id}
                  testID={`feed-section-${section.id}`}
                  className="gap-5"
                >
                  <AppText variant="subtitle" accessibilityRole="header">
                    {section.title}
                  </AppText>
                  {section.products.map((product) => (
                    <ProductCard
                      key={`${section.id}-${product.id}`}
                      product={product}
                      onPress={() => router.push(`/product/${product.id}`)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
