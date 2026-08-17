/**
 * Auth identity exposed to UI. Never includes access/refresh tokens or the
 * full Supabase session object.
 */
export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthStatus = 'initializing' | 'signed-out' | 'signed-in';

/**
 * Password-recovery session phase (Task 18).
 * Distinct from ordinary sign-in / session restoration.
 *
 * - idle: no recovery callback in progress (direct navigation / ordinary session)
 * - processing: deep-link tokens/code exchange in flight
 * - verified: PASSWORD_RECOVERY observed; password-update form may run
 * - temporary-failure: transport/server failure; reopening the same link may retry
 * - unavailable: expired, reused, or malformed recovery link
 */
export type RecoveryPhase =
  | 'idle'
  | 'processing'
  | 'verified'
  | 'temporary-failure'
  | 'unavailable';

export type SignInCredentials = {
  email: string;
  password: string;
};

export type SignUpCredentials = {
  email: string;
  password: string;
};

export type SignInSuccess = {
  kind: 'signed-in';
  user: AuthUser;
};

/**
 * Explicit sign-in/up finished, but a newer auth transition (different principal
 * or signed-out) became authoritative before the optimistic apply committed.
 * Callers must not navigate as if this operation signed the user in.
 */
export type AuthOperationSuperseded = {
  kind: 'superseded';
};

export type SignInResult = SignInSuccess | AuthOperationSuperseded;

export type SignUpSuccess = {
  kind: 'signed-in';
  user: AuthUser;
};

export type SignUpConfirmationRequired = {
  kind: 'confirmation-required';
  email: string;
};

export type SignUpResult =
  | SignUpSuccess
  | SignUpConfirmationRequired
  | AuthOperationSuperseded;

export type PasswordResetRequestResult = {
  kind: 'submitted';
};

export type PasswordUpdateSuccess = {
  kind: 'updated';
  user: AuthUser;
};

/**
 * Result of consuming an auth deep-link / recovery callback URL.
 * Never includes raw tokens.
 */
export type AuthCallbackProcessResult =
  | { kind: 'password-recovery'; user: AuthUser }
  | { kind: 'session'; user: AuthUser }
  | { kind: 'ignored' };
