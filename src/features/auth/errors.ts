export type AuthErrorCode =
  | 'offline'
  | 'invalid-credentials'
  | 'account-creation-failed'
  | 'timeout'
  | 'temporary-failure'
  | 'confirmation-required'
  | 'invalid-email'
  | 'password-mismatch'
  | 'password-too-weak'
  | 'password-update-failed'
  | 'recovery-link-invalid'
  | 'recovery-request-failed'
  | 'account-deletion-failed'
  | 'account-deletion-in-progress';

export type AuthErrorSource =
  | 'transport'
  | 'credentials'
  | 'server'
  | 'configuration';

type AuthErrorOptions = {
  source?: AuthErrorSource;
  status?: number;
  cause?: unknown;
};

/**
 * Domain error for auth UI. `message` is always safe user-facing copy.
 * Raw Supabase / network text stays only in optional `cause` for diagnostics.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly source: AuthErrorSource;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(
    code: AuthErrorCode,
    message: string,
    options: AuthErrorOptions = {},
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.source = options.source ?? defaultSource(code);
    this.status = options.status;
    this.cause = options.cause;
  }
}

function defaultSource(code: AuthErrorCode): AuthErrorSource {
  switch (code) {
    case 'offline':
    case 'timeout':
      return 'transport';
    case 'invalid-credentials':
    case 'confirmation-required':
    case 'invalid-email':
    case 'password-mismatch':
    case 'password-too-weak':
    case 'recovery-link-invalid':
      return 'credentials';
    case 'account-creation-failed':
    case 'temporary-failure':
    case 'password-update-failed':
    case 'recovery-request-failed':
    case 'account-deletion-failed':
    case 'account-deletion-in-progress':
      return 'server';
  }
}

/** Safe presentation strings for forms (never raw SDK error text). */
export const AUTH_USER_MESSAGES = {
  offline: "You're offline. Connect to the internet and try again.",
  invalidCredentials: 'Email or password is incorrect.',
  signInFailed: 'Could not sign in. Please try again.',
  signOutFailed: 'Could not sign out. Please try again.',
  accountCreationFailed: 'Could not create the account. Please try again.',
  confirmationRequired: 'Check your email to confirm your account.',
  timeout: 'The request took too long. Please try again.',
  temporaryFailure: 'Could not sign in. Please try again.',
  authStateChanged: 'Your account state changed. Please try again.',
  invalidEmail: 'Enter a valid email address.',
  /**
   * Non-enumerating recovery request confirmation. Never reveal whether an
   * account exists for the submitted address.
   */
  recoveryRequestSent:
    'If an Eazy Review account exists for this email, password-reset instructions will be sent.',
  recoveryRequestFailed:
    'Could not send a password-reset email. Please try again.',
  recoveryLinkInvalid:
    'This reset link is no longer valid. Request a new password-reset email.',
  recoveryTemporaryFailure:
    'Could not verify this reset link right now. Check your connection, then open the same link again.',
  passwordMismatch: 'Passwords do not match.',
  passwordTooWeak: 'Password must be at least 6 characters.',
  passwordUpdateFailed: 'Could not update your password. Please try again.',
  passwordUpdateSuccess: 'Your password was updated.',
  accountDeletionWrongPassword: 'Current password is incorrect.',
  accountDeletionFailed: 'Could not delete your account. Please try again.',
  accountDeletionInProgress: 'Account deletion is already in progress.',
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readStatus(value: unknown): number | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  for (const candidate of [record.status, record.statusCode]) {
    if (typeof candidate === 'number') {
      return candidate;
    }
    if (typeof candidate === 'string' && /^\d{3}$/.test(candidate)) {
      return Number(candidate);
    }
  }
  return undefined;
}

function readCode(value: unknown): string | undefined {
  const code = asRecord(value)?.code;
  return typeof code === 'string' ? code : undefined;
}

function readMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  const message = asRecord(value)?.message;
  return typeof message === 'string' ? message : '';
}

function isTransportFailure(value: unknown): boolean {
  return (
    value instanceof TypeError ||
    /network request failed|failed to fetch|networkerror|load failed|fetch failed/i.test(
      readMessage(value),
    )
  );
}

