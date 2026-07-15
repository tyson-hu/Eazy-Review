import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
};

export function Screen({
  children,
  scroll = false,
  className,
  contentClassName,
}: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`} edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName={`px-4 pb-6 ${contentClassName ?? ''}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`} edges={['top']}>
      <View className={`flex-1 px-4 ${contentClassName ?? ''}`}>{children}</View>
    </SafeAreaView>
  );
}
