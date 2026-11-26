import { SellerApplicationsApi } from '../../models/api/SellerApplicationsApi.js';

export class AdminSellerApplicationsViewModel {
  /**
   * @param {Object} [options]
   * @param {SellerApplicationsApi} [options.sellerApplicationsApi]
   */
  constructor({ sellerApplicationsApi = new SellerApplicationsApi() } = {}) {
    this.api = sellerApplicationsApi;

    this.applications = [];
    this.meta = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    };
    this.statusFilter = '';
    this.isLoading = false;
    this.isForbidden = false;
    this.reviewingIds = new Set();

    this.noticeMessage = '';
    this.errorMessage = '';
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  isReviewing(applicationId) {
    return this.reviewingIds.has(applicationId);
  }

  /**
   * Loads paginated applications.
   *
   * @param {number} [page=1]
   */
  async loadApplications(page = 1) {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();

    try {
      const response = await this.api.listApplications({
        page,
        limit: this.meta.limit,
        status: this.statusFilter || undefined,
      });

      this.isForbidden = false;
      this.applications = response.data || [];
      const meta = response.meta || {};
      this.meta = {
        page: Number(meta.page) || page,
        limit: Number(meta.limit) || this.meta.limit,
        total: Number(meta.total) || 0,
        totalPages: Math.max(1, Number(meta.totalPages ?? meta.total_pages) || 1),
      };
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else {
        this.errorMessage = err?.message || 'No se pudieron cargar las solicitudes de vendedores.';
      }
      this.applications = [];
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * Updates the status filter and reloads page 1.
   *
   * @param {string} status
   */
  async setStatusFilter(status) {
    this.statusFilter = status || '';
    await this.loadApplications(1);
  }

  /**
   * Approves a pending seller application.
   *
   * @param {string} applicationId
   * @returns {Promise<boolean>}
   */
  async approveApplication(applicationId) {
    if (!applicationId || this.reviewingIds.has(applicationId)) return false;

    this.reviewingIds.add(applicationId);
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      const response = await this.api.reviewApplication(applicationId, { status: 'approved' });
      const updated = response?.data || { id: applicationId, status: 'approved' };
      this._replaceApplication(applicationId, updated);
      this.noticeMessage =
        'Solicitud aprobada. El solicitante recibió el rol de vendedor y fue notificado.';
      return true;
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else {
        this.errorMessage = err?.message || 'No se pudo aprobar la solicitud.';
      }
      return false;
    } finally {
      this.reviewingIds.delete(applicationId);
      this._notify();
    }
  }

  async rejectApplication(applicationId, reason) {
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmed) return { success: false, error: 'El motivo es obligatorio.' };
    if (trimmed.length > 500) {
      return { success: false, error: 'El motivo no puede superar 500 caracteres.' };
    }
    if (!applicationId) {
      return { success: false, error: 'No se pudo rechazar la solicitud.' };
    }
    if (this.reviewingIds.has(applicationId)) {
      return { success: false, error: 'Operación en curso.' };
    }

    this.reviewingIds.add(applicationId);
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      await this.api.reviewApplication(applicationId, {
        status: 'rejected',
        rejectionReason: trimmed,
      });
      this.noticeMessage = 'Solicitud rechazada. El solicitante fue notificado.';
      await this.loadApplications(this.meta.page || 1);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'No se pudo rechazar la solicitud.',
      };
    } finally {
      this.reviewingIds.delete(applicationId);
      this._notify();
    }
  }

  /**
   * @param {string} applicationId
   * @param {Object} updated
   * @private
   */
  _replaceApplication(applicationId, updated) {
    this.applications = this.applications.map((item) =>
      item.id === applicationId ? { ...item, ...updated } : item
    );
  }
}
