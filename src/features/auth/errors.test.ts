import {
  AuthError,
  AUTH_USER_MESSAGES,
  getAuthErrorMessage,
  isDefinitiveInvalidSessionError,
  isTransientSessionValidationFailure,
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

  it('keeps a recovery callback 5xx failure temporary', () => {
    const error = normalizeAuthError(
      { message: 'Internal server error', status: 503 },
      { operation: 'recovery-callback' },
    );

    expect(error.code).toBe('temporary-failure');
    expect(error.source).toBe('server');
  });

  it('keeps a replayed recovery session definitive', () => {
    const error = normalizeAuthError(
      {
        message: 'Refresh token already used',
        status: 400,
        code: 'refresh_token_already_used',
      },
      { operation: 'recovery-callback' },
    );

    expect(error.code).toBe('recovery-link-invalid');
    expect(error.message).toBe(AUTH_USER_MESSAGES.recoveryLinkInvalid);
  });

  it('getAuthErrorMessage never returns raw provider text for unknown errors', () => {
    expect(getAuthErrorMessage({ message: 'raw-supabase-xyz' })).toBe(
      AUTH_USER_MESSAGES.signInFailed,
    );
  });
});

describe('session validity classification', () => {
  it('treats known Auth identity rejections as definitive', () => {
    expect(
      isDefinitiveInvalidSessionError({
        name: 'AuthSessionMissingError',
        message: 'Auth session missing!',
      }),
    ).toBe(true);
    expect(
      isDefinitiveInvalidSessionError({
        code: 'user_not_found',
        status: 403,
      }),
    ).toBe(true);
    expect(
      isDefinitiveInvalidSessionError({
        code: 'session_not_found',
        status: 403,
      }),
    ).toBe(true);
    expect(
      isDefinitiveInvalidSessionError({
        code: 'bad_jwt',
        status: 401,
      }),
    ).toBe(true);
  });

  it('does not treat transport or 5xx as definitive invalid session', () => {
    expect(
      isDefinitiveInvalidSessionError(new TypeError('Network request failed')),
    ).toBe(false);
    expect(
      isDefinitiveInvalidSessionError({
        status: 503,
        code: 'unexpected_failure',
        message: 'Internal server error',
      }),
    ).toBe(false);
    // Ambiguous 401 without known code must not force logout.
    expect(
      isDefinitiveInvalidSessionError({
        status: 401,
        message: 'Unauthorized',
      }),
    ).toBe(false);
    expect(
      isTransientSessionValidationFailure({
        status: 503,
        code: 'unexpected_failure',
      }),
    ).toBe(true);
  });
});
