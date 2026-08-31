import type { UseQueryResult } from '@tanstack/react-query';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import AccountScreen from '@/app/(tabs)/account';
import { formatMemberSince } from '@/src/features/account/api';
import { AUTH_USER_MESSAGES, AuthError } from '@/src/features/auth/errors';
import type { AuthStatus } from '@/src/features/auth/types';
import { renderWithProviders } from '@/src/test/renderWithProviders';
import type { AccountProfile } from '@/src/types/account';

const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockPush = jest.fn();

type MockAuthState = {
  status: AuthStatus;
  user: null | { id: string; email: string };
  isSignedIn: boolean;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
  deleteAccount?: jest.Mock;
};

let mockAuth: MockAuthState = {
  status: 'signed-out',
  user: null,
  isSignedIn: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: mockSignOut,
  deleteAccount: mockDeleteAccount,
};

let mockProfileQuery: Partial<UseQueryResult<AccountProfile, Error>> = {
  data: undefined,
  isPending: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

let mockRatedProductsQuery: Partial<
  UseQueryResult<{ productId: string }[], Error>
> = {
  data: undefined,
  isPending: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), dismissTo: jest.fn() }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/src/features/account/queries', () => ({
  useMyProfileQuery: () => mockProfileQuery,
}));

jest.mock('@/src/features/ratings/queries', () => ({
  useUserRatedProductsQuery: () => mockRatedProductsQuery,
}));

