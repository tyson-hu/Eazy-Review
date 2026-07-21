import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** When set, rendered below scroll/body with bottom safe-area inset. */
  footer?: ReactNode;
  /** Horizontal content padding. Default true. */
  padded?: boolean;
  /**
   * Apply top safe-area inset. Default false — navigator headers already
   * clear the status bar. Opt in for headerless surfaces.
   */
  safeTop?: boolean;
  className?: string;
  contentClassName?: string;
};

export function Screen({
  children,
  scroll = false,
  footer,
  padded = true,
  safeTop = false,
  className,
  contentClassName,
}: ScreenProps) {
  const horizontalPad = padded ? 'px-4' : '';
  const edges: Edge[] = [];
  if (safeTop) {
    edges.push('top');
  }
  if (footer) {
    edges.push('bottom');
  }

  if (scroll || footer) {
    return (
      <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`} edges={edges}>
        <ScrollView
          className="flex-1"
          contentContainerClassName={`${horizontalPad} pb-6 ${contentClassName ?? ''}`}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`} edges={edges}>
      <View className={`flex-1 ${horizontalPad} ${contentClassName ?? ''}`}>{children}</View>
    </SafeAreaView>
  );
}
