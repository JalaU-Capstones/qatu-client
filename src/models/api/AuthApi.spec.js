import { AuthApi } from './AuthApi.js';

describe('AuthApi', () => {
  let api;

  beforeEach(() => {
    api = new AuthApi();
  });

  afterEach(() => {
    if (window.fetch && window.fetch.and) {
      // Clean up spy if any
    }
  });

  describe('register', () => {
    it('should send POST request to /auth/register with correct headers and payload', async () => {
      const mockResponseData = {
        data: {
          user: { id: 'u1', email: 'user@example.com', username: 'zzz' },
          profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
          roles: ['buyer'],
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 201,
        json: async () => mockResponseData,
      });

      const payload = {
        email: 'user@example.com',
        password: 'Password123!',
        username: 'zzz',
        full_name: 'Usuario ZZZ',
      };

      const result = await api.register(payload);

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/auth\/register$/),
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(payload),
        })
      );
      expect(result).toEqual(mockResponseData);
    });

    it('should throw an error with backend message when response is not ok', async () => {
      const errorPayload = {
        error: {
          code: 'CONFLICT',
          message: 'A resource with these attributes already exists',
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 409,
        json: async () => errorPayload,
      });

      try {
        await api.register({
          email: 'user@example.com',
          password: 'Password123!',
          username: 'zzz',
        });
        fail('Expected api.register to throw an error');
      } catch (err) {
        expect(err.message).toBe('A resource with these attributes already exists');
        expect(err.status).toBe(409);
        expect(err.data).toEqual(errorPayload);
      }
    });

    it('should capture field validation message from details array if available', async () => {
      const validationErrorPayload = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [{ field: 'username', message: 'Username must be at least 3 characters' }],
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 400,
        json: async () => validationErrorPayload,
      });

      try {
        await api.register({
          email: 'user@example.com',
          password: 'Password123!',
          username: 'ab',
        });
        fail('Expected api.register to throw an error');
      } catch (err) {
        expect(err.message).toBe('Username must be at least 3 characters');
        expect(err.status).toBe(400);
      }
    });
  });

  describe('login', () => {
    it('should send POST request to /auth/login with credentials', async () => {
      const mockLoginResponse = {
        data: {
          user: { id: 'u2', email: 'user@example.com', username: 'zzz' },
          profile: { id: 'u2', username: 'zzz', full_name: 'Usuario ZZZ' },
          roles: ['buyer'],
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => mockLoginResponse,
      });

      const credentials = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const result = await api.login(credentials);

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/auth\/login$/),
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(credentials),
        })
      );
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw error when credentials are invalid', async () => {
      const errorPayload = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 401,
        json: async () => errorPayload,
      });

      try {
        await api.login({ email: 'user@example.com', password: 'badpassword' });
        fail('Expected api.login to throw an error');
      } catch (err) {
        expect(err.message).toBe('Invalid email or password');
        expect(err.status).toBe(401);
        expect(err.data).toEqual(errorPayload);
      }
    });
  });

  describe('me', () => {
    it('should fetch current user profile via GET /auth/me and return parsed data on 200', async () => {
      const mockMeResponse = {
        data: {
          user: { id: 'u3', email: 'me@example.com', username: 'meuser' },
          profile: { id: 'u3', username: 'meuser', full_name: 'Me User' },
          roles: ['buyer', 'seller'],
        },
        meta: {},
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => mockMeResponse,
      });

      const result = await api.me();

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/auth\/me$/),
        jasmine.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockMeResponse);
    });

    it('should throw error with status and data on non-ok (e.g. 401)', async () => {
      const errorPayload = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'No active session',
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 401,
        json: async () => errorPayload,
      });

      try {
        await api.me();
        fail('Expected api.me to throw');
      } catch (err) {
        expect(err.message).toBe('No active session');
        expect(err.status).toBe(401);
        expect(err.data).toEqual(errorPayload);
      }
    });
  });

  describe('refresh', () => {
    it('should call POST /auth/refresh and return parsed data on 200', async () => {
      const mockRefreshResponse = {
        data: {
          user: { id: 'u4', email: 'refresh@example.com' },
          profile: { id: 'u4' },
          roles: ['buyer'],
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => mockRefreshResponse,
      });

      const result = await api.refresh();

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/auth\/refresh$/),
        jasmine.objectContaining({
          method: 'POST',
        })
      );
      expect(result).toEqual(mockRefreshResponse);
    });

    it('should throw error with status and data when refresh fails', async () => {
      const errorPayload = {
        error: {
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token expired',
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 401,
        json: async () => errorPayload,
      });

      try {
        await api.refresh();
        fail('Expected api.refresh to throw');
      } catch (err) {
        expect(err.message).toBe('Refresh token expired');
        expect(err.status).toBe(401);
        expect(err.data).toEqual(errorPayload);
      }
    });
  });

  describe('logout', () => {
    it('should send POST to /auth/logout and resolve on 204', async () => {
      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 204,
        json: async () => ({}),
      });

      await expectAsync(api.logout()).toBeResolved();

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/auth\/logout$/),
        jasmine.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw error when logout fails with non-204 non-ok response', async () => {
      const errorPayload = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Server error logging out',
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 500,
        json: async () => errorPayload,
      });

      try {
        await api.logout();
        fail('Expected api.logout to throw');
      } catch (err) {
        expect(err.message).toBe('Server error logging out');
        expect(err.status).toBe(500);
        expect(err.data).toEqual(errorPayload);
      }
    });
  });
});
