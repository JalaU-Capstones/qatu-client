import { apiFetch } from './client.js';

const CODE_BY_STATUS = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'UNPROCESSABLE_ENTITY',
});

function invalidRequest(message) {
  const err = new Error(message);
  err.code = 'INVALID_REQUEST';
  err.statusCode = 400;
  return err;
}

export class ConversationsApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn] Override for tests; defaults to apiFetch.
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    if (!apiFetchFn) throw new Error('apiFetchFn is required');
    this._fetch = apiFetchFn;
  }

  /**
   * Creates a new buyer-seller conversation or returns the existing one.
   *
   * @param {{ sellerId: string, productId?: string|null }} params
   * @returns {Promise<{ data: Object, meta: Object, created: boolean }>}
   */
  async createOrGetConversation({ sellerId, productId = null } = {}) {
    if (!sellerId || typeof sellerId !== 'string') {
      throw invalidRequest('sellerId is required');
    }

    const payload = { seller_id: sellerId };
    if (productId) {
      payload.product_id = productId;
    }

    const response = await this._fetch('/conversations', {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(payload),
    });

    const body = await this._handleJson(response, 'No se pudo iniciar la conversación');
    return {
      data: body.data,
      meta: body.meta || {},
      created: response.status === 201,
    };
  }

  /**
   * Lists conversations for the authenticated user.
   *
   * @param {{ page?: number, limit?: number }} [params]
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   */
  async listConversations({ page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));

    const qs = params.toString();
    const response = await this._fetch(qs ? `/conversations?${qs}` : '/conversations', {
      method: 'GET',
      withAuth: true,
    });

    const body = await this._handleJson(response, 'No se pudieron cargar las conversaciones');
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      meta: body?.meta || {},
    };
  }

  /**
   * Lists paginated messages inside a conversation.
   *
   * @param {string} conversationId
   * @param {{ page?: number, limit?: number }} [params]
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   */
  async listMessages(conversationId, { page = 1, limit = 20 } = {}) {
    if (!conversationId || typeof conversationId !== 'string') {
      throw invalidRequest('conversationId is required');
    }

    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));

    const qs = params.toString();
    const basePath = `/conversations/${encodeURIComponent(conversationId)}/messages`;
    const response = await this._fetch(qs ? `${basePath}?${qs}` : basePath, {
      method: 'GET',
      withAuth: true,
    });

    const body = await this._handleJson(response, 'No se pudieron cargar los mensajes');
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      meta: body?.meta || {},
    };
  }

  /**
   * Sends a message in an existing conversation.
   *
   * @param {string} conversationId
   * @param {{ content: string }} payload
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async sendMessage(conversationId, { content } = {}) {
    if (!conversationId || typeof conversationId !== 'string') {
      throw invalidRequest('conversationId is required');
    }

    const trimmed = typeof content === 'string' ? content.trim() : '';
    if (!trimmed) {
      throw invalidRequest('El mensaje no puede estar vacío.');
    }

    const response = await this._fetch(
      `/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        withAuth: true,
        body: JSON.stringify({ content: trimmed }),
      }
    );

    return this._handleJson(response, 'No se pudo enviar el mensaje');
  }

  /**
   * @param {Response} response
   * @param {string} fallbackMessage
   * @returns {Promise<Object>}
   * @private
   */
  async _handleJson(response, fallbackMessage) {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `${fallbackMessage} (${response.status})`);
      err.code = body?.error?.code || CODE_BY_STATUS[response.status] || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      err.details = body?.error?.details;
      throw err;
    }

    return body;
  }
}
