import { Image, Pressable, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { ScoreBadge } from '@/src/components/ui/ScoreBadge';
import type { ProductCardData } from '@/src/types/product';

type ProductCardProps = {
  product: ProductCardData;
  onPress?: () => void;
};

export function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${product.brand} ${product.name}`}
      onPress={onPress}
      className="rounded-card border border-border bg-card p-4 active:opacity-80">
      <View className="h-40 items-center justify-center overflow-hidden rounded-card bg-background">
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            className="h-full w-full"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <AppText variant="caption">Image coming soon</AppText>
        )}
      </View>

      <AppText variant="label" className="mt-3">
        {product.brand}
      </AppText>
      <AppText variant="subtitle" className="mt-0.5">
        {product.name}
      </AppText>
      {product.sku ? (
        <AppText variant="caption" className="mt-0.5">
          {product.sku}
        </AppText>
      ) : null}

      <View className="mt-3 flex-row gap-3">
        <ScoreBadge label="Eazy Score" score={product.eazyScore} className="flex-1" />
        <ScoreBadge label="Community Score" score={product.communityScore} className="flex-1" />
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <AppText variant="caption">Lowest price</AppText>
        <AppText className="text-lg font-bold">
          {product.lowestPrice == null ? '—' : `$${product.lowestPrice}`}
        </AppText>
      </View>
    </Pressable>
  );
}
