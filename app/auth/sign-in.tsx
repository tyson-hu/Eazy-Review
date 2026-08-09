import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { HeaderBackButton } from '@/src/components/ui/HeaderBackButton';
import { Input } from '@/src/components/ui/Input';
import { Screen } from '@/src/components/ui/Screen';
import {
  AUTH_USER_MESSAGES,
  getAuthErrorMessage,
} from '@/src/features/auth/errors';
import { useAuth } from '@/src/features/auth/hooks';
import {
  dismissAuthToReturnPath,
  sanitizeReturnPath,
} from '@/src/features/auth/returnPath';

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const returnTo = sanitizeReturnPath(params.returnTo);
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    if (pending) {
      return;
    }
    setPending(true);
    setErrorMessage(null);
    try {
      const result = await signIn({ email, password });
      setPassword('');
      // Superseded: a newer auth transition won — stay on Sign In, no dismiss.
      if (result.kind === 'superseded') {
        setErrorMessage(AUTH_USER_MESSAGES.authStateChanged);
        return;
      }
      // Unwind auth routes to the existing destination — do not replace-forward
      // onto a new Product instance (duplicate stack).
      dismissAuthToReturnPath(router, returnTo);
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
          title: 'Sign in',
          headerLeft: ({ canGoBack }) => (
            <HeaderBackButton canGoBack={canGoBack} />
          ),
        }}
      />

      <View className="mt-4 gap-2">
        <AppText variant="title">Sign in</AppText>
        <AppText variant="caption">
          Sign in to access your account and prepare for saved ratings.
        </AppText>
      </View>

      <Card className="mt-6 gap-4">
        <View className="gap-2">
          <AppText variant="label">Email</AppText>
          <Input
            testID="sign-in-email"
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
            testID="sign-in-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="password"
            textContentType="password"
            placeholder="Password"
            editable={!pending}
            accessibilityLabel="Password"
            invalid={Boolean(errorMessage)}
          />
        </View>

        {errorMessage ? (
          <AppText
            testID="sign-in-error"
            variant="caption"
            className="text-accent"
            accessibilityRole="alert">
            {errorMessage}
          </AppText>
        ) : null}

        <Button
          testID="sign-in-submit"
          label="Sign in"
          onPress={() => {
            void onSubmit();
          }}
          loading={pending}
          disabled={pending || !email.trim() || !password}
        />

        <Link
          href={{
            pathname: '/auth/sign-up',
            params: { returnTo },
          }}
          asChild>
          <Button
            testID="sign-in-create-account"
            label="Create account"
            variant="ghost"
            disabled={pending}
          />
        </Link>
      </Card>
    </Screen>
  );
}
