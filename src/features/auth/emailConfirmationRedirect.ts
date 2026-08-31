import * as Linking from 'expo-linking';

/**
 * App path used as the signup email-confirmation callback target.
 * Reuses the existing Sign In route; AuthProvider processes callback tokens
 * from the initial/open URL regardless of which auth screen is showing.
 */
export const EMAIL_CONFIRMATION_PATH = '/auth/sign-in';

/**
 * Local/development redirect for Supabase signup confirmation emails.
 *
 * Uses the app scheme from `app.json` (`eazyreview`) via expo-linking so a
 * physical device opens the app instead of an unreachable localhost web URL.
 * Staging and production redirect allowlists remain human-applied.
 */
export function getEmailConfirmationRedirectTo(): string {
  return Linking.createURL(EMAIL_CONFIRMATION_PATH);
}
