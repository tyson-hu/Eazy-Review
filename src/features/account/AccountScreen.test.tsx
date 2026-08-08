import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { UseQueryResult } from '@tanstack/react-query';

import AccountScreen from '@/app/(tabs)/account';
import { formatMemberSince } from '@/src/features/account/api';
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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/src/features/account/queries', () => ({
  useMyProfileQuery: () => mockProfileQuery,
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
    mockSignOut.mockReset();
    mockPush.mockReset();
  });

  it('renders signed-out state', async () => {
    const rendered = await renderWithProviders(<AccountScreen />);
    expect(rendered.getByText('Your Eazy Review account')).toBeTruthy();
    expect(rendered.getByTestId('account-sign-in')).toBeTruthy();
    expect(rendered.getByTestId('account-create-account')).toBeTruthy();
    await rendered.cleanup();
  });

  it('renders signed-in email, joined date, and sign-out', async () => {
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
    expect(rendered.getByTestId('account-email').props.children).toBe(
      'a@example.com',
    );
    expect(rendered.getByTestId('account-joined').props.children).toEqual([
      'Member since ',
      formatMemberSince('2026-08-01T12:00:00.000Z'),
    ]);

    await act(async () => {
      fireEvent.press(rendered.getByTestId('account-sign-out'));
    });
    expect(mockSignOut).toHaveBeenCalled();
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
        username: null,
        avatarUrl: null,
        joinedAt: '2026-08-02T00:00:00.000Z',
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };

    const rendered = await renderWithProviders(<AccountScreen />);
    await waitFor(() => expect(rendered.getByText('Bee')).toBeTruthy());
    expect(rendered.queryByText('a@example.com')).toBeNull();
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
