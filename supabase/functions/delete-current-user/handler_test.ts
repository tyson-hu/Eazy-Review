import { assert, assertEquals } from '@std/assert';

import type {
  AuthBoundary,
  DeleteResult,
  LookupResult,
  RevokeResult,
  VerificationResult,
} from './contracts.ts';
import { createDeleteCurrentUserHandler } from './handler.ts';
import {
  createDeleteCurrentUserRuntimeHandler,
  type DeleteCurrentUserRuntimeDependencies,
} from './index.ts';

const NOW_SECONDS = 1_000;
const CALLER_ID = 'caller-a';
const CALLER_JWT = 'jwt-a';
const RUNTIME_RAW_SENTINEL = 'runtime-detail-must-not-propagate';

type HarnessOptions = {
  callerId?: string;
  claims?: Record<string, unknown>;
  getUserResult?: VerificationResult<{ id: string }>;
  getClaimsResult?: VerificationResult<Record<string, unknown>>;
  revokeResult?: RevokeResult;
  deleteResult?: DeleteResult;
  lookupResult?: LookupResult;
};

function validClaims(callerId = CALLER_ID): Record<string, unknown> {
  return {
    sub: callerId,
    role: 'authenticated',
    session_id: 'session-a',
    amr: [{ method: 'password', timestamp: NOW_SECONDS }],
  };
}

function createHarness(options: HarnessOptions = {}) {
  const calls: string[] = [];
  const logs: string[] = [];
  const signOutCalls: string[] = [];
  const deleteCalls: string[] = [];
  const lookupCalls: string[] = [];
  const callerId = options.callerId ?? CALLER_ID;

  const auth: AuthBoundary = {
    getUser(jwt) {
      calls.push('getUser');
      assertEquals(jwt, CALLER_JWT);
      return Promise.resolve(
        options.getUserResult ?? { kind: 'verified', value: { id: callerId } },
      );
    },
    getClaims(jwt) {
      calls.push('getClaims');
      assertEquals(jwt, CALLER_JWT);
      return Promise.resolve(
        options.getClaimsResult ?? {
          kind: 'verified',
          value: options.claims ?? validClaims(callerId),
        },
      );
    },
    signOutGlobal(jwt) {
      calls.push('signOutGlobal');
      signOutCalls.push(jwt);
      return Promise.resolve(options.revokeResult ?? { kind: 'revoked' });
    },
    deleteUser(userId) {
      calls.push('deleteUser');
      deleteCalls.push(userId);
      return Promise.resolve(options.deleteResult ?? { kind: 'deleted' });
    },
    getUserById(userId) {
      calls.push('getUserById');
      lookupCalls.push(userId);
      return Promise.resolve(options.lookupResult ?? { kind: 'unavailable' });
    },
  };

  return {
    calls,
    logs,
    signOutCalls,
    deleteCalls,
    lookupCalls,
    handler: createDeleteCurrentUserHandler({
      auth,
      nowSeconds: () => NOW_SECONDS,
      logFixed: (code) => logs.push(code),
    }),
  };
}

function makeRequest(options: {
  method?: string;
  authorization?: string | null;
  body?: string;
} = {}): Request {
  const headers = new Headers();
  if (options.authorization !== null) {
    headers.set('Authorization', options.authorization ?? `Bearer ${CALLER_JWT}`);
  }
  return new Request('http://localhost/functions/v1/delete-current-user', {
    method: options.method ?? 'POST',
    headers,
    body: options.body,
  });
}

async function responseJson(response: Response): Promise<unknown> {
  return await response.json();
}

Deno.test('accepts unauthenticated OPTIONS with CORS and no Auth calls', async () => {
  const harness = createHarness();
  const response = await harness.handler(
    makeRequest({ method: 'OPTIONS', authorization: null }),
  );
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('access-control-allow-origin'), '*');
  assertEquals(harness.calls, []);
});

Deno.test('rejects non-POST methods with Allow POST OPTIONS', async () => {
  const harness = createHarness();
  const response = await harness.handler(makeRequest({ method: 'PUT' }));
  assertEquals(response.status, 405);
  assertEquals(response.headers.get('allow'), 'POST, OPTIONS');
  assertEquals(await responseJson(response), { ok: false, code: 'method-not-allowed' });
  assertEquals(harness.calls, []);
});

Deno.test('accepts omitted and whitespace-only bodies', async () => {
  for (const body of [undefined, '  \n\t']) {
    const harness = createHarness();
    const response = await harness.handler(makeRequest({ body }));
    assertEquals(response.status, 200);
    assertEquals(await responseJson(response), { ok: true, outcome: 'deleted' });
  }
});

