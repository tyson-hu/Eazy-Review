import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import SignInScreen from '@/app/auth/sign-in';
import SignUpScreen from '@/app/auth/sign-up';
import { AUTH_USER_MESSAGES } from '@/src/features/auth/errors';

const mockDismissTo = jest.fn();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockDismissAuthToReturnPath = jest.fn();

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
  useLocalSearchParams: () => ({
    returnTo: '/product/11111111-1111-4111-8111-111111111111',
  }),
  useRouter: () => ({
    dismissTo: mockDismissTo,
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => ({
    status: 'signed-out',
    user: null,
    isSignedIn: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: jest.fn(),
  }),
}));

jest.mock('@/src/features/auth/returnPath', () => {
  const actual = jest.requireActual<
    typeof import('@/src/features/auth/returnPath')
  >('@/src/features/auth/returnPath');
  return {
    ...actual,
    dismissAuthToReturnPath: (
      ...args: Parameters<typeof actual.dismissAuthToReturnPath>
    ) => mockDismissAuthToReturnPath(...args),
  };
});

describe('auth screens operation results', () => {
  beforeEach(() => {
    mockDismissTo.mockReset();
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockDismissAuthToReturnPath.mockReset();
    mockDismissAuthToReturnPath.mockImplementation(
      (
        router: { dismissTo: (href: never) => void },
        returnTo: string | string[] | undefined | null,
      ) => {
        const actual = jest.requireActual<
          typeof import('@/src/features/auth/returnPath')
        >('@/src/features/auth/returnPath');
        return actual.dismissAuthToReturnPath(router, returnTo);
      },
    );
  });

  it('dismisses after authoritative signed-in signIn', async () => {
    mockSignIn.mockResolvedValue({
      kind: 'signed-in',
      user: { id: 'user-b', email: 'b@example.com' },
    });

    const rendered = await render(<SignInScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('sign-in-email'),
        'b@example.com',
      );
      fireEvent.changeText(
        rendered.getByTestId('sign-in-password'),
        'password1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('sign-in-submit'));
    });

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockDismissAuthToReturnPath).toHaveBeenCalledWith(
        expect.objectContaining({ dismissTo: mockDismissTo }),
        '/product/11111111-1111-4111-8111-111111111111',
      ),
    );
    expect(rendered.queryByTestId('sign-in-error')).toBeNull();

    rendered.unmount();
  });

  it('stays on Sign In and shows safe copy when signIn is superseded', async () => {
    mockSignIn.mockResolvedValue({ kind: 'superseded' });

    const rendered = await render(<SignInScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('sign-in-email'),
        'b@example.com',
      );
      fireEvent.changeText(
        rendered.getByTestId('sign-in-password'),
        'password1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('sign-in-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('sign-in-error').props.children).toBe(
        AUTH_USER_MESSAGES.authStateChanged,
      ),
    );
    expect(mockDismissAuthToReturnPath).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(rendered.getByTestId('sign-in-email').props.value).toBe(
      'b@example.com',
    );
    expect(rendered.getByTestId('sign-in-password').props.value).toBe('');

    rendered.unmount();
  });

  it('dismisses after authoritative signed-in signUp', async () => {
    mockSignUp.mockResolvedValue({
      kind: 'signed-in',
      user: { id: 'user-b', email: 'b@example.com' },
    });

    const rendered = await render(<SignUpScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('sign-up-email'),
        'b@example.com',
      );
      fireEvent.changeText(
        rendered.getByTestId('sign-up-password'),
        'password1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('sign-up-submit'));
    });

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockDismissAuthToReturnPath).toHaveBeenCalledWith(
        expect.objectContaining({ dismissTo: mockDismissTo }),
        '/product/11111111-1111-4111-8111-111111111111',
      ),
    );

    rendered.unmount();
  });

  it('stays on Sign Up and shows safe copy when signUp is superseded', async () => {
    mockSignUp.mockResolvedValue({ kind: 'superseded' });

    const rendered = await render(<SignUpScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('sign-up-email'),
        'b@example.com',
      );
      fireEvent.changeText(
        rendered.getByTestId('sign-up-password'),
        'password1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('sign-up-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('sign-up-error').props.children).toBe(
        AUTH_USER_MESSAGES.authStateChanged,
      ),
    );
    expect(mockDismissAuthToReturnPath).not.toHaveBeenCalled();
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(rendered.queryByTestId('sign-up-confirmation')).toBeNull();
    expect(rendered.getByTestId('sign-up-email').props.value).toBe(
      'b@example.com',
    );
    expect(rendered.getByTestId('sign-up-password').props.value).toBe('');

    rendered.unmount();
  });

  it('shows confirmation UI without dismiss for confirmation-required signUp', async () => {
    mockSignUp.mockResolvedValue({
      kind: 'confirmation-required',
      email: 'new@example.com',
    });

    const rendered = await render(<SignUpScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('sign-up-email'),
        'new@example.com',
      );
      fireEvent.changeText(
        rendered.getByTestId('sign-up-password'),
        'password1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('sign-up-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('sign-up-confirmation')).toBeTruthy(),
    );
    expect(mockDismissAuthToReturnPath).not.toHaveBeenCalled();

    rendered.unmount();
  });
});
