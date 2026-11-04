import { getCsrfToken, isCsrfExemptPath, isMutatingMethod, readCookie } from './csrf.js';

describe('csrf helpers', () => {
  beforeEach(() => {
    // Clear all cookies in the test environment
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  });

  describe('readCookie', () => {
    it('returns null when the cookie is absent', () => {
      expect(readCookie('nope')).toBeNull();
    });

    it('returns the decoded value when present', () => {
      document.cookie = 'csrf_token=abc%20123; path=/';
      expect(readCookie('csrf_token')).toBe('abc 123');
    });

    it('returns null for an empty value', () => {
      document.cookie = 'csrf_token=; path=/';
      expect(readCookie('csrf_token')).toBeNull();
    });
  });

  describe('getCsrfToken', () => {
    it('reads the csrf_token cookie', () => {
      document.cookie = 'csrf_token=tok123; path=/';
      expect(getCsrfToken()).toBe('tok123');
    });

    it('returns null when absent', () => {
      expect(getCsrfToken()).toBeNull();
    });
  });

  describe('isMutatingMethod', () => {
    [
      ['POST', true],
      ['PUT', true],
      ['PATCH', true],
      ['DELETE', true],
      ['GET', false],
      ['HEAD', false],
      ['OPTIONS', false],
    ].forEach(([method, expected]) => {
      it(`${method} -> ${expected}`, () => {
        expect(isMutatingMethod(method)).toBe(expected);
      });
    });

    it('handles lowercase and undefined', () => {
      expect(isMutatingMethod('post')).toBe(true);
      expect(isMutatingMethod(undefined)).toBe(false);
    });
  });

  describe('isCsrfExemptPath', () => {
    it('returns true for auth paths', () => {
      expect(isCsrfExemptPath('/auth/login')).toBe(true);
      expect(isCsrfExemptPath('/auth/register')).toBe(true);
      expect(isCsrfExemptPath('/auth/refresh')).toBe(true);
      expect(isCsrfExemptPath('/auth/logout')).toBe(true);
      expect(isCsrfExemptPath('/auth/me')).toBe(true);
    });

    it('returns false for non-auth paths', () => {
      expect(isCsrfExemptPath('/cart/items')).toBe(false);
      expect(isCsrfExemptPath('/products')).toBe(false);
      expect(isCsrfExemptPath('/orders')).toBe(false);
    });

    it('returns false for undefined/non-string', () => {
      expect(isCsrfExemptPath(undefined)).toBe(false);
      expect(isCsrfExemptPath(null)).toBe(false);
    });
  });
});
