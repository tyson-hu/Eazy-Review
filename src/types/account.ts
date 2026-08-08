/** Owner-only Account profile view model (maps from public.profiles). */
export type AccountProfile = {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  /** ISO timestamp from non-null profiles.created_at. */
  joinedAt: string;
};
