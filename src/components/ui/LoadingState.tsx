import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View className="flex-1 items-center justify-center py-12">
      <ActivityIndicator size="large" color="#2563EB" />
      <AppText variant="caption" className="mt-4">
        {message}
      </AppText>
    </View>
  );
}
