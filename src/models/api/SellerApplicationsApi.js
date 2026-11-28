import { apiFetch } from './client.js';

const VALID_APPLICATION_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);
const VALID_REVIEW_DECISIONS = Object.freeze(['approved', 'rejected']);

const CODE_BY_STATUS = Object.freeze({
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
});

function invalidRequest(message) {
  const err = new Error(message);
  err.code = 'INVALID_REQUEST';
  err.statusCode = 400;
  return err;
}

export class SellerApplicationsApi {
  /**
   * @param {Object} [options]
   * @param {Function} [options.apiFetchFn] Override for tests; defaults to apiFetch.
   */
  constructor({ apiFetchFn = apiFetch } = {}) {
    if (!apiFetchFn) throw new Error('apiFetchFn is required');
    this._fetch = apiFetchFn;
  }

  /**
   * Submits a seller application for the authenticated buyer.
   *
   * @param {{
   *   business_name: string,
   *   business_description: string,
   *   country_code?: string|null,
   *   phone_number?: string|null,
   *   contact_email?: string|null,
   * }} payload
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async apply(payload = {}) {
    const bodyPayload = {
      business_name: typeof payload.business_name === 'string' ? payload.business_name.trim() : '',
      business_description:
        typeof payload.business_description === 'string' ? payload.business_description.trim() : '',
    };

    if (
      typeof payload.country_code === 'string' &&
      payload.country_code.trim() !== '' &&
      typeof payload.phone_number === 'string' &&
      payload.phone_number.trim() !== ''
    ) {
      bodyPayload.country_code = payload.country_code.trim();
      bodyPayload.phone_number = payload.phone_number.trim();
    }
    if (typeof payload.contact_email === 'string' && payload.contact_email.trim() !== '') {
      bodyPayload.contact_email = payload.contact_email.trim();
    }

    const response = await this._fetch('/seller-applications', {
      method: 'POST',
      withAuth: true,
      body: JSON.stringify(bodyPayload),
    });

    return this._handleJson(response, 'Failed to submit seller application');
  }

  /**
   * Returns the buyer's most recent application, or null on 404.
   *
   * @returns {Promise<Object|null>}
   */
  async getMyApplication() {
    const response = await this._fetch('/seller-applications/me', {
      method: 'GET',
      withAuth: true,
    });

    if (response.status === 404) {
      return null;
    }

    const body = await this._handleJson(response, 'Failed to fetch seller application');
    return body?.data ?? null;
  }

  /**
   * Returns the paginated list of applications for admins.
   *
   * @param {{ page?: number, limit?: number, status?: 'pending'|'approved'|'rejected' }} [params]
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   */
  async listApplications({ page = 1, limit = 20, status } = {}) {
    if (status && !VALID_APPLICATION_STATUSES.includes(status)) {
      throw invalidRequest(
        `Invalid status "${status}". Expected one of: ${VALID_APPLICATION_STATUSES.join(', ')}`
      );
    }

    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);

    const qs = params.toString();
    const path = qs ? `/admin/seller-applications?${qs}` : '/admin/seller-applications';

    const response = await this._fetch(path, {
      method: 'GET',
      withAuth: true,
    });

    const body = await this._handleJson(response, 'Failed to fetch seller applications');
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      meta: body?.meta || {},
    };
  }

  /**
   * Approves or rejects a pending application.
   *
   * @param {string} applicationId
   * @param {{ status: 'approved'|'rejected', rejectionReason?: string }} decision
   * @returns {Promise<{ data: Object, meta: Object }>}
   */
  async reviewApplication(applicationId, { status, rejectionReason } = {}) {
    if (!applicationId || typeof applicationId !== 'string') {
      throw invalidRequest('applicationId is required');
    }
    if (!VALID_REVIEW_DECISIONS.includes(status)) {
      throw invalidRequest(
        `Invalid decision status "${status}". Expected one of: ${VALID_REVIEW_DECISIONS.join(', ')}`
      );
    }

    const payload = { status };
    if (status === 'rejected') {
      payload.rejection_reason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
    }

    const response = await this._fetch(
      `/admin/seller-applications/${encodeURIComponent(applicationId)}`,
      {
        method: 'PATCH',
        withAuth: true,
        body: JSON.stringify(payload),
      }
    );

    return this._handleJson(response, 'Failed to review seller application');
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
