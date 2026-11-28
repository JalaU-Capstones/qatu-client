import { apiFetch } from './client.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GROUP_BY = new Set(['day', 'week', 'month']);

const CODE_BY_STATUS = Object.freeze({
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

/**
 * @param {string} value
 * @param {string} label
 */
function assertDate(value, label) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw invalidRequest(`${label} must be a date in YYYY-MM-DD format.`);
  }
}

export class ReportsApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn]
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    if (!apiFetchFn) throw new Error('apiFetchFn is required');
    this._fetch = apiFetchFn;
  }

  /**
   * @param {{ from: string, to: string, groupBy?: 'day'|'week'|'month' }} query
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async getSalesReport({ from, to, groupBy = 'month' } = {}) {
    assertDate(from, 'from');
    assertDate(to, 'to');
    if (!GROUP_BY.has(groupBy)) {
      throw invalidRequest('group_by must be day, week, or month.');
    }

    const params = new URLSearchParams({ from, to, group_by: groupBy });
    const response = await this._fetch(`/admin/reports/sales?${params}`, {
      method: 'GET',
      withAuth: true,
    });
    return this._handleJson(response, 'Failed to load sales report');
  }

  /**
   * @param {{ from: string, to: string }} query
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async getUsersReport({ from, to } = {}) {
    assertDate(from, 'from');
    assertDate(to, 'to');
    const params = new URLSearchParams({ from, to });
    const response = await this._fetch(`/admin/reports/users?${params}`, {
      method: 'GET',
      withAuth: true,
    });
    return this._handleJson(response, 'Failed to load users report');
  }

  /**
   * @param {{ from: string, to: string }} query
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async getProductsReport({ from, to } = {}) {
    assertDate(from, 'from');
    assertDate(to, 'to');
    const params = new URLSearchParams({ from, to });
    const response = await this._fetch(`/admin/reports/products?${params}`, {
      method: 'GET',
      withAuth: true,
    });
    return this._handleJson(response, 'Failed to load products report');
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
