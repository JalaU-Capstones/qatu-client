import { apiFetch } from './client.js';

const CODE_BY_STATUS = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
});

function invalidRequest(message) {
  const err = new Error(message);
  err.code = 'INVALID_REQUEST';
  err.statusCode = 400;
  return err;
}

export class NotificationsApi {
  constructor({ apiFetchFn = apiFetch } = {}) {
    if (!apiFetchFn) throw new Error('apiFetchFn is required');
    this._fetch = apiFetchFn;
  }

  async list({ page = 1, limit = 10, unreadOnly = false } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (unreadOnly) params.set('unread_only', 'true');

    const response = await this._fetch(`/notifications?${params.toString()}`, {
      method: 'GET',
      withAuth: true,
    });

    const body = await this._handleJson(response, 'No se pudieron cargar las notificaciones');
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      meta: body?.meta || {},
    };
  }

  async getUnreadCount() {
    const response = await this._fetch('/notifications/unread-count', {
      method: 'GET',
      withAuth: true,
    });

    const body = await this._handleJson(response, 'No se pudo consultar las notificaciones');
    return Number(body?.data?.unread_count) || 0;
  }

  async markAsRead(notificationId) {
    if (!notificationId || typeof notificationId !== 'string') {
      throw invalidRequest('notificationId is required');
    }

    const response = await this._fetch(
      `/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: 'PATCH', withAuth: true }
    );

    const body = await this._handleJson(response, 'No se pudo marcar la notificación');
    return body?.data || null;
  }

  async markAllAsRead() {
    const response = await this._fetch('/notifications/read-all', {
      method: 'PATCH',
      withAuth: true,
    });

    const body = await this._handleJson(response, 'No se pudieron marcar las notificaciones');
    return Number(body?.data?.updated_count) || 0;
  }

  async _handleJson(response, fallbackMessage) {
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(body?.error?.message || `${fallbackMessage} (${response.status})`);
      err.code = body?.error?.code || CODE_BY_STATUS[response.status] || 'UNKNOWN_ERROR';
      err.statusCode = response.status;
      throw err;
    }

    return body;
  }
}
