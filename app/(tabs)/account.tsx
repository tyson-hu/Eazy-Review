import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { Screen } from '@/src/components/ui/Screen';
import {
  formatMemberSince,
} from '@/src/features/account/api';
import { useMyProfileQuery } from '@/src/features/account/queries';
import { useAuth } from '@/src/features/auth/hooks';

export default function AccountScreen() {
  const router = useRouter();
  const { status, user, isSignedIn, signOut } = useAuth();
  const profileQuery = useMyProfileQuery();

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
          <AppText variant="title" className="text-center">
            Your Eazy Review account
          </AppText>
          <AppText variant="caption" className="mt-3 max-w-xs text-center">
            Sign in to save ratings and access your account.
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
            You can keep browsing without signing in. Saved ratings are not
            available yet.
          </AppText>
        </Card>
      </Screen>
    );
  }

  const displayName = profileQuery.data?.displayName;
  const joinedLabel = profileQuery.data
    ? formatMemberSince(profileQuery.data.joinedAt)
    : null;

  return (
    <Screen scroll>
      <View className="pt-6">
        <AppText variant="title">Account</AppText>
        <AppText testID="account-email" variant="subtitle" className="mt-3">
          {user.email ?? 'Signed in'}
        </AppText>
        {displayName ? (
          <AppText testID="account-display-name" variant="body" className="mt-1">
            {displayName}
          </AppText>
        ) : null}
        {joinedLabel ? (
          <AppText testID="account-joined" variant="caption" className="mt-2">
            Member since {joinedLabel}
          </AppText>
        ) : null}
      </View>

      {profileQuery.isPending && !profileQuery.data ? (
        <Card className="mt-6">
          <LoadingState message="Loading profile..." />
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

      <Card className="mt-8 gap-3">
        <AppText variant="caption">
          Rating save is not connected yet. You can still browse the catalog.
        </AppText>
        <Button
          testID="account-sign-out"
          label="Sign out"
          variant="secondary"
          onPress={() => {
            void signOut();
          }}
        />
      </Card>
    </Screen>
  );
}
