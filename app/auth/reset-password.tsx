import { Link, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/LoadingState';
import { Screen } from '@/src/components/ui/Screen';
import { updatePasswordFromRecovery } from '@/src/features/auth/api';
import {
  AUTH_USER_MESSAGES,
  getAuthErrorMessage,
} from '@/src/features/auth/errors';
import { useAuth } from '@/src/features/auth/hooks';
import { validateNewPasswordPair } from '@/src/features/auth/password';

/**
 * Recovery completion route and deep-link target.
 * Enables the password form only for a verified PASSWORD_RECOVERY session.
 * Does not reuse ordinary post-login returnTo navigation.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { status, recoveryPhase, clearRecoveryPhase, isSignedIn } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Clear secrets when leaving the screen.
  useEffect(() => {
    return () => {
      setPassword('');
      setConfirmPassword('');
    };
  }, []);

  const onSubmit = async () => {
    if (pending || recoveryPhase !== 'verified') {
      return;
    }

    const validation = validateNewPasswordPair(password, confirmPassword);
    if (!validation.ok) {
      if (validation.reason === 'mismatch') {
        setErrorMessage(AUTH_USER_MESSAGES.passwordMismatch);
      } else if (validation.reason === 'too-short') {
        setErrorMessage(AUTH_USER_MESSAGES.passwordTooWeak);
      } else {
        setErrorMessage(AUTH_USER_MESSAGES.passwordTooWeak);
      }
      return;
    }

    setPending(true);
    setErrorMessage(null);
    try {
      await updatePasswordFromRecovery(password);
      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
      clearRecoveryPhase();
    } catch (error) {
      // Preserve field values on recoverable failure so the user can retry.
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const showLoading =
    status === 'initializing' || recoveryPhase === 'processing';

  const showForm = !showLoading && recoveryPhase === 'verified' && !success;

  const showUnavailable = !showLoading && !success && !showForm;

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          title: 'Reset password',
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />

      <View className="mt-4 gap-2">
        <AppText variant="title">Reset password</AppText>
        {showForm ? (
          <AppText variant="caption">
            Choose a new password for your account.
          </AppText>
        ) : null}
      </View>

      {showLoading ? (
        <View className="mt-8" testID="reset-password-loading">
          <LoadingState message="Verifying reset link..." />
        </View>
      ) : null}

      {success ? (
        <Card className="mt-6 gap-3" testID="reset-password-success">
          <AppText variant="subtitle">Password updated</AppText>
          <AppText variant="body">
            {AUTH_USER_MESSAGES.passwordUpdateSuccess}
          </AppText>
          <AppText variant="caption">
            You can continue with your account using the new password.
          </AppText>
          <Button
            testID="reset-password-go-account"
            label={isSignedIn ? 'Go to Account' : 'Sign in'}
            onPress={() => {
              if (isSignedIn) {
                router.dismissTo('/(tabs)/account' as never);
              } else {
                router.replace('/auth/sign-in' as never);
              }
            }}
          />
        </Card>
      ) : null}

      {showUnavailable ? (
        <Card className="mt-6 gap-3" testID="reset-password-unavailable">
          <AppText variant="subtitle">Link not valid</AppText>
          <AppText
            testID="reset-password-unavailable-copy"
            variant="body">
            {AUTH_USER_MESSAGES.recoveryLinkInvalid}
          </AppText>
          <Link href="/auth/forgot-password" asChild>
            <Button
              testID="reset-password-request-new"
              label="Request a new password-reset email"
            />
          </Link>
          <Link href="/auth/sign-in" asChild>
            <Button
              testID="reset-password-sign-in"
              label="Back to sign in"
              variant="ghost"
            />
          </Link>
        </Card>
      ) : null}

      {showForm ? (
        <Card className="mt-6 gap-4" testID="reset-password-form">
          <View className="gap-2">
            <AppText variant="label">New password</AppText>
            <Input
              testID="reset-password-new"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="New password"
              editable={!pending}
              accessibilityLabel="New password"
              invalid={Boolean(errorMessage)}
            />
          </View>

          <View className="gap-2">
            <AppText variant="label">Confirm password</AppText>
            <Input
              testID="reset-password-confirm"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Confirm password"
              editable={!pending}
              accessibilityLabel="Confirm password"
              invalid={Boolean(errorMessage)}
            />
          </View>

          {errorMessage ? (
            <AppText
              testID="reset-password-error"
              variant="caption"
              className="text-accent"
              accessibilityRole="alert">
              {errorMessage}
            </AppText>
          ) : null}

          <Button
            testID="reset-password-submit"
            label="Update password"
            onPress={() => {
              void onSubmit();
            }}
            loading={pending}
            disabled={pending || !password || !confirmPassword}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
