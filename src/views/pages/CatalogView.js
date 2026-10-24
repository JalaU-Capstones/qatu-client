import { CatalogViewModel } from '../../viewmodels/pages/CatalogViewModel.js';
import { FooterView } from '../components/FooterView.js';
import { HeaderView } from '../components/HeaderView.js';
import { ProductCardView } from '../components/ProductCardView.js';

/**
 * Page view for the Catalog route ('/products').
 * Renders the Header, Catalog section with product grid and pagination, and Footer.
 */
export class CatalogView {
  /**
   * @param {CatalogViewModel} [viewModel]
   */
  constructor(viewModel = new CatalogViewModel()) {
    this.viewModel = viewModel;
    this._header = null;
    this._footer = null;
    this._main = null;
    this._grid = null;
    this._pagination = null;
    this._unsubscribe = null;
  }

  /**
   * Mounts the catalog page into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    container.className = 'q-app';

    this._header = new HeaderView();
    this._header.mount(container);

    this._main = document.createElement('main');
    this._main.className = 'q-main';

    const section = document.createElement('section');
    section.className = 'q-catalog';
    section.setAttribute('aria-label', 'Catálogo de productos');

    const inner = document.createElement('div');
    inner.className = 'q-section-container';

    // Header title and subtitle
    const headerDiv = document.createElement('div');
    headerDiv.className = 'q-catalog__header';

    const title = document.createElement('h1');
    title.className = 'q-catalog__title';
    title.textContent = 'Catálogo';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-catalog__subtitle';
    subtitle.textContent = 'Explora todos nuestros productos disponibles';

    headerDiv.appendChild(title);
    headerDiv.appendChild(subtitle);
    inner.appendChild(headerDiv);

    // Product grid container
    const grid = document.createElement('div');
    grid.className = 'q-catalog__grid';
    grid.id = 'q-catalog-grid';
    this._grid = grid;
    inner.appendChild(grid);

    // Pagination container
    const pagination = document.createElement('div');
    pagination.className = 'q-catalog__pagination';
    this._pagination = pagination;
    inner.appendChild(pagination);

    section.appendChild(inner);
    this._main.appendChild(section);
    container.appendChild(this._main);

    this._footer = new FooterView();
    this._footer.mount(container);

    // Subscribe to ViewModel state changes
    this._unsubscribe = this.viewModel.subscribe((vm) => {
      this._update(vm);
    });

    // Render initial state
    this._update(this.viewModel);

    // Load initial page of products
    this.viewModel.loadProducts(1);
  }

  /**
   * Updates the UI based on ViewModel state.
   * @param {CatalogViewModel} vm
   * @private
   */
  _update(vm) {
    if (!this._grid || !this._pagination) {
      return;
    }

    this._grid.innerHTML = '';

    if (vm.isLoading) {
      const loading = document.createElement('p');
      loading.className = 'q-catalog__message q-catalog__message--loading';
      loading.setAttribute('role', 'status');
      loading.textContent = 'Cargando productos...';
      this._grid.appendChild(loading);
    } else if (vm.errorMessage) {
      const error = document.createElement('p');
      error.className = 'q-catalog__message q-catalog__message--error';
      error.setAttribute('role', 'alert');
      error.textContent = vm.errorMessage;
      this._grid.appendChild(error);
    } else if (!vm.products || vm.products.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'q-catalog__message q-catalog__message--empty';
      empty.textContent = 'No hay productos disponibles';
      this._grid.appendChild(empty);
    } else {
      vm.products.forEach((product) => {
        const cardView = new ProductCardView(product);
        this._grid.appendChild(cardView.render());
      });
    }

    this._updatePagination(vm);
  }

  /**
   * Updates pagination controls based on ViewModel pagination metadata.
   * @param {CatalogViewModel} vm
   * @private
   */
  _updatePagination(vm) {
    if (!this._pagination) {
      return;
    }

    this._pagination.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'q-catalog__pagination-btn q-catalog__pagination-btn--prev';
    prevBtn.textContent = 'Anterior';
    prevBtn.disabled = vm.meta.page <= 1;
    prevBtn.addEventListener('click', () => {
      this.viewModel.prevPage();
    });

    const pageInfo = document.createElement('span');
    pageInfo.className = 'q-catalog__pagination-info';
    pageInfo.textContent = `Página ${vm.meta.page} de ${vm.meta.total_pages}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'q-catalog__pagination-btn q-catalog__pagination-btn--next';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = vm.meta.page >= vm.meta.total_pages || vm.meta.total_pages === 0;
    nextBtn.addEventListener('click', () => {
      this.viewModel.nextPage();
    });

    this._pagination.appendChild(prevBtn);
    this._pagination.appendChild(pageInfo);
    this._pagination.appendChild(nextBtn);
  }

  /**
   * Destroys all child components and cleans up event listeners and subscriptions.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._footer) {
      this._footer.destroy();
      this._footer = null;
    }
    if (this._main && this._main.parentNode) {
      this._main.parentNode.removeChild(this._main);
      this._main = null;
    }
    if (this._header) {
      this._header.destroy();
      this._header = null;
    }
    this._grid = null;
    this._pagination = null;
  }
}
