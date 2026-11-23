import { apiFetch } from './client.js';
import { ConversationsApi } from './ConversationsApi.js';

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const errorResponse = (status, code, message) => jsonResponse({ error: { code, message } }, status);

describe('ConversationsApi', () => {
  let fetchSpy;
  let api;

  beforeEach(() => {
    fetchSpy = jasmine
      .createSpy('apiFetchFn')
      .and.returnValue(Promise.resolve(jsonResponse({ data: null, meta: {} })));
    api = new ConversationsApi({ apiFetchFn: fetchSpy });
  });

  describe('constructor', () => {
    it('defaults apiFetchFn to the real apiFetch and accepts an injected one', () => {
      const defaultApi = new ConversationsApi();
      expect(defaultApi._fetch).toBe(apiFetch);

      const customFetch = () => {};
      const customApi = new ConversationsApi({ apiFetchFn: customFetch });
      expect(customApi._fetch).toBe(customFetch);
    });
  });

  describe('createOrGetConversation', () => {
    it('returns created: true for a 201 response and sends seller_id + product_id', async () => {
      const meta = { timestamp: '2026-11-23T10:00:00.000Z' };
      fetchSpy.and.resolveTo(
        jsonResponse({ data: { id: 'conv-1', seller_id: 'seller-1' }, meta }, 201)
      );

      const result = await api.createOrGetConversation({
        sellerId: 'seller-1',
        productId: 'p1',
      });

      expect(fetchSpy).toHaveBeenCalledWith('/conversations', {
        method: 'POST',
        withAuth: true,
        body: JSON.stringify({ seller_id: 'seller-1', product_id: 'p1' }),
      });
      expect(result.data).toEqual({ id: 'conv-1', seller_id: 'seller-1' });
      expect(result.meta).toEqual(meta);
      expect(result.created).toBe(true);
    });

    it('returns created: false when an existing conversation answers 200', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: { id: 'conv-1' }, meta: {} }, 200));

      const result = await api.createOrGetConversation({ sellerId: 'seller-1' });

      expect(result.created).toBe(false);
      expect(result.data.id).toBe('conv-1');
    });

    it('omits product_id from the body when productId is null', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: { id: 'conv-1' }, meta: {} }, 201));

      await api.createOrGetConversation({ sellerId: 'seller-1', productId: null });

      const [, options] = fetchSpy.calls.mostRecent().args;
      const payload = JSON.parse(options.body);
      expect(payload).toEqual({ seller_id: 'seller-1' });
      expect(Object.prototype.hasOwnProperty.call(payload, 'product_id')).toBe(false);
    });

    it('rejects locally with INVALID_REQUEST/400 when sellerId is missing and does not call the API', async () => {
      try {
        await api.createOrGetConversation({});
        fail('Expected createOrGetConversation to throw');
      } catch (err) {
        expect(err.message).toBe('sellerId is required');
        expect(err.code).toBe('INVALID_REQUEST');
        expect(err.statusCode).toBe(400);
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('propagates a 422 SELF_CONVERSATION from the backend', async () => {
      fetchSpy.and.resolveTo(
        errorResponse(422, 'SELF_CONVERSATION', 'No puedes contactarte a ti mismo.')
      );

      try {
        await api.createOrGetConversation({ sellerId: 'seller-1', productId: 'p1' });
        fail('Expected createOrGetConversation to throw');
      } catch (err) {
        expect(err.message).toBe('No puedes contactarte a ti mismo.');
        expect(err.code).toBe('SELF_CONVERSATION');
        expect(err.statusCode).toBe(422);
      }
    });
  });

  describe('listConversations', () => {
    it('requests GET /conversations with the default pagination query', async () => {
      const data = [{ id: 'conv-1' }];
      const meta = { page: 1, per_page: 20, total: 1, total_pages: 1 };
      fetchSpy.and.resolveTo(jsonResponse({ data, meta }));

      const result = await api.listConversations();

      expect(fetchSpy).toHaveBeenCalledWith('/conversations?page=1&limit=20', {
        method: 'GET',
        withAuth: true,
      });
      expect(result.data).toEqual(data);
      expect(result.meta).toEqual(meta);
    });

    it('sends the requested page and limit as query params', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: [], meta: {} }));

      await api.listConversations({ page: 3, limit: 5 });

      expect(fetchSpy).toHaveBeenCalledWith('/conversations?page=3&limit=5', {
        method: 'GET',
        withAuth: true,
      });
    });

    it('falls back to empty data and meta when the envelope omits them', async () => {
      fetchSpy.and.resolveTo(jsonResponse({}));

      const result = await api.listConversations();

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({});
    });

    it('propagates a 403 FORBIDDEN from the backend', async () => {
      fetchSpy.and.resolveTo(errorResponse(403, 'FORBIDDEN', 'No autorizado'));

      try {
        await api.listConversations();
        fail('Expected listConversations to throw');
      } catch (err) {
        expect(err.message).toBe('No autorizado');
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
      }
    });
  });

  describe('listMessages', () => {
    it('requests GET /conversations/:id/messages with the default pagination query', async () => {
      const data = [{ id: 'msg-1', content: 'Hola' }];
      const meta = { page: 1, per_page: 20, total: 1, total_pages: 1 };
      fetchSpy.and.resolveTo(jsonResponse({ data, meta }));

      const result = await api.listMessages('conv-1');

      expect(fetchSpy).toHaveBeenCalledWith('/conversations/conv-1/messages?page=1&limit=20', {
        method: 'GET',
        withAuth: true,
      });
      expect(result.data).toEqual(data);
      expect(result.meta).toEqual(meta);
    });

    it('sends the requested page and limit as query params', async () => {
      fetchSpy.and.resolveTo(jsonResponse({ data: [], meta: {} }));

      await api.listMessages('conv-1', { page: 2, limit: 5 });

      expect(fetchSpy).toHaveBeenCalledWith('/conversations/conv-1/messages?page=2&limit=5', {
        method: 'GET',
        withAuth: true,
      });
    });

    it('rejects locally with INVALID_REQUEST/400 when conversationId is missing', async () => {
      try {
        await api.listMessages('');
        fail('Expected listMessages to throw');
      } catch (err) {
        expect(err.message).toBe('conversationId is required');
        expect(err.code).toBe('INVALID_REQUEST');
        expect(err.statusCode).toBe(400);
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('propagates a 403 FORBIDDEN from the backend', async () => {
      fetchSpy.and.resolveTo(errorResponse(403, 'FORBIDDEN', 'No autorizado'));

      try {
        await api.listMessages('conv-1');
        fail('Expected listMessages to throw');
      } catch (err) {
        expect(err.message).toBe('No autorizado');
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
      }
    });
  });

  describe('sendMessage', () => {
    it('trims the content and POSTs it to /conversations/:id/messages', async () => {
      fetchSpy.and.resolveTo(
        jsonResponse({ data: { id: 'msg-1', content: 'Hola' }, meta: {} }, 201)
      );

      const result = await api.sendMessage('conv-1', { content: '   Hola vendedor   ' });

      expect(fetchSpy).toHaveBeenCalledWith('/conversations/conv-1/messages', {
        method: 'POST',
        withAuth: true,
        body: JSON.stringify({ content: 'Hola vendedor' }),
      });
      expect(result.data).toEqual({ id: 'msg-1', content: 'Hola' });
    });

    it('rejects a locally empty string with INVALID_REQUEST/400 without calling the API', async () => {
      try {
        await api.sendMessage('conv-1', { content: '' });
        fail('Expected sendMessage to throw');
      } catch (err) {
        expect(err.message).toBe('El mensaje no puede estar vacío.');
        expect(err.code).toBe('INVALID_REQUEST');
        expect(err.statusCode).toBe(400);
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only content locally without calling the API', async () => {
      try {
        await api.sendMessage('conv-1', { content: '   \n\t  ' });
        fail('Expected sendMessage to throw');
      } catch (err) {
        expect(err.message).toBe('El mensaje no puede estar vacío.');
        expect(err.code).toBe('INVALID_REQUEST');
        expect(err.statusCode).toBe(400);
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects a missing conversationId locally without calling the API', async () => {
      try {
        await api.sendMessage(undefined, { content: 'Hola' });
        fail('Expected sendMessage to throw');
      } catch (err) {
        expect(err.message).toBe('conversationId is required');
        expect(err.code).toBe('INVALID_REQUEST');
        expect(err.statusCode).toBe(400);
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('propagates a 403 FORBIDDEN from the backend', async () => {
      fetchSpy.and.resolveTo(errorResponse(403, 'FORBIDDEN', 'No autorizado'));

      try {
        await api.sendMessage('conv-1', { content: 'Hola' });
        fail('Expected sendMessage to throw');
      } catch (err) {
        expect(err.message).toBe('No autorizado');
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
      }
    });

    it('propagates a 404 NOT_FOUND from the backend', async () => {
      fetchSpy.and.resolveTo(errorResponse(404, 'NOT_FOUND', 'Conversación no encontrada'));

      try {
        await api.sendMessage('missing-conv', { content: 'Hola' });
        fail('Expected sendMessage to throw');
      } catch (err) {
        expect(err.message).toBe('Conversación no encontrada');
        expect(err.code).toBe('NOT_FOUND');
        expect(err.statusCode).toBe(404);
      }
    });
  });
});
