import * as Linking from 'expo-linking';

import { getEmailConfirmationRedirectTo } from '@/src/features/auth/emailConfirmationRedirect';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `eazyreview://${path}`),
}));

it('creates the native two-slash signup confirmation URL', () => {
  expect(getEmailConfirmationRedirectTo()).toBe(
    'eazyreview://auth/sign-in',
  );
  expect(Linking.createURL).toHaveBeenCalledWith('auth/sign-in');
});
