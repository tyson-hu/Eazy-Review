import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

type HeaderBackButtonProps = {
  /** From Stack headerLeft props; hide when there is nothing to pop. */
  canGoBack?: boolean;
};

/**
 * Replaces Expo Router's default web header back <a>, which can expose a
 * confusing accessible name (e.g. "(tabs), back") and a wrong href.
 * Uses history back with a plain "Back" accessibility label.
 */
export function HeaderBackButton({ canGoBack = true }: HeaderBackButtonProps) {
  const router = useRouter();

  if (!canGoBack) {
    return null;
  }

  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      className="h-10 w-10 items-center justify-center">
      <SymbolView
        name={{
          ios: 'chevron.left',
          android: 'arrow_back',
          web: 'arrow_back',
        }}
        tintColor="#111827"
        size={22}
      />
    </Pressable>
  );
}
