import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import {
  deleteCurrentUser,
  reauthenticateForAccountDeletion,
} from '@/src/features/auth/deletion.api';
import { AuthError } from '@/src/features/auth/errors';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';

const PRINCIPAL_LABEL = 'principal-a';
const OTHER_PRINCIPAL_LABEL = 'principal-b';
const EMAIL_LABEL = 'account-a-label';
const PASSWORD_BYTES = ' password-bytes-a ';
const FRESH_BEARER = 'fresh-access-token-a';
const RAW_SENTINEL = 'raw-provider-detail-must-not-propagate';

function authClient(options: {
  principalId?: string;
  signInWithPassword?: jest.Mock;
  stopAutoRefresh?: jest.Mock;
} = {}): AppSupabaseClient {
  const stopAutoRefresh = options.stopAutoRefresh ?? jest.fn();
  return {
    auth: {
      signInWithPassword:
        options.signInWithPassword ??
        jest.fn(async () => ({
          data: {
            session: {
              user: {
                id: options.principalId ?? PRINCIPAL_LABEL,
                email: EMAIL_LABEL,
              },
              access_token: FRESH_BEARER,
            },
          },
          error: null,
        })),
      stopAutoRefresh,
    },
  } as unknown as AppSupabaseClient;
}

function functionsClient(
  invoke: jest.Mock,
): Pick<AppSupabaseClient['functions'], 'invoke'> {
  return {
    invoke: invoke as AppSupabaseClient['functions']['invoke'],
  };
}

function response(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
}

function success(body: unknown, status = 200) {
  const resultResponse = response(status, body);
  return { data: body, error: null, response: resultResponse };
}

function httpFailure(status: number, body?: unknown) {
  const resultResponse = response(status, body);
  return {
    data: null,
    error: new FunctionsHttpError(resultResponse),
    response: resultResponse,
  };
}

