import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import { AUTH_USER_MESSAGES, getAuthErrorMessage } from '@/src/features/auth/errors';
import { useAuth } from '@/src/features/auth/hooks';
import { sanitizeReturnPath } from '@/src/features/auth/returnPath';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = sanitizeReturnPath(params.returnTo);
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );

  const onSubmit = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    setErrorMessage(null);
    setConfirmationEmail(null);
    try {
      const result = await signUp({ email, password });
      setPassword('');
      if (result.kind === 'confirmation-required') {
        setConfirmationEmail(result.email);
        return;
      }
      router.replace(returnTo as never);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          title: 'Create account',
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />

      <View className="mt-4 gap-2">
        <AppText variant="title">Create account</AppText>
        <AppText variant="caption">
          Create an account to rate products later. Ratings are not saved yet.
        </AppText>
      </View>

      {confirmationEmail ? (
        <Card className="mt-6 gap-3" testID="sign-up-confirmation">
          <AppText variant="subtitle">Confirm your email</AppText>
          <AppText variant="body">
            {AUTH_USER_MESSAGES.confirmationRequired}
          </AppText>
          <AppText variant="caption">
            We sent a confirmation message if the address is valid. You are not
            signed in yet.
          </AppText>
          <Link
            href={{
              pathname: '/auth/sign-in',
              params: { returnTo },
            }}
            asChild>
            <Button label="Back to sign in" />
          </Link>
        </Card>
      ) : (
        <Card className="mt-6 gap-4">
          <View className="gap-2">
            <AppText variant="label">Email</AppText>
            <Input
              testID="sign-up-email"
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

          <View className="gap-2">
            <AppText variant="label">Password</AppText>
            <Input
              testID="sign-up-password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Password"
              editable={!pending}
              accessibilityLabel="Password"
              invalid={Boolean(errorMessage)}
            />
          </View>

          {errorMessage ? (
            <AppText
              testID="sign-up-error"
              variant="caption"
              className="text-accent"
              accessibilityRole="alert">
              {errorMessage}
            </AppText>
          ) : null}

          <Button
            testID="sign-up-submit"
            label="Create account"
            onPress={() => {
              void onSubmit();
            }}
            loading={pending}
            disabled={pending || !email.trim() || !password}
          />

          <Link
            href={{
              pathname: '/auth/sign-in',
              params: { returnTo },
            }}
            asChild>
            <Button
              testID="sign-up-sign-in"
              label="Sign in"
              variant="ghost"
              disabled={pending}
            />
          </Link>
        </Card>
      )}
    </Screen>
  );
}
