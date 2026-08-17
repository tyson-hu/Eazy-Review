import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { UseQueryResult } from '@tanstack/react-query';

import AccountScreen from '@/app/(tabs)/account';
import { formatMemberSince } from '@/src/features/account/api';
import { AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { AuthStatus } from '@/src/features/auth/types';
import type { AccountProfile } from '@/src/types/account';
import { renderWithProviders } from '@/src/test/renderWithProviders';

const mockSignOut = jest.fn();
const mockPush = jest.fn();

type MockAuthState = {
  status: AuthStatus;
  user: null | { id: string; email: string };
  isSignedIn: boolean;
  signIn: jest.Mock;
  signUp: jest.Mock;
  signOut: jest.Mock;
};

let mockAuth: MockAuthState = {
  status: 'signed-out',
  user: null,
  isSignedIn: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: mockSignOut,
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

    await act(async () => {
      fireEvent.press(rendered.getByTestId('account-rated-products'));
    });
    expect(mockPush).toHaveBeenCalledWith('/account/rated-products');

    await act(async () => {
      fireEvent.press(rendered.getByTestId('account-sign-out'));
    });
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

    await act(async () => {
      fireEvent.press(button);
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(button);
    });
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

    await act(async () => {
      fireEvent.press(rendered.getByTestId('account-sign-out'));
    });

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
    await act(async () => {
      fireEvent.press(button);
    });
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

    await act(async () => {
      fireEvent.press(rendered.getByText('Try again'));
    });
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
});

describe('formatMemberSince', () => {
  it('formats deterministically in UTC', () => {
    expect(formatMemberSince('2026-08-15T23:00:00.000Z')).toBe('Aug 2026');
  });
});
