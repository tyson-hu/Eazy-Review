import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { ProductCard } from '@/src/components/ui/ProductCard';
import { Screen } from '@/src/components/ui/Screen';
import { mockProducts } from '@/src/features/products/mockProducts';
import type { Product, ProductCardData } from '@/src/types/product';

function toCardData(product: Product): ProductCardData {
  return {
    id: product.id,
    brand: product.brand,
    name: product.name,
    sku: product.sku,
    imageUrl: product.imageUrl ?? null,
    eazyScore: product.eazyScore ?? null,
    communityScore: product.communityScore ?? null,
    ratingCount: product.ratingCount ?? 0,
    lowestPrice: product.lowestPrice ?? null,
  };
}

function matchesQuery(product: Product, query: string): boolean {
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
  // Mimics the async load Supabase will introduce so loading/error UI is
  // exercised now and the TanStack Query swap (Task 10+) is a drop-in.
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [loadAttempt]);

  const results = mockProducts.filter((product) => matchesQuery(product, query));

  return (
    <Screen scroll>
      <View className="pt-4">
        <AppText variant="title">Browse</AppText>
      </View>

      <Input
        className="mt-4"
        placeholder="Search brand, name, or SKU"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search products"
      />

      <View className="mt-3 flex-row gap-3">
        <Button label="Filter" variant="secondary" disabled className="flex-1" />
        <Button label="Sort" variant="secondary" disabled className="flex-1" />
      </View>

      {isLoading ? (
        <LoadingState message="Loading products..." />
      ) : loadFailed ? (
        <ErrorState
          title="Could not load products"
          onRetry={() => {
            setLoadFailed(false);
            setIsLoading(true);
            setLoadAttempt((attempt) => attempt + 1);
          }}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="No products found"
          message="Try a different brand, name, or SKU."
        />
      ) : (
        <View className="mt-4 gap-3">
          {results.map((product) => (
            <ProductCard
              key={product.id}
              product={toCardData(product)}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))}
          <AppText variant="caption" className="py-3 text-center">
            You have reached the end — more products load here once the catalog grows.
          </AppText>
        </View>
      )}
    </Screen>
  );
}
