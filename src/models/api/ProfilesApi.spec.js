import { ProfilesApi } from './ProfilesApi.js';

describe('ProfilesApi', () => {
  let api;

  const sampleProfile = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    username: 'john_doe',
    full_name: 'John Doe',
    avatar_path: 'avatars/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11/avatar.webp',
    bio: 'Artisan collector.',
    locale: 'en',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  };

  beforeEach(() => {
    api = new ProfilesApi();
  });

  describe('getById', () => {
    it('should send GET request to /profiles/:id and return profile envelope', async () => {
      const mockResponse = {
        data: sampleProfile,
        meta: { timestamp: '2026-10-14T12:00:00.000Z' },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await api.getById(sampleProfile.id);

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(new RegExp(`/profiles/${sampleProfile.id}$`)),
        jasmine.objectContaining({
          method: 'GET',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw mapped 404 error ("Perfil no encontrado") when profile is not found', async () => {
      const errorPayload = {
        error: {
          code: 'NOT_FOUND',
          message: 'Profile not found',
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 404,
        json: async () => errorPayload,
      });

      try {
        await api.getById('00000000-0000-4000-8000-000000000000');
        fail('Expected api.getById to throw');
      } catch (err) {
        expect(err.message).toBe('Perfil no encontrado');
        expect(err.status).toBe(404);
        expect(err.data).toEqual(errorPayload);
      }
    });
  });

  describe('updateMe', () => {
    it('should send PATCH request to /profiles/me with JSON payload', async () => {
      const updatedProfile = {
        ...sampleProfile,
        full_name: 'Jane Doe',
        bio: 'Updated bio.',
      };
      const mockResponse = {
        data: updatedProfile,
        meta: { timestamp: '2026-10-14T12:05:00.000Z' },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const payload = {
        full_name: 'Jane Doe',
        bio: 'Updated bio.',
      };

      const result = await api.updateMe(payload);

      expect(window.fetch).toHaveBeenCalledWith(
        jasmine.stringMatching(/\/profiles\/me$/),
        jasmine.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error with field validation detail message on 400 response', async () => {
      const validationPayload = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [
            {
              field: 'bio',
              message: 'bio must be at most 500 characters',
            },
          ],
        },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: false,
        status: 400,
        json: async () => validationPayload,
      });

      try {
        await api.updateMe({ bio: 'x'.repeat(501) });
        fail('Expected api.updateMe to throw');
      } catch (err) {
        expect(err.message).toBe('bio must be at most 500 characters');
        expect(err.status).toBe(400);
        expect(err.data).toEqual(validationPayload);
      }
    });

    it('should map 403 FORBIDDEN and 500 SERVER ERROR to contract messages without exposing internals', async () => {
      spyOn(window, 'fetch').and.returnValues(
        Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
        }),
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Stack trace' } }),
        })
      );

      try {
        await api.updateMe({ bio: 'test' });
        fail('Expected 403 to throw');
      } catch (err) {
        expect(err.status).toBe(403);
        expect(err.message).toBe('No tienes permiso para modificar este perfil');
      }

      try {
        await api.updateMe({ bio: 'test' });
        fail('Expected 500 to throw');
      } catch (err) {
        expect(err.status).toBe(500);
        expect(err.message).toBe('Error al guardar los cambios. Inténtalo de nuevo más tarde');
      }
    });
  });

  describe('uploadAvatar', () => {
    it('should send POST request to /profiles/me/avatar with FormData and without Content-Type: application/json', async () => {
      const mockResponse = {
        data: sampleProfile,
        meta: { timestamp: '2026-10-14T12:10:00.000Z' },
      };

      spyOn(window, 'fetch').and.resolveTo({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const file = new Blob(['image-bytes'], { type: 'image/webp' });
      const result = await api.uploadAvatar(file);

      expect(window.fetch).toHaveBeenCalledTimes(1);
      const [calledUrl, calledOptions] = window.fetch.calls.mostRecent().args;
      expect(calledUrl).toMatch(/\/profiles\/me\/avatar$/);
      expect(calledOptions.method).toBe('POST');
      expect(calledOptions.body instanceof FormData).toBe(true);
      expect(calledOptions.headers['Content-Type']).toBeUndefined();
      expect(result).toEqual(mockResponse);
    });

    it('should map 422 FILE_TOO_LARGE and 422 INVALID_FILE_FORMAT to exact Spanish messages', async () => {
      spyOn(window, 'fetch').and.returnValues(
        Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'The image exceeds the maximum size of 2 MB.',
            },
          }),
        }),
        Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({
            error: {
              code: 'INVALID_FILE_FORMAT',
              message: 'Only JPEG, PNG, and WebP images are accepted.',
            },
          }),
        })
      );

      const file = new Blob(['x'], { type: 'image/png' });

      try {
        await api.uploadAvatar(file);
        fail('Expected 422 FILE_TOO_LARGE to throw');
      } catch (err) {
        expect(err.status).toBe(422);
        expect(err.code).toBe('FILE_TOO_LARGE');
        expect(err.message).toBe('La imagen excede el límite de 2 MB');
      }

      try {
        await api.uploadAvatar(file);
        fail('Expected 422 INVALID_FILE_FORMAT to throw');
      } catch (err) {
        expect(err.status).toBe(422);
        expect(err.code).toBe('INVALID_FILE_FORMAT');
        expect(err.message).toBe('Solo se aceptan imágenes JPEG, PNG y WebP');
      }
    });
  });
});
