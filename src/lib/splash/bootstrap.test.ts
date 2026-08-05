jest.mock('expo-splash-screen', () => ({
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- load after native module mock
const SplashScreen = require('expo-splash-screen') as {
  hideAsync: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports -- load after native module mock
const { hideSplashScreenBeforeBootstrap } = require('@/src/lib/splash/bootstrap') as typeof import('@/src/lib/splash/bootstrap');

describe('hideSplashScreenBeforeBootstrap', () => {
  afterEach(() => {
    SplashScreen.hideAsync.mockClear();
  });

  it('starts splash dismissal synchronously', () => {
    hideSplashScreenBeforeBootstrap();

    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});
