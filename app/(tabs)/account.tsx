import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ErrorState } from '@/src/components/ui/ErrorState';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { Screen } from '@/src/components/ui/Screen';
import { formatMemberSince } from '@/src/features/account/api';
import { useMyProfileQuery } from '@/src/features/account/queries';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import { useAuth } from '@/src/features/auth/hooks';
import type { DeleteAccountOutcome } from '@/src/features/auth/types';
import { useUserRatedProductsQuery } from '@/src/features/ratings/queries';

/** Prefix `@` only when the stored username does not already start with one. */
function formatUsername(username: string): string {
  return username.startsWith('@') ? username : `@${username}`;
}

type DeletionNotice = Exclude<DeleteAccountOutcome['kind'], 'superseded'>;

const deletionMessages: Record<DeletionNotice, string> = {
  deleted:
    'Your account was deleted. You can continue browsing Eazy Review without an account.',
  'not-deleted-signed-out':
    'Your account was not deleted. All sessions were signed out. Sign in again to retry.',
  'unconfirmed-signed-out':
    "We couldn't confirm whether account deletion finished. Sign in again. If your account is still available, you can retry deletion.",
};

export default function AccountScreen() {
  const router = useRouter();
  const { status, user, isSignedIn, signOut, deleteAccount } = useAuth();
  const profileQuery = useMyProfileQuery();
  const ratedProductsQuery = useUserRatedProductsQuery();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletionNotice, setDeletionNotice] =
    useState<DeletionNotice | null>(null);
  const priorPrincipalRef = useRef<string | null>(user?.id ?? null);
  const [deleteOwnerPrincipalId, setDeleteOwnerPrincipalId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const nextPrincipal = user?.id ?? null;
    if (priorPrincipalRef.current === nextPrincipal) return;
    priorPrincipalRef.current = nextPrincipal;
    queueMicrotask(() => {
      if (priorPrincipalRef.current !== nextPrincipal) return;
      if (nextPrincipal != null) setDeletionNotice(null);
      setDeleteOpen(false);
      setCurrentPassword('');
      setDeleteError(null);
      setDeleteOwnerPrincipalId(null);
    });
  }, [user?.id]);

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

        {deletionNotice ? (
          <AppText
            testID="account-delete-outcome"
            variant="caption"
            className="mt-6 text-center"
            accessibilityRole="alert">
            {deletionMessages[deletionNotice]}
          </AppText>
        ) : null}

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
          <Button
            testID="account-forgot-password"
            label="Forgot password?"
            variant="ghost"
            onPress={() => {
              router.push('/auth/forgot-password');
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
  const isDeletionFormVisible =
    deleteOpen && deleteOwnerPrincipalId === user.id;

  const onSignOut = async () => {
    if (signingOut || deletePending) {
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

  const onDeleteAccount = async () => {
    if (
      signingOut ||
      deletePending ||
      currentPassword.length === 0 ||
      deleteOwnerPrincipalId !== user.id
    ) {
      return;
    }
    setDeletePending(true);
    setDeleteError(null);
    try {
      const outcome = await deleteAccount(currentPassword);
      setDeleteOwnerPrincipalId(null);
      setCurrentPassword('');
      setDeleteOpen(false);
      if (outcome.kind !== 'superseded') {
        setDeletionNotice(outcome.kind);
      }
    } catch (error) {
      setDeleteError(
        error instanceof AuthError
          ? error.message
          : AUTH_USER_MESSAGES.accountDeletionFailed,
      );
    } finally {
      setDeletePending(false);
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
          disabled={signingOut || deletePending}
          onPress={() => {
            void onSignOut();
          }}
        />
      </Card>

      <Card className="mt-4 gap-3">
        <Button
          testID="account-delete-open"
          label="Delete Account"
          variant="secondary"
          disabled={signingOut || deletePending}
          onPress={() => {
            if (signingOut || deletePending) return;
            setDeleteOwnerPrincipalId(user.id);
            setCurrentPassword('');
            setDeleteOpen(true);
            setDeleteError(null);
          }}
        />
      </Card>

      {isDeletionFormVisible ? (
        <Card testID="account-delete-confirmation" className="mt-4 gap-3">
          <AppText testID="account-delete-copy" variant="body">
            Your Eazy Review account, your My Rating entries, and private notes
            will be permanently deleted. Public product information will remain.
            Each affected Community Score will be recalculated without your
            rating. This cannot be undone.
          </AppText>
          <Input
            testID="account-delete-password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            accessibilityLabel="Current password"
            editable={!signingOut && !deletePending}
            invalid={deleteError != null}
            errorMessage={deleteError ?? undefined}
          />
          {deleteError ? (
            <AppText
              testID="account-delete-error"
              variant="caption"
              className="text-accent"
              accessibilityRole="alert">
              {deleteError}
            </AppText>
          ) : null}
          <Button
            testID="account-delete-cancel"
            label="Cancel"
            variant="secondary"
            disabled={signingOut || deletePending}
            onPress={() => {
              setDeleteOwnerPrincipalId(null);
              setDeleteOpen(false);
              setCurrentPassword('');
              setDeleteError(null);
            }}
          />
          <Button
            testID="account-delete-submit"
            label="Delete my account"
            variant="destructive"
            loading={deletePending}
            disabled={
              signingOut || deletePending || currentPassword.length === 0
            }
            accessibilityLabel="Delete my account"
            onPress={() => {
              void onDeleteAccount();
            }}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
