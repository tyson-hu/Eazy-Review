import {
  DEFAULT_RETURN_PATH,
  dismissAuthToReturnPath,
  productDetailReturnPath,
  sanitizeReturnPath,
} from '@/src/features/auth/returnPath';

const VALID_PRODUCT =
  '/product/11111111-1111-4111-8111-111111111111';

describe('sanitizeReturnPath', () => {
  it('allows a valid product detail path', () => {
    expect(sanitizeReturnPath(VALID_PRODUCT)).toBe(VALID_PRODUCT);
  });

  it('rejects external and scheme URLs', () => {
    expect(sanitizeReturnPath('https://evil.example/phish')).toBe(
      '/(tabs)/browse',
    );
    expect(sanitizeReturnPath('http://localhost/x')).toBe('/(tabs)/browse');
    expect(sanitizeReturnPath('javascript:alert(1)')).toBe('/(tabs)/browse');
    expect(sanitizeReturnPath('//evil.example')).toBe('/(tabs)/browse');
  });

  it('rejects malformed product ids', () => {
    expect(sanitizeReturnPath('/product/not-a-uuid')).toBe('/(tabs)/browse');
    expect(sanitizeReturnPath('/product/../../etc/passwd')).toBe(
      '/(tabs)/browse',
    );
  });

  it('allows Account and defaults missing values', () => {
    expect(sanitizeReturnPath('/(tabs)/account')).toBe('/(tabs)/account');
    expect(sanitizeReturnPath(undefined)).toBe('/(tabs)/browse');
    expect(sanitizeReturnPath('')).toBe('/(tabs)/browse');
  });

  it('maps rate-style product return paths to product detail (not /rate)', () => {
    // Rate gate already returns productDetailReturnPath, not /rate.
    expect(productDetailReturnPath('11111111-1111-4111-8111-111111111111')).toBe(
      VALID_PRODUCT,
    );
    expect(sanitizeReturnPath(`${VALID_PRODUCT}/rate`)).toBe(
      DEFAULT_RETURN_PATH,
    );
  });
});

describe('dismissAuthToReturnPath (navigation intent)', () => {
  /**
   * Unit tests assert the intended router action only. A mocked router cannot
   * prove native stack unwinding; physical-device re-verification is required
   * for the Product → Back → Browse stack.
   */
  it('Product → Sign In → success uses dismissTo (not replace/push)', () => {
    const dismissTo = jest.fn();
    const replace = jest.fn();
    const push = jest.fn();
    const router = { dismissTo, replace, push };

    const destination = dismissAuthToReturnPath(router, VALID_PRODUCT);

    expect(destination).toBe(VALID_PRODUCT);
    expect(dismissTo).toHaveBeenCalledWith(VALID_PRODUCT);
    expect(dismissTo).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('Product → Sign In → Sign Up → success still targets product via dismissTo', () => {
    const dismissTo = jest.fn();
    // Sign-up reuses the same returnTo; one dismissTo should unwind all auth
    // screens above the existing Product route.
    dismissAuthToReturnPath({ dismissTo }, VALID_PRODUCT);
    expect(dismissTo).toHaveBeenCalledWith(VALID_PRODUCT);
  });

  it('Account → Sign In → success dismisses to Account without replace push', () => {
    const dismissTo = jest.fn();
    const replace = jest.fn();
    dismissAuthToReturnPath(
      { dismissTo, replace } as { dismissTo: (href: string) => void },
      '/(tabs)/account',
    );
    expect(dismissTo).toHaveBeenCalledWith('/(tabs)/account');
    expect(replace).not.toHaveBeenCalled();
  });

  it('Rate → Sign In → success returns to Product via sanitized path', () => {
    const dismissTo = jest.fn();
    const returnTo = productDetailReturnPath(
      '11111111-1111-4111-8111-111111111111',
    );
    dismissAuthToReturnPath({ dismissTo }, returnTo);
    expect(dismissTo).toHaveBeenCalledWith(VALID_PRODUCT);
    expect(dismissTo.mock.calls[0]?.[0]).not.toContain('/rate');
  });

  it('invalid/external returnTo still resolves to the safe default', () => {
    const dismissTo = jest.fn();
    const destination = dismissAuthToReturnPath(
      { dismissTo },
      'https://evil.example/steal',
    );
    expect(destination).toBe(DEFAULT_RETURN_PATH);
    expect(dismissTo).toHaveBeenCalledWith(DEFAULT_RETURN_PATH);
  });

  it('direct auth entry with no destination stays on safe default dismiss', () => {
    const dismissTo = jest.fn();
    dismissAuthToReturnPath({ dismissTo }, undefined);
    expect(dismissTo).toHaveBeenCalledWith(DEFAULT_RETURN_PATH);
  });
});
