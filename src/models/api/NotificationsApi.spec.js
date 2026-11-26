import { apiFetch } from './client.js';
import { NotificationsApi } from './NotificationsApi.js';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('NotificationsApi', () => {
  let fetchSpy;
  let api;

  beforeEach(() => {
    fetchSpy = jasmine
      .createSpy('apiFetchFn')
      .and.returnValue(Promise.resolve(jsonResponse({ data: [], meta: {} })));
    api = new NotificationsApi({ apiFetchFn: fetchSpy });
  });

  it('defaults to the shared apiFetch', () => {
    expect(new NotificationsApi()._fetch).toBe(apiFetch);
  });

  it('requires a fetch function', () => {
    expect(() => new NotificationsApi({ apiFetchFn: null })).toThrowError('apiFetchFn is required');
  });

  describe('list', () => {
    it('requests the page with defaults and returns data and meta', async () => {
      const meta = { page: 1, total_pages: 2, unread_count: 3 };
      fetchSpy.and.resolveTo(jsonResponse({ data: [{ id: 'n-1' }], meta }));

      const result = await api.list();

      expect(fetchSpy).toHaveBeenCalledWith('/notifications?page=1&limit=10', {
        method: 'GET',
        withAuth: true,
      });
      expect(result).toEqual({ data: [{ id: 'n-1' }], meta });
    });

    it('adds the unread filter only when requested', async () => {
      await api.list({ page: 2, limit: 6, unreadOnly: true });

      expect(fetchSpy.calls.mostRecent().args[0]).toBe(
        '/notifications?page=2&limit=6&unread_only=true'
      );
    });

    it('falls back to empty data and meta for an unexpected body', async () => {
      fetchSpy.and.resolveTo(jsonResponse({}));

      await expectAsync(api.list()).toBeResolvedTo({ data: [], meta: {} });
    });

    it('throws the API error with its code and status', async () => {
      fetchSpy.and.resolveTo(
        jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'bad limit' } }, 400)
      );

      await expectAsync(api.list()).toBeRejectedWith(
        jasmine.objectContaining({ code: 'VALIDATION_ERROR', statusCode: 400 })
      );
    });

    it('maps a status without body to a code', async () => {
      fetchSpy.and.resolveTo(new Response('oops', { status: 401 }));

      await expectAsync(api.list()).toBeRejectedWith(
        jasmine.objectContaining({ code: 'UNAUTHORIZED', statusCode: 401 })
      );
    });

    it('uses UNKNOWN_ERROR for unmapped statuses', async () => {
      fetchSpy.and.resolveTo(new Response('down', { status: 503 }));

      await expectAsync(api.list()).toBeRejectedWith(
        jasmine.objectContaining({ code: 'UNKNOWN_ERROR', statusCode: 503 })
      );
    });
  });

  it('getUnreadCount returns the counter or zero', async () => {
    fetchSpy.and.resolveTo(jsonResponse({ data: { unread_count: 4 } }));
    await expectAsync(api.getUnreadCount()).toBeResolvedTo(4);
    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/notifications/unread-count');

    fetchSpy.and.resolveTo(jsonResponse({ data: {} }));
    await expectAsync(api.getUnreadCount()).toBeResolvedTo(0);
  });

  describe('markAsRead', () => {
    it('patches the encoded notification id and returns it', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: { id: 'n 1', read_at: 'now' } }));

      const result = await api.markAsRead('n 1');

      expect(fetchSpy).toHaveBeenCalledWith('/notifications/n%201/read', {
        method: 'PATCH',
        withAuth: true,
      });
      expect(result).toEqual({ id: 'n 1', read_at: 'now' });
    });

    it('returns null when the body has no data', async () => {
      fetchSpy.and.resolveTo(jsonResponse({}));

      await expectAsync(api.markAsRead('n-1')).toBeResolvedTo(null);
    });

    it('rejects a missing id without calling the API', async () => {
      await expectAsync(api.markAsRead('')).toBeRejectedWith(
        jasmine.objectContaining({ code: 'INVALID_REQUEST' })
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('markAllAsRead returns how many changed', async () => {
    fetchSpy.and.resolveTo(jsonResponse({ data: { updated_count: 5 } }));
    await expectAsync(api.markAllAsRead()).toBeResolvedTo(5);
    expect(fetchSpy).toHaveBeenCalledWith('/notifications/read-all', {
      method: 'PATCH',
      withAuth: true,
    });

    fetchSpy.and.resolveTo(jsonResponse({}));
    await expectAsync(api.markAllAsRead()).toBeResolvedTo(0);
  });
});