Deno.test('rejects target-id JSON and every non-whitespace body', async () => {
  for (const body of ['{"userId":"caller-b"}', 'x', '\n . \t']) {
    const harness = createHarness();
    const response = await harness.handler(makeRequest({ body }));
    assertEquals(response.status, 400);
    assertEquals(await responseJson(response), { ok: false, code: 'invalid-request' });
    assertEquals(harness.calls, []);
  }
});

Deno.test('rejects missing malformed duplicate and comma-joined Bearer headers', async () => {
  const invalidHeaders: Array<HeadersInit | null> = [
    null,
    { Authorization: 'Basic value' },
    { Authorization: 'Bearer' },
    { Authorization: 'Bearer jwt-a, Bearer jwt-b' },
    [
      ['Authorization', 'Bearer jwt-a'],
      ['Authorization', 'Bearer jwt-b'],
    ],
  ];
  for (const headers of invalidHeaders) {
    const harness = createHarness();
    const response = await harness.handler(
      new Request('http://localhost/functions/v1/delete-current-user', {
        method: 'POST',
        headers: headers ?? undefined,
      }),
    );
    assertEquals(response.status, 401);
    assertEquals(await responseJson(response), { ok: false, code: 'unauthorized' });
    assertEquals(harness.calls, []);
  }
});

Deno.test('maps invalid caller and unavailable verification separately', async () => {
  const cases: Array<{
    options: HarnessOptions;
    status: number;
    code: string;
    calls: string[];
  }> = [
    {
      options: { getUserResult: { kind: 'invalid' } },
      status: 401,
      code: 'unauthorized',
      calls: ['getUser'],
    },
    {
      options: { getUserResult: { kind: 'unavailable' } },
      status: 503,
      code: 'validation-unavailable',
      calls: ['getUser'],
    },
    {
      options: { getClaimsResult: { kind: 'invalid' } },
      status: 401,
      code: 'unauthorized',
      calls: ['getUser', 'getClaims'],
    },
    {
      options: { getClaimsResult: { kind: 'unavailable' } },
      status: 503,
      code: 'validation-unavailable',
      calls: ['getUser', 'getClaims'],
    },
  ];
  for (const testCase of cases) {
    const harness = createHarness(testCase.options);
    const response = await harness.handler(makeRequest());
    assertEquals(response.status, testCase.status);
    assertEquals(await responseJson(response), { ok: false, code: testCase.code });
    assertEquals(harness.calls, testCase.calls);
    assertEquals(harness.deleteCalls, []);
  }
});

Deno.test('rejects claim mismatch role session_id and every invalid AMR shape', async () => {
  const invalidClaims: Record<string, unknown>[] = [
    { ...validClaims(), sub: 'caller-b' },
    { ...validClaims(), role: 'anon' },
    { ...validClaims(), session_id: '' },
    { ...validClaims(), session_id: null },
    { ...validClaims(), amr: undefined },
    { ...validClaims(), amr: ['password'] },
    { ...validClaims(), amr: [{ method: 'totp', timestamp: NOW_SECONDS }] },
    { ...validClaims(), amr: [{ method: 'password', timestamp: '1000' }] },
    { ...validClaims(), amr: [{ method: 'password', timestamp: Number.NaN }] },
    { ...validClaims(), amr: [{ method: 'password', timestamp: NOW_SECONDS - 301 }] },
    { ...validClaims(), amr: [{ method: 'password', timestamp: NOW_SECONDS + 61 }] },
  ];
  for (const claims of invalidClaims) {
    const harness = createHarness({ claims });
    const response = await harness.handler(makeRequest());
    const expectedCode = claims.sub === 'caller-b' || claims.role === 'anon' ||
        claims.session_id === '' || claims.session_id === null
      ? 'unauthorized'
      : 'reauthentication-required';
    assertEquals(response.status, expectedCode === 'unauthorized' ? 401 : 403);
    assertEquals(await responseJson(response), { ok: false, code: expectedCode });
    assertEquals(harness.deleteCalls, []);
  }
});

Deno.test('accepts password AMR at exactly 300 seconds and 60 seconds future', async () => {
  for (const timestamp of [NOW_SECONDS - 300, NOW_SECONDS + 60]) {
    const harness = createHarness({
      claims: {
        ...validClaims(),
        amr: [
          { method: 'password', timestamp: NOW_SECONDS - 500 },
          { method: 'password', timestamp },
        ],
      },
    });
    assertEquals((await harness.handler(makeRequest())).status, 200);
  }
});

