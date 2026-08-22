import { corsHeaders } from '@supabase/supabase-js/cors';

import {
  type AuthBoundary,
  type DeleteCurrentUserCode,
  jsonResponse,
  newestFreshPasswordTimestamp,
} from './contracts.ts';

type DeleteCurrentUserHandlerDependencies = {
  auth: AuthBoundary;
  nowSeconds: () => number;
  logFixed: (code: string) => void;
};

type ValidatedDeleteCurrentUserRequest =
  | { kind: 'validated'; jwt: string }
  | { kind: 'response'; response: Response };

function createFixedResponses(logFixed: (code: string) => void) {
  const logOutcome = (outcome: string) => {
    for (const code of ['delete-current-user', outcome]) {
      try {
        logFixed(code);
      } catch {
        // Logging is non-authoritative and must never change operation semantics.
      }
    }
  };

  return {
    fail(
      status: number,
      code: DeleteCurrentUserCode,
      extra: HeadersInit = {},
    ): Response {
      logOutcome(code);
      return jsonResponse({ ok: false, code }, status, extra);
    },
    deleted(): Response {
      logOutcome('deleted');
      return jsonResponse({ ok: true, outcome: 'deleted' }, 200);
    },
    preflight(): Response {
      logOutcome('preflight');
      return new Response(null, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store',
        },
      });
    },
  };
}

export async function validateDeleteCurrentUserRequest(
  request: Request,
  logFixed: (code: string) => void,
): Promise<ValidatedDeleteCurrentUserRequest> {
  const responses = createFixedResponses(logFixed);

  if (request.method === 'OPTIONS') {
    return { kind: 'response', response: responses.preflight() };
  }

  if (request.method !== 'POST') {
    return {
      kind: 'response',
      response: responses.fail(405, 'method-not-allowed', {
        Allow: 'POST, OPTIONS',
      }),
    };
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return {
      kind: 'response',
      response: responses.fail(400, 'invalid-request'),
    };
  }
  if (body.trim().length > 0) {
    return {
      kind: 'response',
      response: responses.fail(400, 'invalid-request'),
    };
  }

  const authorization = request.headers.get('Authorization');
  const bearer = authorization == null ? null : /^Bearer ([^\s,]+)$/.exec(authorization);
  if (bearer == null) {
    return {
      kind: 'response',
      response: responses.fail(401, 'unauthorized'),
    };
  }
  return { kind: 'validated', jwt: bearer[1] };
}

export function createDeleteCurrentUserOperation(
  dependencies: DeleteCurrentUserHandlerDependencies,
): (jwt: string) => Promise<Response> {
  const { auth, nowSeconds, logFixed } = dependencies;
  const { fail, deleted } = createFixedResponses(logFixed);

  return async (jwt: string) => {
    let userResult;
    try {
      userResult = await auth.getUser(jwt);
    } catch {
      return fail(503, 'validation-unavailable');
    }
    if (userResult.kind === 'invalid') {
      return fail(401, 'unauthorized');
    }
    if (userResult.kind === 'unavailable') {
      return fail(503, 'validation-unavailable');
    }

    let claimsResult;
    try {
      claimsResult = await auth.getClaims(jwt);
    } catch {
      return fail(503, 'validation-unavailable');
    }
    if (claimsResult.kind === 'invalid') {
      return fail(401, 'unauthorized');
    }
    if (claimsResult.kind === 'unavailable') {
      return fail(503, 'validation-unavailable');
    }

    const claims = claimsResult.value;
    if (
      claims.sub !== userResult.value.id ||
      claims.role !== 'authenticated' ||
      typeof claims.session_id !== 'string' ||
      claims.session_id.trim().length === 0
    ) {
      return fail(401, 'unauthorized');
    }
    if (newestFreshPasswordTimestamp(claims.amr, nowSeconds()) === null) {
      return fail(403, 'reauthentication-required');
    }

    let revokeResult;
    try {
      revokeResult = await auth.signOutGlobal(jwt);
    } catch {
      return fail(503, 'revocation-unconfirmed');
    }
    if (revokeResult.kind === 'rejected') {
      return fail(502, 'revocation-failed');
    }
    if (revokeResult.kind === 'session-absent' || revokeResult.kind === 'unconfirmed') {
      return fail(503, 'revocation-unconfirmed');
    }

    let deleteResult;
    try {
      deleteResult = await auth.deleteUser(userResult.value.id);
    } catch {
      deleteResult = { kind: 'unconfirmed' } as const;
    }
    if (deleteResult.kind === 'deleted' || deleteResult.kind === 'already-absent') {
      return deleted();
    }

    let lookupResult;
    try {
      lookupResult = await auth.getUserById(userResult.value.id);
    } catch {
      lookupResult = { kind: 'unavailable' } as const;
    }
    if (lookupResult.kind === 'absent') {
      return deleted();
    }
    if (lookupResult.kind === 'present') {
      return fail(409, 'revoked-not-deleted');
    }
    return fail(503, 'revoked-delete-unconfirmed');
  };
}

export function createDeleteCurrentUserHandler(
  dependencies: DeleteCurrentUserHandlerDependencies,
): (request: Request) => Promise<Response> {
  const operation = createDeleteCurrentUserOperation(dependencies);
  return async (request: Request) => {
    const validation = await validateDeleteCurrentUserRequest(
      request,
      dependencies.logFixed,
    );
    return validation.kind === 'response' ? validation.response : await operation(validation.jwt);
  };
}
