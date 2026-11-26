import { SellersApi } from '../../models/api/SellersApi.js';

export class FeaturedStoresViewModel {
  constructor({ sellersApi = new SellersApi(), onSeeAll = null, onStoreClick = null } = {}) {
    this.sellersApi = sellersApi;
    this.onSeeAll = onSeeAll;
    this.onStoreClick = onStoreClick;
    this.sellers = [];
    this.isLoading = false;
    this.errorMessage = '';
    this.eyebrow = 'VENDEDORES DESTACADOS';
    this.title = 'Tiendas destacadas';
    this.subtitle = "Los vendedores con más productos en Q'atu";
    this.seeAllHref = '/stores';
    this.seeAllLabel = 'Ver todas las tiendas';
    this._listeners = new Set();
  }

  async load() {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();
    try {
      this.sellers = (await this.sellersApi.listSellers()).slice(0, 3);
    } catch {
      this.errorMessage = 'No se pudieron cargar las tiendas.';
      this.sellers = [];
      this._notify();
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
