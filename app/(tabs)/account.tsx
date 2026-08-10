import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { Screen } from '@/src/components/ui/Screen';
import { formatMemberSince } from '@/src/features/account/api';
import { useMyProfileQuery } from '@/src/features/account/queries';
import { AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import { useAuth } from '@/src/features/auth/hooks';
import { useUserRatedProductsQuery } from '@/src/features/ratings/queries';

/** Prefix `@` only when the stored username does not already start with one. */
function formatUsername(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

export default function AccountScreen() {
  const router = useRouter();
  const { status, user, isSignedIn, signOut } = useAuth();
  const profileQuery = useMyProfileQuery();
  const ratedProductsQuery = useUserRatedProductsQuery();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (status === 'initializing') {
    return (
      <Screen>
        <LoadingState message="Checking account..." />
      </Screen>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <Screen scroll>
        <View className="items-center pt-8">
          <Image
            testID="account-app-logo"
            source={require('../../assets/images/icon.png')}
            resizeMode="contain"
            className="h-16 w-16 rounded-2xl"
            accessible={false}
          />
          <AppText variant="title" className="mt-4 text-center">
            Eazy Review
          </AppText>
          <AppText variant="caption" className="mt-3 max-w-xs text-center">
            Sign in to access your account.
          </AppText>
          <AppText variant="caption" className="mt-2 max-w-xs text-center">
            Save ratings and revisit products you have rated.
          </AppText>
        </View>

        <Card className="mt-8 gap-3">
          <Button
            testID="account-sign-in"
            label="Sign in"
            onPress={() => {
              router.push({
                pathname: '/auth/sign-in',
                params: { returnTo: '/(tabs)/account' },
              });
            }}
          />
          <Button
            testID="account-create-account"
            label="Create account"
            variant="secondary"
            onPress={() => {
              router.push({
                pathname: '/auth/sign-up',
                params: { returnTo: '/(tabs)/account' },
              });
            }}
          />
          <AppText variant="caption" className="text-center">
            You can keep browsing without signing in.
          </AppText>
        </Card>
      </Screen>
    );
  }

  const avatarUrl = profileQuery.data?.avatarUrl?.trim() || null;
  const displayName = profileQuery.data?.displayName?.trim() || null;
  const username = profileQuery.data?.username?.trim() || null;
  const joinedLabel = profileQuery.data
    ? formatMemberSince(profileQuery.data.joinedAt)
    : null;
  const ratedCount = ratedProductsQuery.data?.length;
  const ratedCountLabel =
    ratedCount === undefined
      ? ratedProductsQuery.isPending
        ? '…'
        : ratedProductsQuery.isError
          ? '—'
          : '0'
      : String(ratedCount);

  const onSignOut = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch {
      // Never surface raw SDK text; always the fixed Task 16 copy.
      setSignOutError(AUTH_USER_MESSAGES.signOutFailed);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen scroll>
      <View className="pt-6">
        <AppText variant="title">Account</AppText>
        {avatarUrl ? (
          <Image
            testID="account-avatar"
            source={{ uri: avatarUrl }}
            resizeMode="cover"
            className="mt-4 h-16 w-16 rounded-full"
            accessible={false}
          />
        ) : null}
        {displayName ? (
          <AppText
            testID="account-display-name"
            variant="subtitle"
            className="mt-3">
            {displayName}
          </AppText>
        ) : null}
        {username ? (
          <AppText
            testID="account-username"
            variant="caption"
            className={displayName ? 'mt-1' : 'mt-3'}>
            {formatUsername(username)}
          </AppText>
        ) : null}
        <AppText
          testID="account-email"
          variant="body"
          className={displayName || username || avatarUrl ? 'mt-1' : 'mt-3'}>
          {user.email ?? 'Signed in'}
        </AppText>
        {joinedLabel ? (
          <AppText testID="account-joined" variant="caption" className="mt-2">
            Member since {joinedLabel}
          </AppText>
        ) : null}
      </View>

      {profileQuery.isPending && !profileQuery.data ? (
        <Card className="mt-6">
          <LoadingState fill={false} message="Loading profile..." />
        </Card>
      ) : null}

      {profileQuery.isError && !profileQuery.data ? (
        <Card className="mt-6">
          <ErrorState
            title="Profile unavailable"
            message="You are still signed in. Profile details could not be loaded."
            onRetry={() => {
              void profileQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      {profileQuery.isError && profileQuery.data ? (
        <Card className="mt-4">
          <AppText variant="caption">
            Profile could not be refreshed. Showing the last available details.
          </AppText>
          <Button
            className="mt-3"
            label="Retry"
            variant="secondary"
            onPress={() => {
              void profileQuery.refetch();
            }}
          />
        </Card>
      ) : null}

      <Card className="mt-6 gap-3">
        <AppText variant="label">Rated Products</AppText>
        <AppText testID="account-rated-count" variant="body">
          {ratedCountLabel}{' '}
          {ratedCount === 1 ? 'product rated' : 'products rated'}
        </AppText>
        <Button
          testID="account-rated-products"
          label="Rated Products"
          variant="secondary"
          onPress={() => {
            router.push('/account/rated-products');
          }}
        />
      </Card>

      <Card className="mt-8 gap-3">
        {signOutError ? (
          <AppText
            testID="account-sign-out-error"
            variant="caption"
            className="text-accent"
            accessibilityRole="alert">
            {signOutError}
          </AppText>
        ) : null}
        <Button
          testID="account-sign-out"
          label="Sign out"
          variant="secondary"
          loading={signingOut}
          disabled={signingOut}
          onPress={() => {
            void onSignOut();
          }}
        />
      </Card>
    </Screen>
  );
}
