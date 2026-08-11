/**
 * Shared client-side email normalization/validation for auth forms.
 * Matches Task 16 trim behavior; rejects obviously malformed addresses.
 */

/** Trim and lowercase (domain case is commonly normalized for UX). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Lightweight format check — not full RFC 5322.
 * Rejects empty, missing @, missing domain dot, or interior whitespace.
 */
export function isValidEmailFormat(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}
