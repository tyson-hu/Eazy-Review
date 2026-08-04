// Keep setup minimal. Silence only expected test noise over time; never hide
// meaningful console errors globally.

// AsyncStorage needs a Jest mock when the native module is unavailable.
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Jest mock factory
  return require('@react-native-async-storage/async-storage/jest/async-storage-mock');
});
