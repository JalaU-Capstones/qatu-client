import { SellersApi } from '../../models/api/SellersApi.js';

const normalize = (value) =>
  String(value || '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export class StoresViewModel {
  constructor({
    sellersApi = new SellersApi(),
    onNavigate = null,
    initialQuery = '',
    initialPage = 1,
  } = {}) {
    this.sellersApi = sellersApi;
    this.onNavigate = onNavigate;
    this.sellers = [];
    this.allSellers = [];
    this.query = String(initialQuery || '').trim();
    this.page = Number(initialPage) || 1;
    this.pageSize = 20;
    this.isLoading = false;
    this.errorMessage = '';
    this._listeners = new Set();
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.sellers.length / this.pageSize));
  }

  get paginatedSellers() {
    return this.sellers.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get isFiltered() {
    return this.query.trim().length > 0;
  }

  get isEmpty() {
    return !this.isLoading && !this.errorMessage && this.sellers.length === 0;
  }

  async load() {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();
    try {
      this.allSellers = await this.sellersApi.listSellers();
      this._applySearch();
      this.page = Math.min(Math.max(1, this.page), this.totalPages);
    } catch {
      this.allSellers = [];
      this.sellers = [];
      this.errorMessage = 'No se pudieron cargar las tiendas.';
      this._notify();
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  async search(query) {
    this.query = String(query || '').trim();
    this.page = 1;
    this._applySearch();
    this._notify();
    this._syncUrl();
  }

  setPage(page) {
    this.page = Math.min(Math.max(1, Number(page) || 1), this.totalPages);
    this._notify();
    this._syncUrl();
  }

  clearSearch() {
    this.query = '';
    this.page = 1;
    this.sellers = [...this.allSellers];
    this._notify();
    this._syncUrl();
  }

  _applySearch() {
    const query = normalize(this.query);
    this.sellers = query
      ? this.allSellers.filter(
          (seller) =>
            normalize(seller.username).includes(query) || normalize(seller.fullName).includes(query)
        )
      : [...this.allSellers];
  }

  _syncUrl() {
    const params = new URLSearchParams(window.location.search);
    params.delete('q');
    params.delete('page');
    if (this.query) params.set('q', this.query);
    if (this.page > 1) params.set('page', String(this.page));
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
