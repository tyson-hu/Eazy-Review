import { assert, assertEquals } from '@std/assert';

import {
  createSupabaseAuthAdminAdapter,
  type SupabaseAuthAdminClient,
} from './supabaseAuthAdminAdapter.ts';

const JWT = 'jwt-a';
const USER_ID = 'caller-a';
const RAW_SENTINEL = 'raw-provider-detail-must-not-propagate';

type FakeOptions = {
  getUser?: () => unknown | Promise<unknown>;
  getClaims?: () => unknown | Promise<unknown>;
  signOut?: () => unknown | Promise<unknown>;
  deleteUser?: () => unknown | Promise<unknown>;
  getUserById?: () => unknown | Promise<unknown>;
};

function createFake(options: FakeOptions = {}) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client: SupabaseAuthAdminClient = {
    auth: {
      async getUser(jwt) {
        calls.push({ method: 'getUser', args: [jwt] });
        return await (options.getUser?.() ??
          Promise.resolve({ data: { user: { id: USER_ID } }, error: null }));
      },
      async getClaims(jwt) {
        calls.push({ method: 'getClaims', args: [jwt] });
        return await (options.getClaims?.() ??
          Promise.resolve({ data: { claims: { sub: USER_ID } }, error: null }));
      },
      admin: {
        async signOut(jwt, scope) {
          calls.push({ method: 'signOut', args: [jwt, scope] });
          return await (options.signOut?.() ?? Promise.resolve({ data: null, error: null }));
        },
        async deleteUser(id, shouldSoftDelete) {
          calls.push({ method: 'deleteUser', args: [id, shouldSoftDelete] });
          return await (options.deleteUser?.() ??
            Promise.resolve({ data: { user: { id } }, error: null }));
        },
        async getUserById(id) {
          calls.push({ method: 'getUserById', args: [id] });
          return await (options.getUserById?.() ??
            Promise.resolve({ data: { user: { id } }, error: null }));
        },
      },
    },
  };
  return { client, calls };
}

function authError(options: {
  name?: string;
  status?: number;
  code?: string;
}): Record<string, unknown> {
  return { message: RAW_SENTINEL, ...options };
}

Deno.test('calls every SDK method with the exact protected arguments', async () => {
  const fake = createFake();
  const adapter = createSupabaseAuthAdminAdapter(fake.client);
  await adapter.getUser(JWT);
  await adapter.getClaims(JWT);
  await adapter.signOutGlobal(JWT);
  await adapter.deleteUser(USER_ID);
  await adapter.getUserById(USER_ID);
  assertEquals(fake.calls, [
    { method: 'getUser', args: [JWT] },
    { method: 'getClaims', args: [JWT] },
    { method: 'signOut', args: [JWT, 'global'] },
    { method: 'deleteUser', args: [USER_ID, false] },
    { method: 'getUserById', args: [USER_ID] },
  ]);
});

Deno.test('classifies returned and thrown user verification separately', async () => {
  const cases: Array<{ response: () => unknown | Promise<unknown>; expected: unknown }> = [
    {
      response: () => ({ data: { user: { id: USER_ID } }, error: null }),
      expected: { kind: 'verified', value: { id: USER_ID } },
    },
    {
      response: () => ({ data: { user: null }, error: authError({ status: 401 }) }),
      expected: { kind: 'invalid' },
    },
    {
      response: () => ({ data: { user: null }, error: authError({ status: 500 }) }),
      expected: { kind: 'unavailable' },
    },
    { response: () => ({ data: { user: null }, error: null }), expected: { kind: 'unavailable' } },
    {
      response: () => {
        throw new Error(RAW_SENTINEL);
      },
      expected: { kind: 'unavailable' },
    },
  ];
  for (const testCase of cases) {
    const fake = createFake({ getUser: testCase.response });
    assertEquals(await createSupabaseAuthAdminAdapter(fake.client).getUser(JWT), testCase.expected);
  }
});

Deno.test('classifies verified claims invalid claims and unavailable claims', async () => {
  const claims = { sub: USER_ID, role: 'authenticated' };
  const cases: Array<{ response: () => unknown | Promise<unknown>; expected: unknown }> = [
    {
      response: () => ({ data: { claims }, error: null }),
      expected: { kind: 'verified', value: claims },
    },
    {
      response: () => ({ data: null, error: authError({ status: 400 }) }),
      expected: { kind: 'invalid' },
    },
    {
      response: () => ({ data: null, error: authError({ status: 503 }) }),
      expected: { kind: 'unavailable' },
    },
    { response: () => ({ data: null, error: null }), expected: { kind: 'unavailable' } },
    {
      response: () => {
        throw new Error(RAW_SENTINEL);
      },
      expected: { kind: 'unavailable' },
    },
  ];
  for (const testCase of cases) {
    const fake = createFake({ getClaims: testCase.response });
    assertEquals(
      await createSupabaseAuthAdminAdapter(fake.client).getClaims(JWT),
      testCase.expected,
    );
  }
});

