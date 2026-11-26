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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('AuthBootstrapService (recovered 1)', () => {
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

    describe('bootstrap — success (recovered 2)', () => {
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

    describe('bootstrap — anonymous (401) (recovered 3)', () => {
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

    describe('bootstrap — uncertain (network / 5xx) (recovered 4)', () => {
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
  });

  (() => {
    describe('AuthBootstrapService additional branches (recovered 5)', () => {
      let authApi;
      let authStore;
      let consoleRef;
      let service;

      beforeEach(() => {
        authApi = { me: jasmine.createSpy('me') };
        authStore = {
          setSession: jasmine.createSpy('setSession'),
          clearSession: jasmine.createSpy('clearSession'),
        };
        consoleRef = { warn: jasmine.createSpy('warn') };
        service = new AuthBootstrapService({ authApi, authStore, consoleRef });
      });

      it('treats empty or malformed successful responses as anonymous', async () => {
        for (const response of [undefined, null, {}, { data: null }, { data: { user: null } }]) {
          authApi.me.and.resolveTo(response);
          await expectAsync(service.bootstrap()).toBeResolvedTo({ status: 'anonymous' });
        }
        expect(authStore.clearSession).toHaveBeenCalledTimes(5);
        expect(authStore.setSession).not.toHaveBeenCalled();
        expect(consoleRef.warn).not.toHaveBeenCalled();
      });

      it('passes profile and roles through to setSession, including undefined values', async () => {
        authApi.me.and.resolveTo({ data: { user: { id: 'u1' } } });

        await expectAsync(service.bootstrap()).toBeResolvedTo({ status: 'authenticated' });
        expect(authStore.setSession).toHaveBeenCalledWith({
          user: { id: 'u1' },
          profile: undefined,
          roles: undefined,
        });
      });

      it('treats every non-401 failure as uncertain and keeps the cached state', async () => {
        for (const status of [400, 403, 503, '401']) {
          const error = new Error('failed');
          error.status = status;
          authApi.me.and.rejectWith(error);
          await expectAsync(service.bootstrap()).toBeResolvedTo({ status: 'uncertain' });
        }
        expect(authStore.clearSession).not.toHaveBeenCalled();
        expect(authStore.setSession).not.toHaveBeenCalled();
        expect(consoleRef.warn).toHaveBeenCalledTimes(4);
        expect(consoleRef.warn.calls.first().args).toEqual([
          '[AuthBootstrapService] /me failed; keeping cached state:',
          'failed',
        ]);
      });

      it('warns with a non-Error rejection value', async () => {
        authApi.me.and.rejectWith('offline');

        await expectAsync(service.bootstrap()).toBeResolvedTo({ status: 'uncertain' });
        expect(consoleRef.warn.calls.mostRecent().args[1]).toBe('offline');
      });

      it('does not throw when console.warn is unavailable or the console is defaulted', async () => {
        authApi.me.and.rejectWith(new Error('failed'));
        const resilient = new AuthBootstrapService({
          authApi,
          authStore,
          consoleRef: {},
        });

        await expectAsync(resilient.bootstrap()).toBeResolvedTo({ status: 'uncertain' });
        expect(() => new AuthBootstrapService({ authApi, authStore })).not.toThrow();
      });

      it('clears the session for a 401 error even when the message is missing', async () => {
        const error = new Error('');
        error.status = 401;
        authApi.me.and.rejectWith(error);

        await expectAsync(service.bootstrap()).toBeResolvedTo({ status: 'anonymous' });
        expect(authStore.clearSession).toHaveBeenCalledTimes(1);
        expect(consoleRef.warn).not.toHaveBeenCalled();
      });
    });
  })();
})();