Deno.test('orders getUser getClaims signOutGlobal deleteUser', async () => {
  const harness = createHarness();
  assertEquals((await harness.handler(makeRequest())).status, 200);
  assertEquals(harness.calls, ['getUser', 'getClaims', 'signOutGlobal', 'deleteUser']);
});

Deno.test('never deletes after validation AMR or revocation failure', async () => {
  const cases: HarnessOptions[] = [
    { getUserResult: { kind: 'invalid' } },
    { claims: { ...validClaims(), amr: [] } },
    { revokeResult: { kind: 'rejected' } },
    { revokeResult: { kind: 'session-absent' } },
    { revokeResult: { kind: 'unconfirmed' } },
  ];
  for (const options of cases) {
    const harness = createHarness(options);
    await harness.handler(makeRequest());
    assertEquals(harness.deleteCalls, []);
  }
});

Deno.test('maps revoked absent rejected and unconfirmed revocation', async () => {
  const cases: Array<{ result: RevokeResult; status: number; code?: string }> = [
    { result: { kind: 'revoked' }, status: 200 },
    { result: { kind: 'session-absent' }, status: 503, code: 'revocation-unconfirmed' },
    { result: { kind: 'rejected' }, status: 502, code: 'revocation-failed' },
    { result: { kind: 'unconfirmed' }, status: 503, code: 'revocation-unconfirmed' },
  ];
  for (const testCase of cases) {
    const harness = createHarness({ revokeResult: testCase.result });
    const response = await harness.handler(makeRequest());
    assertEquals(response.status, testCase.status);
    if (testCase.code) {
      assertEquals(await responseJson(response), { ok: false, code: testCase.code });
    }
  }
});

Deno.test('hard-deletes the exact verified caller once', async () => {
  const harness = createHarness({ callerId: 'derived-caller' });
  assertEquals((await harness.handler(makeRequest())).status, 200);
  assertEquals(harness.signOutCalls, [CALLER_JWT]);
  assertEquals(harness.deleteCalls, ['derived-caller']);
});

Deno.test('maps already absent and one post-error lookup honestly', async () => {
  const cases: Array<{
    deleteResult: DeleteResult;
    lookupResult?: LookupResult;
    status: number;
    body: unknown;
    lookupCount: number;
  }> = [
    {
      deleteResult: { kind: 'already-absent' },
      status: 200,
      body: { ok: true, outcome: 'deleted' },
      lookupCount: 0,
    },
    {
      deleteResult: { kind: 'unconfirmed' },
      lookupResult: { kind: 'absent' },
      status: 200,
      body: { ok: true, outcome: 'deleted' },
      lookupCount: 1,
    },
    {
      deleteResult: { kind: 'unconfirmed' },
      lookupResult: { kind: 'present' },
      status: 409,
      body: { ok: false, code: 'revoked-not-deleted' },
      lookupCount: 1,
    },
    {
      deleteResult: { kind: 'unconfirmed' },
      lookupResult: { kind: 'unavailable' },
      status: 503,
      body: { ok: false, code: 'revoked-delete-unconfirmed' },
      lookupCount: 1,
    },
  ];
  for (const testCase of cases) {
    const harness = createHarness({
      deleteResult: testCase.deleteResult,
      lookupResult: testCase.lookupResult,
    });
    const response = await harness.handler(makeRequest());
    assertEquals(response.status, testCase.status);
    assertEquals(await responseJson(response), testCase.body);
    assertEquals(harness.deleteCalls.length, 1);
    assertEquals(harness.lookupCalls.length, testCase.lookupCount);
  }
});

Deno.test('returns fixed JSON CORS no-store headers and fixed logs only', async () => {
  const harness = createHarness();
  const response = await harness.handler(makeRequest());
  assertEquals(await responseJson(response), { ok: true, outcome: 'deleted' });
  assertEquals(response.headers.get('content-type'), 'application/json');
  assertEquals(response.headers.get('cache-control'), 'no-store');
  assertEquals(response.headers.get('access-control-allow-origin'), '*');
  assertEquals(harness.logs, ['delete-current-user', 'deleted']);
  assert(harness.logs.every((value) => !value.includes(CALLER_JWT)));
});

Deno.test('runtime accepts preflight without configuration or client creation', async () => {
  let createClientCalls = 0;
  const runtime = createDeleteCurrentUserRuntimeHandler({
    readEnv: () => undefined,
    createClient: () => {
      createClientCalls += 1;
      throw new Error('must not create client for preflight');
    },
    nowSeconds: () => NOW_SECONDS,
    logFixed: () => undefined,
  });

  const response = await runtime(makeRequest({ method: 'OPTIONS', authorization: null }));
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('access-control-allow-origin'), '*');
  assertEquals(createClientCalls, 0);
});

