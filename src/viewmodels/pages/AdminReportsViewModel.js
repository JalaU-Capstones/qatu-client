import { resolveReportRange } from '../../models/adminReportRange.js';
import { ReportsApi } from '../../models/api/ReportsApi.js';

const TABS = new Set(['sales', 'users', 'products']);

export class AdminReportsViewModel {
  /**
   * @param {Object} [options]
   * @param {ReportsApi} [options.reportsApi]
   * @param {string} [options.rangeKey]
   */
  constructor({ reportsApi = new ReportsApi(), rangeKey = '30d' } = {}) {
    this.api = reportsApi;
    this.tab = 'sales';
    this.rangeKey = rangeKey;
    this.isLoading = false;
    this.isForbidden = false;
    this.errorMessage = '';
    this.sales = null;
    this.users = null;
    this.products = null;
    this._cache = new Map();
    this._requestId = 0;
    this._listeners = new Set();
  }

  /**
   * @param {Function} listener
   * @returns {Function}
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of [...this._listeners]) {
      listener(this);
    }
  }

  /**
   * @param {'sales'|'users'|'products'} tab
   * @param {{ from: string, to: string, groupBy: string }} range
   * @returns {Promise<Object>}
   * @private
   */
  _fetchTab(tab, range) {
    if (tab === 'users') {
      return this.api.getUsersReport(range).then((body) => body?.data || {});
    }
    if (tab === 'products') {
      return this.api.getProductsReport(range).then((body) => body?.data || {});
    }
    return this.api
      .getSalesReport({ from: range.from, to: range.to, groupBy: range.groupBy })
      .then((body) => body?.data || {});
  }

  /**
   * @param {'sales'|'users'|'products'} tab
   * @param {Object} data
   * @private
   */
  _store(tab, data) {
    if (tab === 'users') this.users = data;
    else if (tab === 'products') this.products = data;
    else this.sales = data;
  }

  /**
   * Loads the active tab. A newer request wins if the admin switches quickly.
   *
   * @returns {Promise<void>}
   */
  async load() {
    const tab = this.tab;
    const rangeKey = this.rangeKey;
    const requestId = ++this._requestId;
    this.isLoading = true;
    this.errorMessage = '';
    this.isForbidden = false;
    this._notify();

    try {
      const range = resolveReportRange(rangeKey);
      const data = await this._fetchTab(tab, range);
      if (requestId !== this._requestId) return;
      this._cache.set(`${rangeKey}:${tab}`, data);
      this._store(tab, data);
    } catch (err) {
      if (requestId !== this._requestId) return;
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else if (err?.code === 'SESSION_EXPIRED' || err?.statusCode === 401) {
        this.errorMessage = 'Tu sesión expiró. Vuelve a iniciar sesión.';
      } else {
        this.errorMessage = err?.message || 'No se pudo cargar el reporte.';
      }
    } finally {
      if (requestId === this._requestId) {
        this.isLoading = false;
        this._notify();
      }
    }
  }

  /**
   * @param {'sales'|'users'|'products'} tab
   * @returns {Promise<void>}
   */
  async selectTab(tab) {
    if (!TABS.has(tab) || tab === this.tab) return;
    this.tab = tab;
    const cached = this._cache.get(`${this.rangeKey}:${tab}`);
    if (cached) {
      this._store(tab, cached);
      this.errorMessage = '';
      this.isLoading = false;
      this._notify();
      return;
    }
    this._notify();
    await this.load();
  }

  /**
   * @param {string} rangeKey
   * @returns {Promise<void>}
   */
  async setRange(rangeKey) {
    const next = resolveReportRange(rangeKey).key;
    if (next === this.rangeKey) return;
    this.rangeKey = next;
    this._cache.clear();
    this.sales = null;
    this.users = null;
    this.products = null;
    await this.load();
  }
}
