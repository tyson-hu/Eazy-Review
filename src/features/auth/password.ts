/**
 * Client-side password constraints aligned with Supabase GoTrue defaults.
 * Do not invent a substantially stricter policy than the Auth provider.
 */

/** Supabase default minimum password length. */
export const MIN_PASSWORD_LENGTH = 6;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; reason: 'too-short' | 'mismatch' | 'empty' };

export function validateNewPasswordPair(
  password: string,
  confirmPassword: string,
): PasswordValidationResult {
  if (!password || !confirmPassword) {
    return { ok: false, reason: 'empty' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: 'too-short' };
  }
  if (password !== confirmPassword) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true };
}