Deno.test('runtime rejects missing invalid configuration with fixed output only', async () => {
  const cases: Array<(name: string) => string | undefined> = [
    () => undefined,
    (name) => name === 'SUPABASE_URL' ? 'not-a-url' : 'runtime-key-a',
    (name) => name === 'SUPABASE_URL' ? 'https://example.invalid' : '',
  ];

  for (const readEnv of cases) {
    const logs: string[] = [];
    const runtime = createDeleteCurrentUserRuntimeHandler({
      readEnv,
      createClient: () => {
        throw new Error(RUNTIME_RAW_SENTINEL);
      },
      nowSeconds: () => NOW_SECONDS,
      logFixed: (code) => logs.push(code),
    });
    const response = await runtime(makeRequest());
    const rawResponse = await response.clone().text();
    assertEquals(response.status, 500);
    assertEquals(await responseJson(response), {
      ok: false,
      code: 'configuration-failure',
    });
    assertEquals(logs, ['delete-current-user', 'configuration-failure']);
    assert(!rawResponse.includes(RUNTIME_RAW_SENTINEL));
  }
});

Deno.test('runtime validates method body and Bearer before reading configuration', async () => {
  const cases = [
    { request: makeRequest({ method: 'GET' }), status: 405, code: 'method-not-allowed' },
    { request: makeRequest({ body: '{"target":"other"}' }), status: 400, code: 'invalid-request' },
    { request: makeRequest({ authorization: null }), status: 401, code: 'unauthorized' },
  ];
  for (const testCase of cases) {
    let envReads = 0;
    let createClientCalls = 0;
    const runtime = createDeleteCurrentUserRuntimeHandler({
      readEnv: () => {
        envReads += 1;
        return undefined;
      },
      createClient: () => {
        createClientCalls += 1;
        throw new Error('must not create client');
      },
      nowSeconds: () => NOW_SECONDS,
      logFixed: () => undefined,
    });
    const response = await runtime(testCase.request);
    assertEquals(response.status, testCase.status);
    assertEquals(await responseJson(response), {
      ok: false,
      code: testCase.code,
    });
    assertEquals(envReads, 0);
    assertEquals(createClientCalls, 0);
  }
});

Deno.test('runtime creates the server client lazily with storage disabled', async () => {
  const clientOptions: Array<{ url: string; key: string; options: unknown }> = [];
  const dependencies: DeleteCurrentUserRuntimeDependencies = {
    readEnv: (name) => name === 'SUPABASE_URL' ? 'https://example.invalid' : 'runtime-key-a',
    createClient: (url, key, options) => {
      clientOptions.push({ url, key, options });
      return {
        auth: {
          getUser: () => Promise.resolve({ data: { user: null }, error: { status: 401 } }),
          getClaims: () => Promise.resolve({ data: null, error: { status: 401 } }),
          admin: {
            signOut: () => Promise.resolve({ data: null, error: null }),
            deleteUser: () => Promise.resolve({ data: null, error: null }),
            getUserById: () => Promise.resolve({ data: null, error: null }),
          },
        },
      };
    },
    nowSeconds: () => NOW_SECONDS,
    logFixed: () => undefined,
  };
  const runtime = createDeleteCurrentUserRuntimeHandler(dependencies);

  assertEquals(clientOptions, []);
  const response = await runtime(makeRequest());
  assertEquals(response.status, 401);
  assertEquals(clientOptions, [
    {
      url: 'https://example.invalid',
      key: 'runtime-key-a',
      options: {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    },
  ]);
});

Deno.test('runtime logging failure cannot relabel a completed deletion', async () => {
  const runtime = createDeleteCurrentUserRuntimeHandler({
    readEnv: (name) => name === 'SUPABASE_URL' ? 'https://example.invalid' : 'runtime-key-a',
    createClient: () => ({
      auth: {
        getUser: () =>
          Promise.resolve({
            data: { user: { id: CALLER_ID } },
            error: null,
          }),
        getClaims: () =>
          Promise.resolve({
            data: { claims: validClaims() },
            error: null,
          }),
        admin: {
          signOut: () => Promise.resolve({ data: null, error: null }),
          deleteUser: () => Promise.resolve({ data: null, error: null }),
          getUserById: () => Promise.resolve({ data: null, error: null }),
        },
      },
    }),
    nowSeconds: () => NOW_SECONDS,
    logFixed: () => {
      throw new Error(RUNTIME_RAW_SENTINEL);
    },
  });

  const response = await runtime(makeRequest());
  assertEquals(response.status, 200);
  assertEquals(await responseJson(response), { ok: true, outcome: 'deleted' });
});
