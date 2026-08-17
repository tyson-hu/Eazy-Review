import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { AppProviders } from '@/src/providers/AppProviders';
import { hideSplashScreenBeforeBootstrap } from '@/src/lib/splash/bootstrap';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Start hiding before AppProviders can synchronously surface a bad public env.
  hideSplashScreenBeforeBootstrap();

  return (
    <AppProviders>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth/sign-in"
          options={{ title: 'Sign in', presentation: 'card' }}
        />
        <Stack.Screen
          name="auth/sign-up"
          options={{ title: 'Create account', presentation: 'card' }}
        />
        <Stack.Screen
          name="auth/forgot-password"
          options={{ title: 'Forgot password', presentation: 'card' }}
        />
        <Stack.Screen
          name="auth/reset-password"
          options={{ title: 'Reset password', presentation: 'card' }}
        />
        <Stack.Screen
          name="account/rated-products"
          options={{ title: 'Rated Products' }}
        />
        <Stack.Screen name="product/[id]/index" options={{ title: 'Product' }} />
        <Stack.Screen name="product/[id]/rate" options={{ title: 'Rate' }} />
      </Stack>
    </AppProviders>
  );
}
