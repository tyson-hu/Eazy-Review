import * as Linking from 'expo-linking';

/**
 * Local/development redirect for Supabase signup confirmation emails.
 *
 * Uses the app scheme from `app.json` (`eazyreview`) via expo-linking so a
 * physical device opens the app instead of an unreachable localhost web URL.
 * Staging and production redirect allowlists remain human-applied.
 */
export function getEmailConfirmationRedirectTo(): string {
  return Linking.createURL('auth/sign-in');
}
