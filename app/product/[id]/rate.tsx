import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { EmptyState } from '@/src/components/ui/EmptyState';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { Screen } from '@/src/components/ui/Screen';
import { useAuth } from '@/src/features/auth/hooks';
import { productDetailReturnPath } from '@/src/features/auth/returnPath';

/**
 * Task 16 Rate gate only. Does not display a functional rating form or write
 * `user_ratings`. Task 17 owns durable My Rating.
 */
export default function RateProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === 'string' ? id : '';
  const { status, isSignedIn } = useAuth();

  useEffect(() => {
    if (status === 'initializing') {
      return;
    }
    if (!isSignedIn && productId) {
      router.replace({
        pathname: '/auth/sign-in',
        params: { returnTo: productDetailReturnPath(productId) },
      });
    }
  }, [isSignedIn, productId, router, status]);

  if (status === 'initializing' || (!isSignedIn && productId)) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: 'Rate',
            headerLeft: ({ canGoBack }) => (
              <HeaderBackButton canGoBack={canGoBack} />
            ),
          }}
        />
        <LoadingState message="Checking account..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Rate',
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />
      <EmptyState
        title={"Rating isn't available yet."}
        message="Saved ratings will be connected in the next milestone."
      />
    </Screen>
  );
}
