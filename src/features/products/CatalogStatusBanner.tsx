import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';

type CatalogStatusBannerProps = {
  title: string;
  message?: string;
  onRetry?: () => void;
};

export function CatalogStatusBanner({
  title,
  message,
  onRetry,
}: CatalogStatusBannerProps) {
  return (
    <View className="mt-4 rounded-card border border-border bg-card px-4 py-3">
      <AppText variant="body">{title}</AppText>
      {message ? (
        <AppText variant="caption" className="mt-1">
          {message}
        </AppText>
      ) : null}
      {onRetry ? (
        <Button
          className="mt-3"
          label="Try again"
          variant="secondary"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}
