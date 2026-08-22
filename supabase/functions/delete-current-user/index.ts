import { createClient } from '@supabase/supabase-js';

import { jsonResponse } from './contracts.ts';
import { createDeleteCurrentUserOperation, validateDeleteCurrentUserRequest } from './handler.ts';
import { createSupabaseAuthAdminAdapter } from './supabaseAuthAdminAdapter.ts';
import type { SupabaseAuthAdminClient } from './supabaseAuthAdminAdapter.ts';

export type DeleteCurrentUserRuntimeDependencies = {
  readEnv(name: string): string | undefined;
  createClient(
    url: string,
    key: string,
    options: {
      auth: {
        autoRefreshToken: false;
        persistSession: false;
        detectSessionInUrl: false;
      };
    },
  ): SupabaseAuthAdminClient;
  nowSeconds(): number;
  logFixed(code: string): void;
};

export function createDeleteCurrentUserRuntimeHandler(
  dependencies: DeleteCurrentUserRuntimeDependencies,
): (request: Request) => Promise<Response> {
  const configurationFailure = (): Response => {
    for (const code of ['delete-current-user', 'configuration-failure']) {
      try {
        dependencies.logFixed(code);
      } catch {
        // Diagnostics must never change the fixed response contract.
      }
    }
    return jsonResponse({ ok: false, code: 'configuration-failure' }, 500);
  };

  return async (request) => {
    const validation = await validateDeleteCurrentUserRequest(
      request,
      dependencies.logFixed,
    );
    if (validation.kind === 'response') return validation.response;

    const url = dependencies.readEnv('SUPABASE_URL');
    const key = dependencies.readEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (url == null || key == null || key.trim().length === 0) {
      return configurationFailure();
    }
    let client: SupabaseAuthAdminClient;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return configurationFailure();
      }
      client = dependencies.createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });
    } catch {
      return configurationFailure();
    }
    const operation = createDeleteCurrentUserOperation({
      auth: createSupabaseAuthAdminAdapter(client),
      nowSeconds: dependencies.nowSeconds,
      logFixed: dependencies.logFixed,
    });
    return await operation(validation.jwt);
  };
}

if (import.meta.main) {
  Deno.serve(
    createDeleteCurrentUserRuntimeHandler({
      readEnv: (name) => Deno.env.get(name),
      createClient: (url, key, options) =>
        createClient(url, key, options) as unknown as SupabaseAuthAdminClient,
      nowSeconds: () => Math.floor(Date.now() / 1_000),
      logFixed: (code) => console.info(code),
    }),
  );
}
