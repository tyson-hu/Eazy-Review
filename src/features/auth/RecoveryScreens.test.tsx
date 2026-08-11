import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import ForgotPasswordScreen from '@/app/auth/forgot-password';
import ResetPasswordScreen from '@/app/auth/reset-password';
import SignInScreen from '@/app/auth/sign-in';
import { AuthError, AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import type { RecoveryPhase } from '@/src/features/auth/types';

const mockDismissTo = jest.fn();
const mockReplace = jest.fn();
const mockRequestPasswordReset = jest.fn();
const mockUpdatePasswordFromRecovery = jest.fn();
const mockClearRecoveryPhase = jest.fn();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

let mockRecoveryPhase: RecoveryPhase = 'idle';
let mockAuthStatus: 'initializing' | 'signed-out' | 'signed-in' = 'signed-out';
let mockIsSignedIn = false;

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  Link: ({ children }: { children: unknown }) => children,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    dismissTo: mockDismissTo,
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
  }),
}));

jest.mock('@/src/features/auth/hooks', () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    user: mockIsSignedIn
      ? { id: 'user-a', email: 'a@example.com' }
      : null,
    isSignedIn: mockIsSignedIn,
    recoveryPhase: mockRecoveryPhase,
    clearRecoveryPhase: mockClearRecoveryPhase,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: jest.fn(),
  }),
}));

jest.mock('@/src/features/auth/api', () => ({
  requestPasswordReset: (...args: unknown[]) =>
    mockRequestPasswordReset(...args),
  updatePasswordFromRecovery: (...args: unknown[]) =>
    mockUpdatePasswordFromRecovery(...args),
}));

