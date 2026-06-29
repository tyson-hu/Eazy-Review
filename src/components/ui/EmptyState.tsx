import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';

type EmptyStateProps = {
  title: string;
  message?: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-8">
      <AppText variant="subtitle" className="text-center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" className="mt-2 max-w-xs text-center">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}
