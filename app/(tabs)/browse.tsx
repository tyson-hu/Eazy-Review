import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ProductCard } from '@/src/components/ui/ProductCard';
import { Screen } from '@/src/components/ui/Screen';
import { CatalogStatusBanner } from '@/src/features/products/CatalogStatusBanner';
import { getCatalogErrorPresentation } from '@/src/features/products/errors';
import { useProductsQuery } from '@/src/features/products/queries';
import type { ProductCardData } from '@/src/types/product';

function matchesQuery(product: ProductCardData, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return true;
  }
  return (
    product.brand.toLowerCase().includes(q) ||
    product.name.toLowerCase().includes(q) ||
    (product.sku ?? '').toLowerCase().includes(q)
  );
}

export default function BrowseScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const productsQuery = useProductsQuery();
  const products = productsQuery.data;
  const hasData = products !== undefined;
  const results = (products ?? []).filter((product) =>
    matchesQuery(product, query),
  );
  const errorPresentation = productsQuery.error
    ? getCatalogErrorPresentation(productsQuery.error, 'products')
    : null;

  const retry = () => {
    void productsQuery.refetch();
  };

  return (
    <Screen scroll>
      <Input
        className="mt-4"
        placeholder="Search brand, name, or SKU"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search products"
      />

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
          ) : results.length === 0 ? (
            <View className="mt-4">
              <EmptyState
                title="No products found"
                message="Try a different brand, name, or SKU."
              />
              <Button
                className="mt-4"
                label="Clear search"
                variant="secondary"
                onPress={() => setQuery('')}
              />
            </View>
          ) : (
            <View className="mt-5 gap-5">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => router.push(`/product/${product.id}`)}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
