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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    const jsonResponse = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    describe('ConversationsApi additional branches (recovered 1)', () => {
      let fetchFn;
      let api;

      beforeEach(() => {
        fetchFn = jasmine.createSpy('apiFetchFn');
        api = new ConversationsApi({ apiFetchFn: fetchFn });
      });

      it('rejects an explicitly falsy injected fetch function', () => {
        for (const apiFetchFn of [null, '', 0, false]) {
          expect(() => new ConversationsApi({ apiFetchFn })).toThrowError('apiFetchFn is required');
        }
      });

      it('validates non-string seller ids and handles optional product ids', async () => {
        for (const sellerId of [undefined, null, 123, {}]) {
          await expectAsync(api.createOrGetConversation({ sellerId })).toBeRejectedWithError(
            'sellerId is required'
          );
        }
        expect(fetchFn).not.toHaveBeenCalled();

        fetchFn.and.resolveTo(jsonResponse({ data: {}, meta: null }, 200));
        const result = await api.createOrGetConversation({ sellerId: 's-1', productId: '' });
        expect(JSON.parse(fetchFn.calls.first().args[1].body)).toEqual({ seller_id: 's-1' });
        expect(result.meta).toEqual({});

        await api.createOrGetConversation({ sellerId: 's-1', productId: 'p/1' });
        expect(JSON.parse(fetchFn.calls.mostRecent().args[1].body)).toEqual({
          seller_id: 's-1',
          product_id: 'p/1',
        });
      });

      it('omits falsy pagination values from list queries', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: [], meta: {} }));

        await api.listConversations({ page: 0, limit: null });
        expect(fetchFn.calls.first().args[0]).toBe('/conversations');

        await api.listMessages('conv-1', { page: '', limit: 0 });
        expect(fetchFn.calls.mostRecent().args[0]).toBe('/conversations/conv-1/messages');
      });

      it('normalizes missing data and meta in message and conversation lists', async () => {
        fetchFn.and.resolveTo(jsonResponse({ data: 'not-an-array' }));

        await expectAsync(api.listConversations()).toBeResolvedTo({ data: [], meta: {} });
        await expectAsync(api.listMessages('conv-1')).toBeResolvedTo({ data: [], meta: {} });
      });

      it('validates non-string ids and encodes ids in URLs', async () => {
        await expectAsync(api.listMessages(123)).toBeRejectedWithError(
          'conversationId is required'
        );
        await expectAsync(api.sendMessage(null, { content: 'x' })).toBeRejectedWithError(
          'conversationId is required'
        );

        fetchFn.and.resolveTo(jsonResponse({ data: [] }));
        await api.listMessages('conv/1 ?');
        expect(fetchFn.calls.first().args[0]).toBe(
          '/conversations/conv%2F1%20%3F/messages?page=1&limit=20'
        );

        await api.sendMessage('conv/1', { content: 'hola' });
        expect(fetchFn.calls.mostRecent().args[0]).toBe('/conversations/conv%2F1/messages');
      });

      it('rejects non-string and missing message content', async () => {
        for (const content of [undefined, null, 42, {}, '   ']) {
          await expectAsync(api.sendMessage('conv-1', { content })).toBeRejectedWithError(
            'El mensaje no puede estar vacío.'
          );
        }
        await expectAsync(api.sendMessage('conv-1')).toBeRejectedWithError(
          'El mensaje no puede estar vacío.'
        );
        expect(fetchFn).not.toHaveBeenCalled();
      });

      it('maps status codes and backend details when the body has no error code', async () => {
        fetchFn.and.resolveTo(jsonResponse({ error: { details: [{ field: 'content' }] } }, 422));

        let error;
        try {
          await api.sendMessage('conv-1', { content: 'hola' });
        } catch (caught) {
          error = caught;
        }
        expect(error.message).toBe('No se pudo enviar el mensaje (422)');
        expect(error.code).toBe('UNPROCESSABLE_ENTITY');
        expect(error.statusCode).toBe(422);
        expect(error.details).toEqual([{ field: 'content' }]);

        fetchFn.and.resolveTo(new Response('', { status: 500 }));
        await expectAsync(api.listConversations()).toBeRejectedWithError(
          'No se pudieron cargar las conversaciones (500)'
        );
      });

      it('falls back when the error body is not JSON and propagates network errors', async () => {
        fetchFn.and.resolveTo(new Response('not-json', { status: 403 }));
        await expectAsync(api.createOrGetConversation({ sellerId: 's-1' })).toBeRejectedWithError(
          'No se pudo iniciar la conversación (403)'
        );

        fetchFn.and.rejectWith(new Error('offline'));
        await expectAsync(api.listMessages('conv-1')).toBeRejectedWithError('offline');
      });
    });
  })();
})();
