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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('csrf helpers (recovered 1)', () => {
    beforeEach(() => {
      // Clear all cookies in the test environment
      document.cookie.split(';').forEach((c) => {
        const name = c.split('=')[0].trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
    });

    describe('isMutatingMethod (recovered 2)', () => {
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
    });
  });

  (() => {
    describe('csrf helpers additional branches (recovered 3)', () => {
      afterEach(() => {
        document.cookie.split(';').forEach((cookie) => {
          const name = cookie.split('=')[0].trim();
          if (name) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
      });

      it('finds a cookie between other cookies and ignores similarly named ones', () => {
        document.cookie = 'other=1; path=/';
        document.cookie = 'xcsrf_token=wrong; path=/';
        document.cookie = 'csrf_token=right; path=/';
        document.cookie = 'csrf_token_extra=wrong; path=/';

        expect(readCookie('csrf_token')).toBe('right');
        expect(getCsrfToken()).toBe('right');
      });

      it('decodes encoded values and returns null for empty values', () => {
        document.cookie = `csrf_token=${encodeURIComponent('a b/c')}; path=/`;
        expect(readCookie('csrf_token')).toBe('a b/c');

        document.cookie = 'csrf_token=; path=/';
        expect(getCsrfToken()).toBeNull();
      });

      it('returns null for unknown cookie names', () => {
        expect(readCookie('missing_cookie')).toBeNull();
        expect(readCookie('')).toBeNull();
      });

      it('normalizes mixed-case, null, empty and non-string methods', () => {
        expect(isMutatingMethod('PoSt')).toBe(true);
        expect(isMutatingMethod('delete')).toBe(true);
        expect(isMutatingMethod(null)).toBe(false);
        expect(isMutatingMethod('')).toBe(false);
        expect(isMutatingMethod(' post ')).toBe(false);
        expect(() => isMutatingMethod(42)).toThrowError(TypeError);
      });

      it('exempts only paths under /auth/', () => {
        expect(isCsrfExemptPath('/auth')).toBe(false);
        expect(isCsrfExemptPath('/auth/')).toBe(true);
        expect(isCsrfExemptPath('/Auth/login')).toBe(false);
        expect(isCsrfExemptPath('/auth/login?x=1')).toBe(true);
        expect(isCsrfExemptPath('/oauth/token')).toBe(false);
        expect(isCsrfExemptPath('')).toBe(false);
        expect(isCsrfExemptPath(123)).toBe(false);
        expect(isCsrfExemptPath({})).toBe(false);
      });
    });
  })();
})();
