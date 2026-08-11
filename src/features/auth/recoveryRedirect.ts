import * as Linking from 'expo-linking';

/**
 * App path for the recovery completion screen (Expo Router).
 * Must stay aligned with `app/auth/reset-password.tsx`.
 */
export const PASSWORD_RECOVERY_PATH = '/auth/reset-password';

/**
 * Local/development redirect for Supabase password recovery emails.
 *
 * Uses the app scheme from `app.json` (`eazyreview`) via expo-linking.
 * Never hardcodes a production host. Staging and production redirect URLs
 * are document-only until Tasks 25–26 / explicit human approval.
 */
export function getPasswordRecoveryRedirectTo(): string {
  return Linking.createURL(PASSWORD_RECOVERY_PATH);
}

/**
 * Documented redirect matrix (implementation only configures local/dev).
 *
 * | Environment | Redirect URL | Ownership |
 * | --- | --- | --- |
 * | Local Supabase + Development build | `eazyreview://…/auth/reset-password` (via createURL) | Task 18 |
 * | Preview / staging hosted Auth | same scheme after allowlist; configure only with human approval | Tasks 18/25 as approved |
 * | Production | human-applied allowlist only | Tasks 25–26 |
 */
export const RECOVERY_REDIRECT_MATRIX_NOTE =
  'Local/dev recovery uses Linking.createURL("/auth/reset-password") with scheme eazyreview. Production is not configured by Task 18.';
