import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';

type LoadingStateProps = {
  message?: string;
  /**
   * Use flex fill for full-screen shells. Prefer `false` inside cards or
   * scrollable stacks so large Dynamic Type is not clipped by flex chrome.
   */
  fill?: boolean;
};

export function LoadingState({
  message = 'Loading...',
  fill = true,
}: LoadingStateProps) {
  return (
    <View
      className={`${fill ? 'flex-1' : ''} items-center justify-center py-12`}>
      <ActivityIndicator size="large" color="#0066cc" />
      <AppText variant="caption" className="mt-4 text-center">
        {message}
      </AppText>
    </View>
  );
}