describe('account deletion client boundary', () => {
  it('reauthenticates with fixed email and unchanged password bytes in isolated state', async () => {
    const signInWithPassword = jest.fn(async () => ({
      data: {
        session: {
          user: { id: PRINCIPAL_LABEL, email: EMAIL_LABEL },
          access_token: FRESH_BEARER,
        },
      },
      error: null,
    }));
    const stopAutoRefresh = jest.fn();
    const isolatedClient = authClient({ signInWithPassword, stopAutoRefresh });
    const createIsolatedAuthClient = jest.fn(() => isolatedClient);

    const result = await reauthenticateForAccountDeletion(
      {
        email: EMAIL_LABEL,
        password: PASSWORD_BYTES,
        expectedPrincipalId: PRINCIPAL_LABEL,
      },
      { createIsolatedAuthClient, isOnline: () => true },
    );

    expect(createIsolatedAuthClient).toHaveBeenCalledTimes(1);
    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: EMAIL_LABEL,
      password: PASSWORD_BYTES,
    });
    expect(stopAutoRefresh).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      user: { id: PRINCIPAL_LABEL, email: EMAIL_LABEL },
      accessToken: FRESH_BEARER,
    });
  });

  it('rejects a returned principal that differs from expected A', async () => {
    const createIsolatedAuthClient = jest.fn(() =>
      authClient({ principalId: OTHER_PRINCIPAL_LABEL }),
    );

    await expect(
      reauthenticateForAccountDeletion(
        {
          email: EMAIL_LABEL,
          password: PASSWORD_BYTES,
          expectedPrincipalId: PRINCIPAL_LABEL,
        },
        { createIsolatedAuthClient, isOnline: () => true },
      ),
    ).rejects.toMatchObject({
      code: 'account-deletion-failed',
      message: 'Could not delete your account. Please try again.',
    });
  });

  it('maps email-not-confirmed reauthentication to fixed current-password copy', async () => {
    const createIsolatedAuthClient = jest.fn(() =>
      authClient({
        signInWithPassword: jest.fn(async () => ({
          data: { session: null, user: null },
          error: {
            status: 400,
            code: 'email_not_confirmed',
            message: RAW_SENTINEL,
          },
        })),
      }),
    );

    await expect(
      reauthenticateForAccountDeletion(
        {
          email: EMAIL_LABEL,
          password: PASSWORD_BYTES,
          expectedPrincipalId: PRINCIPAL_LABEL,
        },
        { createIsolatedAuthClient, isOnline: () => true },
      ),
    ).rejects.toMatchObject({
      code: 'invalid-credentials',
      message: 'Current password is incorrect.',
    });
  });

  it('rejects known offline state before either isolated network client is created', async () => {
    const createIsolatedAuthClient = jest.fn();
    const createIsolatedFunctionsClient = jest.fn();

    await expect(
      reauthenticateForAccountDeletion(
        {
          email: EMAIL_LABEL,
          password: PASSWORD_BYTES,
          expectedPrincipalId: PRINCIPAL_LABEL,
        },
        { createIsolatedAuthClient, isOnline: () => false },
      ),
    ).rejects.toMatchObject({ code: 'offline' });
    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient,
        isOnline: () => false,
      }),
    ).rejects.toMatchObject({ code: 'offline' });
    expect(createIsolatedAuthClient).not.toHaveBeenCalled();
    expect(createIsolatedFunctionsClient).not.toHaveBeenCalled();
  });

  it('pins Authorization to the fresh bearer and sends zero body bytes once', async () => {
    const invoke = jest.fn(async (_name: string, _options: unknown) =>
      success({ ok: true, outcome: 'deleted' }),
    );
    const createIsolatedFunctionsClient = jest.fn(() => functionsClient(invoke));

    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient,
        isOnline: () => true,
      }),
    ).resolves.toEqual({ kind: 'deleted' });

    expect(createIsolatedFunctionsClient).toHaveBeenCalledWith(FRESH_BEARER);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('delete-current-user', {
      method: 'POST',
      headers: { Authorization: `Bearer ${FRESH_BEARER}` },
      timeout: 10_000,
    });
    expect(invoke.mock.calls[0][1]).not.toHaveProperty('body');
  });

  it('keeps Functions-client construction failure pre-invocation', async () => {
    const onInvocationStart = jest.fn();
    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient: () => {
          throw new Error(RAW_SENTINEL);
        },
        isOnline: () => true,
        onInvocationStart,
      }),
    ).rejects.toMatchObject({ code: 'account-deletion-failed' });
    expect(onInvocationStart).not.toHaveBeenCalled();
  });

  it.each([
    [success({ ok: true, outcome: 'deleted' }), { kind: 'deleted' }],
    [
      httpFailure(409, { ok: false, code: 'revoked-not-deleted' }),
      { kind: 'not-deleted-signed-out' },
    ],
    [
      httpFailure(503, { ok: false, code: 'revocation-unconfirmed' }),
      { kind: 'unconfirmed-signed-out' },
    ],
    [
      httpFailure(503, { ok: false, code: 'revoked-delete-unconfirmed' }),
      { kind: 'unconfirmed-signed-out' },
    ],
  ])('maps exact server outcome %#', async (invokeResult, expected) => {
    const invoke = jest.fn(async () => invokeResult);
    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient: () => functionsClient(invoke),
        isOnline: () => true,
      }),
    ).resolves.toEqual(expected);
  });

  it.each([
    [400, 'invalid-request'],
    [401, 'unauthorized'],
    [403, 'reauthentication-required'],
    [405, 'method-not-allowed'],
    [500, 'configuration-failure'],
    [502, 'revocation-failed'],
    [503, 'validation-unavailable'],
  ])('keeps exact pre-revocation %i:%s retryable', async (status, code) => {
    const invoke = jest.fn(async () => httpFailure(status, { ok: false, code }));
    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient: () => functionsClient(invoke),
        isOnline: () => true,
      }),
    ).rejects.toMatchObject({
      code: 'account-deletion-failed',
      message: 'Could not delete your account. Please try again.',
    });
  });

  it.each([undefined, { message: 'Unauthorized' }])(
    'treats malformed gateway 401 response %# as pre-revocation',
    async (body) => {
      const invoke = jest.fn(async () => httpFailure(401, body));
      await expect(
        deleteCurrentUser(FRESH_BEARER, {
          createIsolatedFunctionsClient: () => functionsClient(invoke),
          isOnline: () => true,
        }),
      ).rejects.toMatchObject({ code: 'account-deletion-failed' });
    },
  );

  it.each([
    success({ ok: true, outcome: 'unknown' }),
    success({ ok: false, code: 'deleted' }),
    httpFailure(409, { ok: false, code: 'revocation-unconfirmed' }),
    httpFailure(503, { ok: false, code: 'unknown-code' }),
    httpFailure(503, { ok: true, code: 'validation-unavailable' }),
    httpFailure(503),
    { data: null, error: new FunctionsFetchError(new Error(RAW_SENTINEL)) },
    { data: null, error: new FunctionsRelayError(response(503)) },
  ])('maps malformed unknown mismatched and transport result %# as ambiguous', async (invokeResult) => {
    const invoke = jest.fn(async () => invokeResult);
    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient: () => functionsClient(invoke),
        isOnline: () => true,
      }),
    ).resolves.toEqual({ kind: 'unconfirmed-signed-out' });
  });

  it('maps thrown post-dispatch loss as ambiguous without retry', async () => {
    const invoke = jest.fn(async () => {
      throw new Error(RAW_SENTINEL);
    });
    await expect(
      deleteCurrentUser(FRESH_BEARER, {
        createIsolatedFunctionsClient: () => functionsClient(invoke),
        isOnline: () => true,
      }),
    ).resolves.toEqual({ kind: 'unconfirmed-signed-out' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('maps wrong password to fixed current-password copy without raw detail', async () => {
    const isolatedClient = authClient({
      signInWithPassword: jest.fn(async () => ({
        data: { session: null },
        error: {
          code: 'invalid_credentials',
          status: 400,
          message: RAW_SENTINEL,
        },
      })),
    });
    const promise = reauthenticateForAccountDeletion(
      {
        email: EMAIL_LABEL,
        password: PASSWORD_BYTES,
        expectedPrincipalId: PRINCIPAL_LABEL,
      },
      { createIsolatedAuthClient: () => isolatedClient, isOnline: () => true },
    );
    await expect(promise).rejects.toBeInstanceOf(AuthError);
    await expect(promise).rejects.toMatchObject({
      code: 'invalid-credentials',
      message: 'Current password is incorrect.',
    });
    await promise.catch((error: unknown) => {
      expect(JSON.stringify(error)).not.toContain(RAW_SENTINEL);
    });
  });
});
