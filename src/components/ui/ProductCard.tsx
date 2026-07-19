import { Image, Platform, Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import { resolveProductImageSource } from '@/src/features/products/mockProductImages';
import type { ProductCardData } from '@/src/types/product';

type ProductCardProps = {
  product: ProductCardData;
  onPress?: () => void;
};

// Preserve the single allowed product shadow with the platform-native API.
const productImageShadow = Platform.select({
  web: { boxShadow: '3px 5px 30px rgba(0, 0, 0, 0.22)' },
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 15,
    elevation: 6,
  },
});

export function ProductCard({ product, onPress }: ProductCardProps) {
  const imageSource = resolveProductImageSource(product.imageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.brand} ${product.name}`}
      onPress={onPress}
      className="rounded-card border border-border bg-card p-6"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
      {/* Shadow + bg on outer wrapper (Android elevation); overflow-hidden only on the clip. */}
      <View className="rounded-card bg-background" style={productImageShadow}>
        <View className="h-40 items-center justify-center overflow-hidden rounded-card">
          {imageSource ? (
            <Image
              source={imageSource}
              resizeMode="contain"
              style={{ width: '100%', height: '100%' }}
              accessible={false}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <AppText variant="caption">Image coming soon</AppText>
          )}
        </View>
      </View>

      <AppText variant="label" className="mt-5">
        {product.brand}
      </AppText>
      <AppText variant="subtitle" className="mt-1">
        {product.name}
      </AppText>
      {product.sku ? (
        <AppText variant="caption" className="mt-1">
          {product.sku}
        </AppText>
      ) : null}

      <View className="mt-5 flex-row gap-5">
        <ScoreBadge label="Eazy Score" score={product.eazyScore} className="flex-1" />
        <ScoreBadge label="Community Score" score={product.communityScore} className="flex-1" />
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <AppText variant="caption">Lowest price</AppText>
        <AppText className="text-lg font-semibold">
          {product.lowestPrice == null ? '—' : `$${product.lowestPrice}`}
        </AppText>
      </View>
    </Pressable>
  );
}
