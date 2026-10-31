import { AuthBootstrapService } from './AuthBootstrapService.js';

describe('AuthBootstrapService', () => {
  let authApi;
  let authStore;
  let consoleRef;
  let service;

  beforeEach(() => {
    authApi = { me: jasmine.createSpy('authApi.me') };
    authStore = {
      setSession: jasmine.createSpy('authStore.setSession'),
      clearSession: jasmine.createSpy('authStore.clearSession'),
    };
    consoleRef = { warn: jasmine.createSpy('console.warn') };
    service = new AuthBootstrapService({ authApi, authStore, consoleRef });
  });

  describe('constructor', () => {
    it('throws if authApi is missing', () => {
      expect(() => new AuthBootstrapService({ authStore })).toThrowError('authApi is required');
    });

    it('throws if authStore is missing', () => {
      expect(() => new AuthBootstrapService({ authApi })).toThrowError('authStore is required');
    });
  });

  describe('bootstrap — success', () => {
    it('sets session and returns "authenticated" on /me 200 with user.id', async () => {
      const user = { id: 'u1', email: 'a@b.com' };
      const profile = { id: 'u1', username: 'jdoe' };
      const roles = [{ id: 'r1', name: 'buyer' }];
      authApi.me.and.resolveTo({ data: { user, profile, roles } });

      const result = await service.bootstrap();

      expect(authStore.setSession).toHaveBeenCalledWith({ user, profile, roles });
      expect(authStore.clearSession).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'authenticated' });
    });
  });

  describe('bootstrap — anonymous (401)', () => {
    it('clears session and returns "anonymous" on 401', async () => {
      const err = new Error('UNAUTHORIZED');
      err.status = 401;
      authApi.me.and.rejectWith(err);

      const result = await service.bootstrap();

      expect(authStore.clearSession).toHaveBeenCalled();
      expect(authStore.setSession).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'anonymous' });
      // 401 is expected for anonymous visitors — should NOT log a warning
      expect(consoleRef.warn).not.toHaveBeenCalled();
    });

    it('clears session and returns "anonymous" when 200 has no user.id (defensive)', async () => {
      authApi.me.and.resolveTo({ data: { user: null, profile: null, roles: [] } });

      const result = await service.bootstrap();

      expect(authStore.clearSession).toHaveBeenCalled();
      expect(result).toEqual({ status: 'anonymous' });
    });
  });

  describe('bootstrap — uncertain (network / 5xx)', () => {
    it('keeps cache and returns "uncertain" on 500', async () => {
      const err = new Error('INTERNAL_SERVER_ERROR');
      err.status = 500;
      authApi.me.and.rejectWith(err);

      const result = await service.bootstrap();

      expect(authStore.clearSession).not.toHaveBeenCalled();
      expect(authStore.setSession).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'uncertain' });
      expect(consoleRef.warn).toHaveBeenCalled();
    });

    it('keeps cache and returns "uncertain" on network error (no status)', async () => {
      const err = new Error('NetworkError');
      authApi.me.and.rejectWith(err);

      const result = await service.bootstrap();

      expect(authStore.clearSession).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'uncertain' });
      expect(consoleRef.warn).toHaveBeenCalled();
    });
  });

  describe('bootstrap — idempotency', () => {
    it('is safe to call twice; both calls hit /me independently', async () => {
      authApi.me.and.resolveTo({ data: { user: { id: 'u1' } } });
      await service.bootstrap();
      await service.bootstrap();
      expect(authApi.me).toHaveBeenCalledTimes(2);
      expect(authStore.setSession).toHaveBeenCalledTimes(2);
    });
  });
});
