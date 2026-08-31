import { isValidEmailFormat, normalizeEmail } from '@/src/features/auth/email';
import { AUTH_USER_MESSAGES } from '@/src/features/auth/errors';
import {
    MIN_PASSWORD_LENGTH,
    validateNewPasswordPair,
} from '@/src/features/auth/password';
import {
    authCallbackDiagnosticLabel,
    classifyAuthCallback,
    isAuthCallbackUrl,
    parseAuthCallbackParams,
} from '@/src/features/auth/recoveryUrl';

describe('recovery helpers', () => {
  it('normalizes email consistently', () => {
    expect(normalizeEmail('  A@Example.COM ')).toBe('a@example.com');
  });

  it('rejects malformed emails', () => {
    expect(isValidEmailFormat('a@b.c')).toBe(true);
    expect(isValidEmailFormat('not-email')).toBe(false);
    expect(isValidEmailFormat('a@b')).toBe(false);
    expect(isValidEmailFormat('')).toBe(false);
  });

  it('validates password pairs without logging passwords', () => {
    expect(validateNewPasswordPair('abcdef', 'abcdef')).toEqual({ ok: true });
    expect(validateNewPasswordPair('abc', 'abc')).toEqual({
      ok: false,
      reason: 'too-short',
    });
    expect(validateNewPasswordPair('abcdef', 'abcdeg')).toEqual({
      ok: false,
      reason: 'mismatch',
    });
    expect(MIN_PASSWORD_LENGTH).toBe(6);
  });

  it('parses recovery hash tokens without retaining secrets in labels', () => {
    const params = parseAuthCallbackParams(
      'eazyreview://auth/reset-password#access_token=SECRET&refresh_token=REF&type=recovery',
    );
    expect(params.type).toBe('recovery');
    expect(params.accessToken).toBe('SECRET');
    expect(authCallbackDiagnosticLabel(params)).toBe('tokens-recovery');
    expect(authCallbackDiagnosticLabel(params)).not.toContain('SECRET');
  });

  it('classifies provider error query params as error', () => {
    const params = parseAuthCallbackParams(
      'eazyreview://auth/reset-password?error=access_denied&error_code=otp_expired',
    );
    expect(classifyAuthCallback(params).kind).toBe('error');
  });

  it('detects auth callback URLs by path markers only', () => {
    expect(
      isAuthCallbackUrl('eazyreview://auth/reset-password?code=x'),
    ).toBe(true);
    expect(
      isAuthCallbackUrl(
        'eazyreview://auth/sign-in#access_token=SECRET&refresh_token=REF&type=signup',
      ),
    ).toBe(true);
    expect(isAuthCallbackUrl('eazyreview:///product/1')).toBe(false);
  });

  it('keeps recovery success copy non-enumerating', () => {
    const copy = AUTH_USER_MESSAGES.recoveryRequestSent.toLowerCase();
    expect(copy).toContain('if an eazy review account exists');
    expect(copy).not.toMatch(/no account|not found|email exists|user not found/);
  });
});
