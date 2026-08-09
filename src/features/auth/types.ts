/**
 * Auth identity exposed to UI. Never includes access/refresh tokens or the
 * full Supabase session object.
 */
export type AuthUser = {
  id: string;
  email: string | null;
};

export type AuthStatus = 'initializing' | 'signed-out' | 'signed-in';

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
