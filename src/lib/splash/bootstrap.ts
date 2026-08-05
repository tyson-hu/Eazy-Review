import * as SplashScreen from 'expo-splash-screen';

/** Starts splash dismissal before synchronous app bootstrap can throw. */
export function hideSplashScreenBeforeBootstrap(): void {
  void SplashScreen.hideAsync();
}
