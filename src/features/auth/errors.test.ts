import {
  AuthError,
  AUTH_USER_MESSAGES,
  getAuthErrorMessage,
  normalizeAuthError,
} from '@/src/features/auth/errors';

describe('normalizeAuthError', () => {
  it('maps invalid credentials without exposing raw text', () => {
    const error = normalizeAuthError(
      { message: 'Invalid login credentials', status: 400, code: 'invalid_credentials' },
      { operation: 'sign-in' },
    );
    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe('invalid-credentials');
    expect(error.message).toBe(AUTH_USER_MESSAGES.invalidCredentials);
    expect(error.message).not.toMatch(/Invalid login|JWT|SQL|supabase/i);
  });

  it('maps offline failures', () => {
    const error = normalizeAuthError(new TypeError('Network request failed'), {
      operation: 'sign-in',
      isOffline: true,
    });
    expect(error.code).toBe('offline');
    expect(error.message).toBe(AUTH_USER_MESSAGES.offline);
  });

  it('maps sign-up failures to account-creation copy', () => {
    const error = normalizeAuthError(
      { message: 'Database error saving new user', status: 500 },
      { operation: 'sign-up' },
    );
    expect(error.code).toBe('account-creation-failed');
    expect(error.message).toBe(AUTH_USER_MESSAGES.accountCreationFailed);
    expect(error.message).not.toContain('Database error');
  });

  it('maps timeout by error name', () => {
    const timeout = new Error('abort');
    timeout.name = 'TimeoutError';
    const error = normalizeAuthError(timeout, { operation: 'sign-in' });
    expect(error.code).toBe('timeout');
    expect(error.message).toBe(AUTH_USER_MESSAGES.timeout);
  });

  it('getAuthErrorMessage never returns raw provider text for unknown errors', () => {
    expect(getAuthErrorMessage({ message: 'raw-supabase-xyz' })).toBe(
      AUTH_USER_MESSAGES.signInFailed,
    );
  });
});
