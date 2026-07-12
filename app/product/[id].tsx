import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { Screen } from '@/src/components/ui/Screen';
import { mockProducts } from '@/src/features/products/mockProducts';

// Placeholder route so Browse card taps land somewhere real.
// Task 8 builds the full Product Detail screen here.
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = mockProducts.find((item) => item.id === id);

  if (!product) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Product' }} />
        <EmptyState title="Product not found" message="This product is not in the catalog." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Stack.Screen options={{ title: product.name }} />
      <View className="pt-4">
        <AppText variant="label">{product.brand}</AppText>
        <AppText variant="title" className="mt-1">
          {product.name}
        </AppText>
        {product.sku ? (
          <AppText variant="caption" className="mt-1">
            {product.sku}
          </AppText>
        ) : null}
      </View>

      <View className="mt-4 flex-row gap-3">
        <ScoreBadge label="Eazy Score" score={product.eazyScore} className="flex-1" />
        <ScoreBadge label="Community Score" score={product.communityScore} className="flex-1" />
      </View>

      <Card className="mt-4">
        <AppText variant="subtitle">Full product detail coming soon</AppText>
        <AppText variant="caption" className="mt-1">
          Price by size, rating breakdown, My Rating, and the rate CTA arrive in the next
          milestone.
        </AppText>
      </Card>
    </Screen>
  );
}
