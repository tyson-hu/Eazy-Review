import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { requestPasswordReset } from '@/src/features/auth/api';
import { isValidEmailFormat } from '@/src/features/auth/email';
import {
  AUTH_USER_MESSAGES,
  getAuthErrorMessage,
} from '@/src/features/auth/errors';

/**
 * Recovery-request only. Completion lives on `/auth/reset-password`.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    if (pending) {
      return;
    }
    if (!isValidEmailFormat(email)) {
      setErrorMessage(AUTH_USER_MESSAGES.invalidEmail);
      setSubmitted(false);
      return;
    }

    setPending(true);
    setErrorMessage(null);
    try {
      await requestPasswordReset(email);
      // Non-enumerating confirmation regardless of whether the email maps to an account.
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          title: 'Forgot password',
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />

      <View className="mt-4 gap-2">
        <AppText variant="title">Forgot password</AppText>
        <AppText variant="caption">
          Enter the email for your Eazy Review account. We will send reset
          instructions when an account exists for that address.
        </AppText>
      </View>

      {submitted ? (
        <Card className="mt-6 gap-3" testID="forgot-password-success">
          <AppText variant="subtitle">Check your email</AppText>
          <AppText testID="forgot-password-success-copy" variant="body">
            {AUTH_USER_MESSAGES.recoveryRequestSent}
          </AppText>
          <Link href="/auth/sign-in" asChild>
            <Button testID="forgot-password-back-sign-in" label="Back to sign in" />
          </Link>
        </Card>
      ) : (
        <Card className="mt-6 gap-4">
          <View className="gap-2">
            <AppText variant="label">Email</AppText>
            <Input
              testID="forgot-password-email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              editable={!pending}
              accessibilityLabel="Email"
              invalid={Boolean(errorMessage)}
              errorMessage={errorMessage ?? undefined}
            />
          </View>

          {errorMessage ? (
            <AppText
              testID="forgot-password-error"
              variant="caption"
              className="text-accent"
              accessibilityRole="alert">
              {errorMessage}
            </AppText>
          ) : null}

          <Button
            testID="forgot-password-submit"
            label="Send reset link"
            onPress={() => {
              void onSubmit();
            }}
            loading={pending}
            disabled={pending || !email.trim()}
          />

          <Link href="/auth/sign-in" asChild>
            <Button
              testID="forgot-password-sign-in"
              label="Back to sign in"
              variant="ghost"
              disabled={pending}
            />
          </Link>
        </Card>
      )}
    </Screen>
  );
}
