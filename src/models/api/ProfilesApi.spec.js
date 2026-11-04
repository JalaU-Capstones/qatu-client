import { ProfilesApi } from './ProfilesApi.js';

describe('ProfilesApi', () => {
  let api;

  const sampleProfile = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    username: 'john_doe',
    full_name: 'John Doe',
    email: 'john@example.com',
    avatar_path: 'avatars/john.webp',
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

    it('should throw an error with status and data when profile is not found (404)', async () => {
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
        expect(err.message).toBe('Profile not found');
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
        avatar_path: 'avatars/jane.webp',
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
        avatar_path: 'avatars/jane.webp',
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
  });
});