describe('Account screen', () => {
  beforeEach(() => {
    mockAuth = {
      status: 'signed-out',
      user: null,
      isSignedIn: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    };
    mockProfileQuery = {
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    mockRatedProductsQuery = {
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    mockSignOut.mockReset();
    mockDeleteAccount.mockReset();
    mockPush.mockReset();
  });

  it('renders signed-out state with app logo and rating history promise', async () => {
    const rendered = await renderWithProviders(<AccountScreen />);
    expect(rendered.getByTestId('account-app-logo')).toBeTruthy();
    expect(rendered.getByText('Eazy Review')).toBeTruthy();
    expect(rendered.getByText('Sign in to access your account.')).toBeTruthy();
    expect(
      rendered.getByText(
        'Save ratings and revisit products you have rated.',
      ),
    ).toBeTruthy();
    expect(rendered.getByTestId('account-sign-in')).toBeTruthy();
    expect(rendered.getByTestId('account-create-account')).toBeTruthy();
    expect(rendered.getByTestId('account-forgot-password')).toBeTruthy();
    expect(rendered.getByText('You can keep browsing without signing in.')).toBeTruthy();
    await rendered.cleanup();
  });

  it('renders signed-in email, joined date, and sign-out when optional fields are null', async () => {
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    };
    mockProfileQuery = {
      data: {
        id: 'user-a',
        displayName: null,
        username: null,
        avatarUrl: null,
        joinedAt: '2026-08-01T12:00:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    mockRatedProductsQuery = {
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
    mockSignOut.mockResolvedValue(undefined);

    const rendered = await renderWithProviders(<AccountScreen />);
    expect(rendered.getByTestId('account-email').props.children).toBe(
      'a@example.com',
    );
    expect(rendered.getByTestId('account-joined').props.children).toEqual([
      'Member since ',
      formatMemberSince('2026-08-01T12:00:00.000Z'),
    ]);
    expect(rendered.getByTestId('account-rated-count').props.children).toEqual([
      '0',
      ' ',
      'products rated',
    ]);
    expect(rendered.getByTestId('account-rated-products')).toBeTruthy();
    expect(rendered.queryByTestId('account-avatar')).toBeNull();
    expect(rendered.queryByTestId('account-username')).toBeNull();
    expect(rendered.queryByTestId('account-display-name')).toBeNull();

    await fireEvent.press(rendered.getByTestId('account-rated-products'));
    expect(mockPush).toHaveBeenCalledWith('/account/rated-products');

    await fireEvent.press(rendered.getByTestId('account-sign-out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    await rendered.cleanup();
  });

  it('renders full populated profile identity including avatar and username', async () => {
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    };
    mockProfileQuery = {
      data: {
        id: 'user-a',
        displayName: 'Tyson',
        username: 'tyson',
        avatarUrl: 'https://example.com/avatar.jpg',
        joinedAt: '2026-08-01T12:00:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    const rendered = await renderWithProviders(<AccountScreen />);
    expect(rendered.getByTestId('account-display-name').props.children).toBe(
      'Tyson',
    );
    expect(rendered.getByTestId('account-username').props.children).toBe(
      '@tyson',
    );
    expect(rendered.getByTestId('account-email').props.children).toBe(
      'a@example.com',
    );
    expect(rendered.getByTestId('account-joined').props.children).toEqual([
      'Member since ',
      formatMemberSince('2026-08-01T12:00:00.000Z'),
    ]);

    const avatar = rendered.getByTestId('account-avatar');
    expect(avatar).toBeTruthy();
    expect(avatar.props.source).toEqual({
      uri: 'https://example.com/avatar.jpg',
    });
    await rendered.cleanup();
  });

  it('shows pending state and prevents duplicate sign-out taps', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        }),
    );
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    };
    mockProfileQuery = {
      data: {
        id: 'user-a',
        displayName: null,
        username: null,
        avatarUrl: null,
        joinedAt: '2026-08-01T12:00:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    const rendered = await renderWithProviders(<AccountScreen />);
    const button = rendered.getByTestId('account-sign-out');

    await fireEvent.press(button);
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    await fireEvent.press(button);
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    // Button stays disabled while pending.
    expect(
      button.props.accessibilityState?.disabled ?? button.props.disabled,
    ).toBeTruthy();

    await act(async () => {
      resolveSignOut?.();
    });
    await rendered.cleanup();
  });

  it('keeps the user signed in and shows safe error copy when sign-out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('raw supabase session boom'));
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    };
    mockProfileQuery = {
      data: {
        id: 'user-a',
        displayName: null,
        username: null,
        avatarUrl: null,
        joinedAt: '2026-08-01T12:00:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    const rendered = await renderWithProviders(<AccountScreen />);

    await fireEvent.press(rendered.getByTestId('account-sign-out'));

    await waitFor(() =>
      expect(rendered.getByTestId('account-sign-out-error').props.children).toBe(
        AUTH_USER_MESSAGES.signOutFailed,
      ),
    );
    expect(rendered.queryByText(/supabase|session boom/i)).toBeNull();
    // Session mock remains signed-in; failed sign-out must not wipe local auth.
    expect(mockAuth.isSignedIn).toBe(true);
    expect(rendered.getByTestId('account-email').props.children).toBe(
      'a@example.com',
    );

    // Retry is allowed after failure (button re-enabled).
    const button = rendered.getByTestId('account-sign-out');
    expect(
      button.props.accessibilityState?.disabled ?? button.props.disabled,
    ).toBeFalsy();

    mockSignOut.mockResolvedValue(undefined);
    await fireEvent.press(button);
    expect(mockSignOut).toHaveBeenCalledTimes(2);
    await rendered.cleanup();
  });

  it('keeps session when profile fails and allows retry', async () => {
    const refetch = jest.fn();
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    };
    mockProfileQuery = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('timeout'),
      refetch,
    };

    const rendered = await renderWithProviders(<AccountScreen />);
    expect(rendered.getByText('Profile unavailable')).toBeTruthy();
    expect(rendered.getByTestId('account-email').props.children).toBe(
      'a@example.com',
    );
    expect(mockAuth.isSignedIn).toBe(true);

    await fireEvent.press(rendered.getByText('Try again'));
    expect(refetch).toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('does not display account A data for account B', async () => {
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-b', email: 'b@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    };
    mockProfileQuery = {
      data: {
        id: 'user-b',
        displayName: 'Bee',
        username: 'bee',
        avatarUrl: 'https://example.com/bee.jpg',
        joinedAt: '2026-08-02T00:00:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    const rendered = await renderWithProviders(<AccountScreen />);
    await waitFor(() => expect(rendered.getByText('Bee')).toBeTruthy());
    expect(rendered.getByTestId('account-username').props.children).toBe('@bee');
    expect(rendered.getByTestId('account-avatar').props.source).toEqual({
      uri: 'https://example.com/bee.jpg',
    });
    expect(rendered.queryByText('a@example.com')).toBeNull();
    expect(rendered.queryByText('Tyson')).toBeNull();
    expect(rendered.queryByText('@tyson')).toBeNull();
    expect(rendered.getByTestId('account-email').props.children).toBe(
      'b@example.com',
    );
    await rendered.cleanup();
  });

  it('shows Delete Account only signed in and opens exact inline copy without routing', async () => {
    const signedOut = await renderWithProviders(<AccountScreen />);
    expect(signedOut.queryByTestId('account-delete-open')).toBeNull();
    await signedOut.cleanup();

    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    };
    const rendered = await renderWithProviders(<AccountScreen />);
    expect(rendered.getByTestId('account-delete-open')).toBeTruthy();
    expect(rendered.getByTestId('account-sign-out')).toBeTruthy();
    await fireEvent.press(rendered.getByTestId('account-delete-open'));
    expect(
      rendered.getByText(
        'Your Eazy Review account, your My Rating entries, and private notes will be permanently deleted. Public product information will remain. Each affected Community Score will be recalculated without your rating. This cannot be undone.',
      ),
    ).toBeTruthy();
    expect(
      rendered.getByText(
        'To confirm, enter your current password, then tap Delete my account.',
      ),
    ).toBeTruthy();
    expect(rendered.getByTestId('account-delete-password').props.placeholder).toBe(
      'Current password',
    );
    expect(mockPush).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('uses a secure Current password field and passes nonempty bytes unchanged once', async () => {
    mockDeleteAccount.mockResolvedValue({ kind: 'deleted' });
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    };
    const rendered = await renderWithProviders(<AccountScreen />);
    await fireEvent.press(rendered.getByTestId('account-delete-open'));
    const password = rendered.getByTestId('account-delete-password');
    const submit = rendered.getByTestId('account-delete-submit');
    expect(password.props.secureTextEntry).toBe(true);
    expect(password.props.accessibilityLabel).toBe('Current password');
    expect(submit).toBeDisabled();
    await fireEvent.changeText(password, ' password-bytes-a ');
    await waitFor(() =>
      expect(rendered.getByTestId('account-delete-submit')).not.toBeDisabled(),
    );
    await fireEvent.press(rendered.getByTestId('account-delete-submit'));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(mockDeleteAccount).toHaveBeenCalledWith(' password-bytes-a ');
    expect(mockPush).not.toHaveBeenCalled();
    await rendered.cleanup();
  });

  it('disables sign-out, input, cancel, entry, and final action while pending', async () => {
    let resolveDelete!: (value: { kind: 'deleted' }) => void;
    mockDeleteAccount.mockImplementation(
      () => new Promise((resolve) => { resolveDelete = resolve; }),
    );
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    };
    const rendered = await renderWithProviders(<AccountScreen />);
    await fireEvent.press(rendered.getByTestId('account-delete-open'));
    await fireEvent.changeText(
      rendered.getByTestId('account-delete-password'),
      'password-a',
    );
    await waitFor(() =>
      expect(rendered.getByTestId('account-delete-submit')).not.toBeDisabled(),
    );
    await fireEvent.press(rendered.getByTestId('account-delete-submit'));
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    expect(rendered.getByTestId('account-sign-out')).toBeDisabled();
    expect(rendered.getByTestId('account-delete-open')).toBeDisabled();
    expect(rendered.getByTestId('account-delete-cancel')).toBeDisabled();
    expect(rendered.getByTestId('account-delete-submit')).toBeDisabled();
    expect(rendered.getByTestId('account-delete-password').props.editable).toBe(false);
    await fireEvent.press(rendered.getByTestId('account-delete-submit'));
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    await act(async () => resolveDelete({ kind: 'deleted' }));
    await rendered.cleanup();
  });

  it('shows fixed retry copy and honest signed-out outcome copy', async () => {
    mockDeleteAccount.mockRejectedValueOnce(
      new AuthError('account-deletion-failed', AUTH_USER_MESSAGES.accountDeletionFailed),
    );
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    };
    const rendered = await renderWithProviders(<AccountScreen />);
    await fireEvent.press(rendered.getByTestId('account-delete-open'));
    await fireEvent.changeText(
      rendered.getByTestId('account-delete-password'),
      'wrong',
    );
    await waitFor(() =>
      expect(rendered.getByTestId('account-delete-submit')).not.toBeDisabled(),
    );
    await fireEvent.press(rendered.getByTestId('account-delete-submit'));
    await waitFor(() =>
      expect(rendered.getByTestId('account-delete-error').props.children).toBe(
        AUTH_USER_MESSAGES.accountDeletionFailed,
      ),
    );

    mockDeleteAccount.mockResolvedValueOnce({ kind: 'unconfirmed-signed-out' });
    await fireEvent.changeText(
      rendered.getByTestId('account-delete-password'),
      'password-a',
    );
    await waitFor(() =>
      expect(rendered.getByTestId('account-delete-submit')).not.toBeDisabled(),
    );
    await fireEvent.press(rendered.getByTestId('account-delete-submit'));
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(rendered.queryByTestId('account-delete-confirmation')).toBeNull(),
    );
    mockAuth = {
      ...mockAuth,
      status: 'signed-out',
      user: null,
      isSignedIn: false,
    };
    await rendered.rerender(<AccountScreen />);
    await waitFor(() =>
      expect(rendered.getByTestId('account-delete-outcome').props.children).toBe(
        "We couldn't confirm whether account deletion finished. Sign in again. If your account is still available, you can retry deletion.",
      ),
    );
    await rendered.cleanup();
  });

  it('clears A form/password/notice synchronously when B becomes current', async () => {
    mockAuth = {
      status: 'signed-in',
      user: { id: 'user-a', email: 'a@example.com' },
      isSignedIn: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
      deleteAccount: mockDeleteAccount,
    };
    const rendered = await renderWithProviders(<AccountScreen />);
    await fireEvent.press(rendered.getByTestId('account-delete-open'));
    await fireEvent.changeText(
      rendered.getByTestId('account-delete-password'),
      'secret-a',
    );
    mockAuth = {
      ...mockAuth,
      user: { id: 'user-b', email: 'b@example.com' },
    };
    await rendered.rerender(<AccountScreen />);
    await waitFor(() =>
      expect(rendered.getByTestId('account-email').props.children).toBe('b@example.com'),
    );
    expect(rendered.queryByTestId('account-delete-confirmation')).toBeNull();
    expect(rendered.queryByTestId('account-delete-password')).toBeNull();
    await rendered.cleanup();
  });
});

describe('formatMemberSince', () => {
  it('formats deterministically in UTC', () => {
    expect(formatMemberSince('2026-08-15T23:00:00.000Z')).toBe('Aug 2026');
  });
});