function isInvalidCredentials(value: unknown): boolean {
  const code = readCode(value)?.toLowerCase() ?? '';
  const message = readMessage(value).toLowerCase();
  return (
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    code === 'email_not_confirmed' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid email or password') ||
    message.includes('email not confirmed')
  );
}

/** Known provider rejections that would reveal whether an account exists. */
export function isAccountExistenceError(value: unknown): boolean {
  const code = readCode(value)?.toLowerCase() ?? '';
  const message = readMessage(value).toLowerCase();
  return (
    code === 'user_not_found' ||
    code === 'email_not_found' ||
    message.includes('user not found') ||
    message.includes('email not found')
  );
}

function isConfirmationRelated(value: unknown): boolean {
  const code = readCode(value)?.toLowerCase() ?? '';
  const message = readMessage(value).toLowerCase();
  return (
    code === 'email_not_confirmed' || message.includes('email not confirmed')
  );
}

/**
 * GoTrue / auth-js codes that mean the stored principal or session is no
 * longer valid. Transient transport and 5xx failures are intentionally
 * excluded so restore can preserve local session when the Auth server is
 * only unreachable.
 *
 * Source: `@supabase/auth-js` `ErrorCode` list (bad_jwt, user_not_found,
 * session_*, refresh_token_*, user_banned) plus AuthSessionMissingError /
 * AuthInvalidJwtError names used by the SDK client.
 */
const DEFINITIVE_INVALID_SESSION_CODES = new Set([
  'bad_jwt',
  'invalid_jwt',
  'user_not_found',
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'user_banned',
]);

/**
 * True when Auth has rejected the restored session/principal for identity
 * reasons — not when the device is offline or the request failed transiently.
 * Prefer preserving local session when classification is ambiguous.
 */
export function isDefinitiveInvalidSessionError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  const name = asRecord(error)?.name;
  if (
    name === 'AuthSessionMissingError' ||
    name === 'AuthInvalidJwtError' ||
    name === 'AuthInvalidTokenResponseError'
  ) {
    return true;
  }

  const code = readCode(error)?.toLowerCase();
  if (code != null && DEFINITIVE_INVALID_SESSION_CODES.has(code)) {
    return true;
  }

  // Ambiguous 401/403 without a known code must not force logout.
  // Known codes already covered above.
  return false;
}

/**
 * Transient validation failures during online restore — keep the local
 * session rather than destructive sign-out.
 */
export function isTransientSessionValidationFailure(error: unknown): boolean {
  if (error == null || isDefinitiveInvalidSessionError(error)) {
    return false;
  }
  if (isTransportFailure(error)) {
    return true;
  }
  const name = asRecord(error)?.name;
  if (name === 'TimeoutError' || name === 'AbortError') {
    return true;
  }
  const status = readStatus(error);
  if (status != null && status >= 500) {
    return true;
  }
  // Unknown / unclassifiable errors: treat as transient to avoid false logout.
  return true;
}

/**
 * Maps SDK/network failures to AuthError with fixed user-facing copy.
 * Does not surface raw Supabase messages to callers who only read `.message`.
 */
export type AuthNormalizeOperation =
  | 'sign-in'
  | 'sign-up'
  | 'sign-out'
  | 'session'
  | 'password-reset-request'
  | 'password-update'
  | 'recovery-callback'
  | 'account-deletion-reauthentication';

