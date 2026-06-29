import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again in a moment.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <AppText variant="subtitle" className="text-center text-negative">
        {title}
      </AppText>
      <AppText variant="caption" className="mt-2 max-w-xs text-center">
        {message}
      </AppText>
      {onRetry ? (
        <View className="mt-4 w-full max-w-xs">
          <Button label="Try again" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
