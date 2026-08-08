import { getSupabase } from '@/src/lib/supabase/client';
import type { AppSupabaseClient } from '@/src/lib/supabase/createClient';
import type { AccountProfile } from '@/src/types/account';

export type ProfileRequestOptions = {
  client?: AppSupabaseClient;
  signal?: AbortSignal;
};

/**
 * Reads the signed-in user's own profile via owner RLS.
 * Select only columns needed by Account. Does not affect auth state.
 */
export async function getMyProfile(
  userId: string,
  options?: ProfileRequestOptions,
): Promise<AccountProfile> {
  if (!userId) {
    throw new Error('Profile requires an authenticated user id.');
  }

  const client = options?.client ?? getSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('id, display_name, username, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();

  // AbortSignal is intentionally unused: the current PostgREST builder
  // typing does not expose abortSignal on maybeSingle chains. TanStack
  // Query still cancels observers; late network responses map to the
  // current principal via user-scoped keys.

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Profile is unavailable.');
  }

  return {
    id: data.id,
    displayName: data.display_name,
    username: data.username,
    avatarUrl: data.avatar_url,
    joinedAt: data.created_at,
  };
}

/** Deterministic joined-date label (UTC month + year). */
export function formatMemberSince(joinedAt: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(joinedAt));
}
