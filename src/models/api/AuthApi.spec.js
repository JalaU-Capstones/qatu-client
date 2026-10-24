import { AuthApi } from './AuthApi.js';

describe('AuthApi', () => {
  let api;

  beforeEach(() => {
    api = new AuthApi();
  });

  afterEach(() => {
    if (window.fetch && window.fetch.and) {
      // Clean up spy
    }
  });

  describe('register', () => {
    it('should send POST request to /v1/auth/register with correct headers and payload', async () => {
      const mockResponseData = {
        data: {
          token: 'test-token-123',
          user: { id: 'u1', email: 'user@example.com', username: 'zzz' },
          profile: { id: 'u1', username: 'zzz', full_name: 'Usuario ZZZ' },
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

      expect(window.fetch).toHaveBeenCalledWith('/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
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

    it('should prepend custom baseUrl if provided in constructor', async () => {
      const customApi = new AuthApi({ baseUrl: 'https://api.qatu.pe' });
      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await customApi.register({
        email: 'user@example.com',
        password: 'password',
        username: 'zzz',
      });

      expect(window.fetch).toHaveBeenCalledWith(
        'https://api.qatu.pe/v1/auth/register',
        jasmine.any(Object)
      );
    });
  });

  describe('login', () => {
    it('should send POST request to /v1/auth/login with credentials', async () => {
      const mockLoginResponse = {
        data: {
          token: 'auth-jwt-token-999',
          user: { id: 'u2', email: 'user@example.com', username: 'zzz' },
          profile: { id: 'u2', username: 'zzz', full_name: 'Usuario ZZZ' },
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

      expect(window.fetch).toHaveBeenCalledWith('/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
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
      }
    });

    it('should prepend custom baseUrl for login if provided', async () => {
      const customApi = new AuthApi({ baseUrl: 'https://api.qatu.pe' });
      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });

      await customApi.login({
        email: 'user@example.com',
        password: 'password',
      });

      expect(window.fetch).toHaveBeenCalledWith(
        'https://api.qatu.pe/v1/auth/login',
        jasmine.any(Object)
      );
    });
  });
});
