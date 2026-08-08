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
 * Propagates TanStack Query's AbortSignal through Supabase `.abortSignal`.
 */
export async function getMyProfile(
  userId: string,
  options?: ProfileRequestOptions,
): Promise<AccountProfile> {
  if (!userId) {
    throw new Error('Profile requires an authenticated user id.');
  }

  const client = options?.client ?? getSupabase();
  let query = client
    .from('profiles')
    .select('id, display_name, username, avatar_url, created_at')
    .eq('id', userId);

  if (options?.signal) {
    query = query.abortSignal(options.signal);
  }

  const { data, error } = await query.maybeSingle();

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