export function normalizeAuthError(
  error: unknown,
  options: {
    operation: AuthNormalizeOperation;
    isOffline?: boolean;
  },
): AuthError {
  if (error instanceof AuthError) {
    return error;
  }

  const status = readStatus(error);
  const name = asRecord(error)?.name;

  if (options.isOffline || isTransportFailure(error)) {
    if (options.isOffline || isTransportFailure(error)) {
      // Prefer offline copy when connectivity is known offline; otherwise
      // treat pure transport failures as temporary service issues when online.
      if (options.isOffline) {
        return new AuthError('offline', AUTH_USER_MESSAGES.offline, {
          source: 'transport',
          status,
          cause: error,
        });
      }
      if (isTransportFailure(error)) {
        return new AuthError(
          'temporary-failure',
          userMessageForOperation(options.operation),
          { source: 'transport', status, cause: error },
        );
      }
    }
  }

  if (name === 'TimeoutError' || name === 'AbortError') {
    return new AuthError('timeout', AUTH_USER_MESSAGES.timeout, {
      source: 'transport',
      status,
      cause: error,
    });
  }

  if (
    (options.operation === 'sign-in' ||
      options.operation === 'account-deletion-reauthentication') &&
    isInvalidCredentials(error)
  ) {
    // Email-not-confirmed still looks like "cannot use this credential set"
    // to the user; keep credentials copy, not raw provider wording.
    if (
      options.operation === 'sign-in' &&
      isConfirmationRelated(error)
    ) {
      return new AuthError(
        'confirmation-required',
        AUTH_USER_MESSAGES.confirmationRequired,
        { source: 'credentials', status, cause: error },
      );
    }
    return new AuthError(
      'invalid-credentials',
      options.operation === 'account-deletion-reauthentication'
        ? AUTH_USER_MESSAGES.accountDeletionWrongPassword
        : AUTH_USER_MESSAGES.invalidCredentials,
      { source: 'credentials', status, cause: error },
    );
  }

  if (options.operation === 'sign-up') {
    return new AuthError(
      'account-creation-failed',
      AUTH_USER_MESSAGES.accountCreationFailed,
      { source: 'server', status, cause: error },
    );
  }

  if (options.operation === 'password-update' && isWeakPassword(error)) {
    return new AuthError(
      'password-too-weak',
      AUTH_USER_MESSAGES.passwordTooWeak,
      { source: 'credentials', status, cause: error },
    );
  }

  if (
    (options.operation === 'recovery-callback' &&
      (isRecoverySessionError(error) ||
        isDefinitiveInvalidSessionError(error))) ||
    (options.operation === 'password-update' &&
      (isRecoverySessionError(error) ||
        isDefinitiveInvalidSessionError(error)))
  ) {
    return new AuthError(
      'recovery-link-invalid',
      AUTH_USER_MESSAGES.recoveryLinkInvalid,
      { source: 'credentials', status, cause: error },
    );
  }

  if (status != null && status >= 500) {
    return new AuthError(
      'temporary-failure',
      userMessageForOperation(options.operation),
      { source: 'server', status, cause: error },
    );
  }

  return new AuthError(
    'temporary-failure',
    userMessageForOperation(options.operation),
    { source: 'server', status, cause: error },
  );
}

function isWeakPassword(value: unknown): boolean {
  const code = readCode(value)?.toLowerCase() ?? '';
  const message = readMessage(value).toLowerCase();
  return (
    code === 'weak_password' ||
    message.includes('password should be at least') ||
    message.includes('password is known to be weak') ||
    message.includes('password is too short')
  );
}

function isRecoverySessionError(value: unknown): boolean {
  const code = readCode(value)?.toLowerCase() ?? '';
  const message = readMessage(value).toLowerCase();
  return (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found' ||
    code === 'bad_code_verifier' ||
    code === 'pkce_code_verifier_not_found' ||
    message.includes('otp_expired') ||
    message.includes('email link is invalid or has expired') ||
    message.includes('token has expired') ||
    message.includes('invalid or expired') ||
    message.includes('pkce code verifier not found') ||
    message.includes('code verifier does not match')
  );
}

function userMessageForOperation(operation: AuthNormalizeOperation): string {
  switch (operation) {
    case 'sign-up':
      return AUTH_USER_MESSAGES.accountCreationFailed;
    case 'sign-out':
      return AUTH_USER_MESSAGES.signOutFailed;
    case 'password-reset-request':
      return AUTH_USER_MESSAGES.recoveryRequestFailed;
    case 'password-update':
      return AUTH_USER_MESSAGES.passwordUpdateFailed;
    case 'recovery-callback':
      return AUTH_USER_MESSAGES.recoveryTemporaryFailure;
    case 'account-deletion-reauthentication':
      return AUTH_USER_MESSAGES.accountDeletionFailed;
    case 'sign-in':
    case 'session':
    default:
      return AUTH_USER_MESSAGES.signInFailed;
  }
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    return error.message;
  }
  return AUTH_USER_MESSAGES.signInFailed;
}
