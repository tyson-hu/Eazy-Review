import type { ReactNode, Ref } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
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
  /** Forwarded to the inner ScrollView when `scroll` or `footer` is set. */
  scrollRef?: Ref<ScrollView>;
  className?: string;
  contentClassName?: string;
};

export function Screen({
  children,
  scroll = false,
  footer,
  padded = true,
  safeTop = false,
  scrollRef,
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
    const scrollProps: Pick<
      ScrollViewProps,
      | 'keyboardShouldPersistTaps'
      | 'keyboardDismissMode'
      | 'automaticallyAdjustKeyboardInsets'
      | 'showsVerticalScrollIndicator'
    > = {
      keyboardShouldPersistTaps: 'handled',
      keyboardDismissMode: 'on-drag',
      // iOS: inset the scroll content by the keyboard overlap so focused
      // fields and trailing actions can scroll above the soft keyboard.
      // Prefer this over KeyboardAvoidingView padding on scroll screens —
      // stacking both double-shrinks the viewport.
      automaticallyAdjustKeyboardInsets: true,
      showsVerticalScrollIndicator: false,
    };

    return (
      <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`} edges={edges}>
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName={`${horizontalPad} pb-6 ${contentClassName ?? ''}`}
          {...scrollProps}>
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
