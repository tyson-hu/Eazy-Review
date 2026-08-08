import { Stack } from 'expo-router';

import { EmptyState } from '@/src/components/ui/EmptyState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Screen } from '@/src/components/ui/Screen';

/**
 * Connected catalog products use Supabase UUIDs. Mock session rating persistence
 * was removed in Task 15 (no product-ID mock map, no fake save success).
 * Tasks 16–17 own authentic sign-in and durable My Rating.
 */
export default function RateProductScreen() {
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Rate',
          headerLeft: ({ canGoBack }) => <HeaderBackButton canGoBack={canGoBack} />,
        }}
      />
      <EmptyState
        title="Rating unavailable"
        message="Sign-in and My Rating persistence are not connected yet. Browse and Product Detail stay open without a mock save."
      />
    </Screen>
  );
}