Deno.test('keeps retryable verification responses unavailable', async () => {
  for (const status of [408, 425, 429]) {
    const userFake = createFake({
      getUser: () => ({ data: { user: null }, error: authError({ status }) }),
    });
    assertEquals(await createSupabaseAuthAdminAdapter(userFake.client).getUser(JWT), {
      kind: 'unavailable',
    });
    const claimsFake = createFake({
      getClaims: () => ({ data: null, error: authError({ status }) }),
    });
    assertEquals(await createSupabaseAuthAdminAdapter(claimsFake.client).getClaims(JWT), {
      kind: 'unavailable',
    });
  }
});

Deno.test('classifies global sign-out only from stable name code and status', async () => {
  const cases: Array<{ response: () => unknown | Promise<unknown>; expected: unknown }> = [
    { response: () => ({ data: null, error: null }), expected: { kind: 'revoked' } },
    {
      response: () => ({
        data: null,
        error: authError({ name: 'AuthSessionMissingError', status: 400 }),
      }),
      expected: { kind: 'session-absent' },
    },
    {
      response: () => ({
        data: null,
        error: authError({ code: 'session_not_found', status: 404 }),
      }),
      expected: { kind: 'session-absent' },
    },
    {
      response: () => ({ data: null, error: authError({ status: 400 }) }),
      expected: { kind: 'rejected' },
    },
    {
      response: () => ({ data: null, error: authError({ status: 422 }) }),
      expected: { kind: 'rejected' },
    },
    ...[401, 403, 404, 500].map((status) => ({
      response: () => ({ data: null, error: authError({ status }) }),
      expected: { kind: 'unconfirmed' },
    })),
    { response: () => ({ data: null, error: authError({}) }), expected: { kind: 'unconfirmed' } },
    {
      response: () => {
        throw new Error(RAW_SENTINEL);
      },
      expected: { kind: 'unconfirmed' },
    },
  ];
  for (const testCase of cases) {
    const fake = createFake({ signOut: testCase.response });
    assertEquals(
      await createSupabaseAuthAdminAdapter(fake.client).signOutGlobal(JWT),
      testCase.expected,
    );
  }
});

Deno.test('classifies hard delete and lookup without retry or raw detail', async () => {
  const deleteCases: Array<{ response: () => unknown | Promise<unknown>; expected: unknown }> = [
    {
      response: () => ({ data: { user: { id: USER_ID } }, error: null }),
      expected: { kind: 'deleted' },
    },
    {
      response: () => ({
        data: { user: null },
        error: authError({ code: 'user_not_found', status: 404 }),
      }),
      expected: { kind: 'already-absent' },
    },
    {
      response: () => ({
        data: { user: null },
        error: authError({ code: 'user_not_found', status: 500 }),
      }),
      expected: { kind: 'unconfirmed' },
    },
    {
      response: () => ({ data: { user: null }, error: authError({ status: 400 }) }),
      expected: { kind: 'unconfirmed' },
    },
    {
      response: () => {
        throw new Error(RAW_SENTINEL);
      },
      expected: { kind: 'unconfirmed' },
    },
  ];
  for (const testCase of deleteCases) {
    const fake = createFake({ deleteUser: testCase.response });
    const result = await createSupabaseAuthAdminAdapter(fake.client).deleteUser(USER_ID);
    assertEquals(result, testCase.expected);
    assert(!JSON.stringify(result).includes(RAW_SENTINEL));
    assertEquals(fake.calls.length, 1);
  }

  const lookupCases: Array<{ response: () => unknown | Promise<unknown>; expected: unknown }> = [
    {
      response: () => ({ data: { user: { id: USER_ID } }, error: null }),
      expected: { kind: 'present' },
    },
    {
      response: () => ({
        data: { user: null },
        error: authError({ code: 'user_not_found', status: 404 }),
      }),
      expected: { kind: 'absent' },
    },
    {
      response: () => ({
        data: { user: null },
        error: authError({ code: 'user_not_found', status: 500 }),
      }),
      expected: { kind: 'unavailable' },
    },
    { response: () => ({ data: { user: null }, error: null }), expected: { kind: 'unavailable' } },
    {
      response: () => {
        throw new Error(RAW_SENTINEL);
      },
      expected: { kind: 'unavailable' },
    },
  ];
  for (const testCase of lookupCases) {
    const fake = createFake({ getUserById: testCase.response });
    const result = await createSupabaseAuthAdminAdapter(fake.client).getUserById(USER_ID);
    assertEquals(result, testCase.expected);
    assert(!JSON.stringify(result).includes(RAW_SENTINEL));
    assertEquals(fake.calls.length, 1);
  }
});