describe('password recovery screens', () => {
  beforeEach(() => {
    mockDismissTo.mockReset();
    mockReplace.mockReset();
    mockRequestPasswordReset.mockReset();
    mockUpdatePasswordFromRecovery.mockReset();
    mockClearRecoveryPhase.mockReset();
    mockSignIn.mockReset();
    mockSignUp.mockReset();
    mockRecoveryPhase = 'idle';
    mockAuthStatus = 'signed-out';
    mockIsSignedIn = false;
  });

  it('exposes Forgot password on Sign In', async () => {
    const rendered = await render(<SignInScreen />);
    expect(rendered.getByTestId('sign-in-forgot-password')).toBeTruthy();
    rendered.unmount();
  });

  it('rejects malformed email on the request screen', async () => {
    const rendered = await render(<ForgotPasswordScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('forgot-password-email'),
        'not-email',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('forgot-password-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('forgot-password-error').props.children).toBe(
        AUTH_USER_MESSAGES.invalidEmail,
      ),
    );
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    expect(rendered.getByTestId('forgot-password-email').props.value).toBe(
      'not-email',
    );
    rendered.unmount();
  });

  it('shows non-enumerating success after a valid request', async () => {
    mockRequestPasswordReset.mockResolvedValue({ kind: 'submitted' });
    const rendered = await render(<ForgotPasswordScreen />);

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('forgot-password-email'),
        'user@example.com',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('forgot-password-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('forgot-password-success')).toBeTruthy(),
    );
    expect(
      rendered.getByTestId('forgot-password-success-copy').props.children,
    ).toBe(AUTH_USER_MESSAGES.recoveryRequestSent);
    expect(AUTH_USER_MESSAGES.recoveryRequestSent).not.toMatch(
      /no account|not found|user not found|email exists|account does not exist/i,
    );
    expect(mockRequestPasswordReset).toHaveBeenCalledTimes(1);
    rendered.unmount();
  });

  it('disables submit while the request is in flight', async () => {
    let resolveRequest: (value: unknown) => void = () => {};
    mockRequestPasswordReset.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    const rendered = await render(<ForgotPasswordScreen />);

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('forgot-password-email'),
        'user@example.com',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('forgot-password-submit'));
    });

    await waitFor(() =>
      expect(
        rendered.getByTestId('forgot-password-submit').props.accessibilityState
          ?.disabled ??
          rendered.getByTestId('forgot-password-submit').props.disabled,
      ).toBeTruthy(),
    );

    await act(async () => {
      resolveRequest({ kind: 'submitted' });
    });
    await waitFor(() =>
      expect(rendered.getByTestId('forgot-password-success')).toBeTruthy(),
    );
    rendered.unmount();
  });

  it('preserves email after a backend failure', async () => {
    mockRequestPasswordReset.mockRejectedValue(
      new AuthError(
        'recovery-request-failed',
        AUTH_USER_MESSAGES.recoveryRequestFailed,
      ),
    );
    const rendered = await render(<ForgotPasswordScreen />);

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('forgot-password-email'),
        'keep@example.com',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('forgot-password-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('forgot-password-error')).toBeTruthy(),
    );
    expect(rendered.getByTestId('forgot-password-email').props.value).toBe(
      'keep@example.com',
    );
    rendered.unmount();
  });

  it('does not show the form for direct navigation without recovery', async () => {
    mockRecoveryPhase = 'idle';
    mockAuthStatus = 'signed-out';
    const rendered = await render(<ResetPasswordScreen />);
    expect(rendered.getByTestId('reset-password-unavailable')).toBeTruthy();
    expect(rendered.queryByTestId('reset-password-form')).toBeNull();
    expect(
      rendered.getByTestId('reset-password-unavailable-copy').props.children,
    ).toBe(AUTH_USER_MESSAGES.recoveryLinkInvalid);
    rendered.unmount();
  });

  it('does not show the form for an ordinary signed-in session', async () => {
    mockRecoveryPhase = 'idle';
    mockAuthStatus = 'signed-in';
    mockIsSignedIn = true;
    const rendered = await render(<ResetPasswordScreen />);
    expect(rendered.getByTestId('reset-password-unavailable')).toBeTruthy();
    expect(rendered.queryByTestId('reset-password-form')).toBeNull();
    rendered.unmount();
  });

  it('shows the form for a verified recovery session only', async () => {
    mockRecoveryPhase = 'verified';
    mockAuthStatus = 'signed-in';
    mockIsSignedIn = true;
    const rendered = await render(<ResetPasswordScreen />);
    expect(rendered.getByTestId('reset-password-form')).toBeTruthy();
    expect(rendered.queryByTestId('reset-password-unavailable')).toBeNull();
    rendered.unmount();
  });

  it('shows loading while recovery is processing', async () => {
    mockRecoveryPhase = 'processing';
    mockAuthStatus = 'initializing';
    const rendered = await render(<ResetPasswordScreen />);
    expect(rendered.getByTestId('reset-password-loading')).toBeTruthy();
    expect(rendered.queryByTestId('reset-password-form')).toBeNull();
    rendered.unmount();
  });

  it('shows unavailable for invalid or reused recovery links', async () => {
    mockRecoveryPhase = 'unavailable';
    const rendered = await render(<ResetPasswordScreen />);
    expect(rendered.getByTestId('reset-password-unavailable')).toBeTruthy();
    expect(rendered.getByTestId('reset-password-request-new')).toBeTruthy();
    rendered.unmount();
  });

  it('rejects mismatched passwords without updating', async () => {
    mockRecoveryPhase = 'verified';
    mockAuthStatus = 'signed-in';
    mockIsSignedIn = true;
    const rendered = await render(<ResetPasswordScreen />);

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('reset-password-new'),
        'abcdef',
      );
      fireEvent.changeText(
        rendered.getByTestId('reset-password-confirm'),
        'abcdeg',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('reset-password-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('reset-password-error').props.children).toBe(
        AUTH_USER_MESSAGES.passwordMismatch,
      ),
    );
    expect(mockUpdatePasswordFromRecovery).not.toHaveBeenCalled();
    rendered.unmount();
  });

  it('updates password successfully and routes to Account', async () => {
    mockRecoveryPhase = 'verified';
    mockAuthStatus = 'signed-in';
    mockIsSignedIn = true;
    mockUpdatePasswordFromRecovery.mockResolvedValue({
      kind: 'updated',
      user: { id: 'user-a', email: 'a@example.com' },
    });
    const rendered = await render(<ResetPasswordScreen />);

    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('reset-password-new'),
        'newpass1',
      );
      fireEvent.changeText(
        rendered.getByTestId('reset-password-confirm'),
        'newpass1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('reset-password-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('reset-password-success')).toBeTruthy(),
    );
    expect(mockUpdatePasswordFromRecovery).toHaveBeenCalledTimes(1);
    expect(mockClearRecoveryPhase).toHaveBeenCalled();
    // Form fields unmount after success (secrets cleared from the tree).
    expect(rendered.queryByTestId('reset-password-new')).toBeNull();

    await act(async () => {
      fireEvent.press(rendered.getByTestId('reset-password-go-account'));
    });
    expect(mockDismissTo).toHaveBeenCalledWith('/(tabs)/account');
    rendered.unmount();
  });

  it('does not auto-retry a failed password update', async () => {
    mockRecoveryPhase = 'verified';
    mockAuthStatus = 'signed-in';
    mockIsSignedIn = true;
    mockUpdatePasswordFromRecovery.mockRejectedValue(
      new AuthError(
        'password-update-failed',
        AUTH_USER_MESSAGES.passwordUpdateFailed,
      ),
    );

    const rendered = await render(<ResetPasswordScreen />);
    await act(async () => {
      fireEvent.changeText(
        rendered.getByTestId('reset-password-new'),
        'newpass1',
      );
      fireEvent.changeText(
        rendered.getByTestId('reset-password-confirm'),
        'newpass1',
      );
    });
    await act(async () => {
      fireEvent.press(rendered.getByTestId('reset-password-submit'));
    });

    await waitFor(() =>
      expect(rendered.getByTestId('reset-password-error')).toBeTruthy(),
    );
    expect(mockUpdatePasswordFromRecovery).toHaveBeenCalledTimes(1);
    expect(rendered.getByTestId('reset-password-new').props.value).toBe(
      'newpass1',
    );
    rendered.unmount();
  });
});
