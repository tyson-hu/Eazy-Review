import { sanitizeReturnPath } from '@/src/features/auth/returnPath';

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
});
