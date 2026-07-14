import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Card } from '@/src/components/ui/Card';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Screen } from '@/src/components/ui/Screen';
import { getMockProductDetailById } from '@/src/features/products/mockProductDetails';

export default function RateProductPlaceholderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = typeof id === 'string' ? getMockProductDetailById(id) : null;

  if (!detail) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Rate' }} />
        <EmptyState title="Product not found" message="This product is not in the catalog." />
      </Screen>
    );
  }

  const { product } = detail;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Rate' }} />

      <View className="mt-4">
        <AppText variant="label">{product.brand}</AppText>
        <AppText variant="title" className="mt-1">
          {product.name}
        </AppText>
      </View>

      <Card className="mt-4">
        <AppText variant="body">
          The rating form arrives in Task 9. This screen is a navigation placeholder only.
        </AppText>
      </Card>
    </Screen>
  );
}
