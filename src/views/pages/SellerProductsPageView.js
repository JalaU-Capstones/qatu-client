import { SellerProductsViewModel } from '../../viewmodels/pages/SellerProductsViewModel.js';
import { ProductCard } from '../components/ProductCard.js';

export class SellerProductsPageView {
  /**
   * @param {Object} [options]
   * @param {SellerProductsViewModel} [options.viewModel]
   * @param {Function} [options.onNavigate]
   * @param {Function} [options.onCreate]
   * @param {Function} [options.onViewProduct]
   * @param {Function} [options.onEditProduct]
   * @param {Function} [options.onDeleteProduct]
   */
  constructor({
    viewModel = new SellerProductsViewModel(),
    onNavigate = null,
    onCreate = null,
    onViewProduct = null,
    onEditProduct = null,
    onDeleteProduct = null,
  } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.onCreate = onCreate;
    this.onViewProduct = onViewProduct;
    this.onEditProduct = onEditProduct;
    this.onDeleteProduct = onDeleteProduct;
    this.element = null;
    this._unsubscribe = null;
    this._kpisContainer = null;
    this._filtersContainer = null;
    this._contentContainer = null;
    this._paginationContainer = null;
  }

  mount(container) {
    this.element = this._buildShell();
    container.appendChild(this.element);
    this._unsubscribe = this.viewModel.subscribe(() => this._render());
    this._render();
    this.viewModel.load();
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this.element?.parentElement) {
      this.element.remove();
    }
    this.element = null;
    this._kpisContainer = null;
    this._filtersContainer = null;
    this._contentContainer = null;
    this._paginationContainer = null;
  }

  _buildShell() {
    const section = document.createElement('section');
    section.className = 'q-seller-products';
    section.setAttribute('aria-label', 'Panel de productos del vendedor');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const breadcrumb = this._renderBreadcrumb();

    // Header
    const header = document.createElement('div');
    header.className = 'q-seller-products__header';

    const headerText = document.createElement('div');
    headerText.className = 'q-seller-products__header-text';

    const title = document.createElement('h1');
    title.className = 'q-seller-products__title';
    title.textContent = 'Mis Productos';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-seller-products__subtitle';
    subtitle.textContent = 'Gestiona tu catálogo';

    headerText.append(title, subtitle);

    const createBtn = document.createElement('button');
    createBtn.type = 'button';
    createBtn.className = 'q-btn q-btn--primary q-seller-products__create-btn';
    createBtn.textContent = 'Crear producto';
    createBtn.addEventListener('click', () => {
      if (typeof this.onCreate === 'function') {
        this.onCreate();
      } else if (typeof this.onNavigate === 'function') {
        this.onNavigate('/seller/products/new');
      }
    });

    header.append(headerText, createBtn);

    // KPIs container
    this._kpisContainer = document.createElement('div');
    this._kpisContainer.className = 'q-seller-products__kpis';
    this._kpisContainer.dataset.role = 'kpis';

    // Filters container
    this._filtersContainer = document.createElement('div');
    this._filtersContainer.className = 'q-seller-products__filters';
    this._filtersContainer.setAttribute('role', 'tablist');
    this._filtersContainer.setAttribute('aria-label', 'Filtrar productos por estado');

    // Content container
    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'q-seller-products__content';
    this._contentContainer.id = 'seller-products-panel';
    this._contentContainer.setAttribute('role', 'tabpanel');
    this._contentContainer.dataset.role = 'content';

    // Pagination container
    this._paginationContainer = document.createElement('div');
    this._paginationContainer.dataset.role = 'pagination';

    container.append(
      breadcrumb,
      header,
      this._kpisContainer,
      this._filtersContainer,
      this._contentContainer,
      this._paginationContainer
    );
    section.appendChild(container);
    return section;
  }

  _renderBreadcrumb() {
    const nav = document.createElement('nav');
    nav.className = 'q-breadcrumb q-seller-products__breadcrumb';
    nav.setAttribute('aria-label', 'Migas de pan');

    const home = document.createElement('a');
    home.className = 'q-breadcrumb__link';
    home.href = '/';
    home.dataset.route = '';
    home.textContent = 'Inicio';

    const sellerPanel = document.createElement('a');
    sellerPanel.className = 'q-breadcrumb__link';
    sellerPanel.href = '/seller/orders';
    sellerPanel.dataset.route = '';
    sellerPanel.textContent = 'Panel del vendedor';

    const current = document.createElement('span');
    current.className = 'q-breadcrumb__current';
    current.setAttribute('aria-current', 'page');
    current.textContent = 'Mis productos';

    nav.append(
      home,
      this._renderBreadcrumbSeparator(),
      sellerPanel,
      this._renderBreadcrumbSeparator(),
      current
    );
    return nav;
  }

  _renderBreadcrumbSeparator() {
    const separator = document.createElement('span');
    separator.className = 'q-breadcrumb__separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '/';
    return separator;
  }

  _render() {
    if (!this.element) return;
    this._renderKpis();
    this._renderFilters();
    this._contentContainer.setAttribute(
      'aria-labelledby',
      `seller-products-tab-${this.viewModel.filterStatus || 'all'}`
    );
    this._renderContent();
    this._renderPagination();
  }

  _renderKpis() {
    if (!this._kpisContainer) return;
    this._kpisContainer.replaceChildren();

    const kpis = this.viewModel.kpis;
    const kpiData = [
      { key: 'total', label: 'Total', value: kpis.total },
      { key: 'published', label: 'Publicados', value: kpis.published },
      { key: 'drafts', label: 'Borradores', value: kpis.drafts },
      { key: 'unpublished', label: 'No publicados', value: kpis.unpublished },
      { key: 'withImage', label: 'Con imagen', value: kpis.withImage },
    ];

    for (const item of kpiData) {
      const card = document.createElement('div');
      card.className = 'q-seller-products__kpi q-glass-panel';
      card.dataset.kpi = item.key;

      const label = document.createElement('span');
      label.className = 'q-seller-products__kpi-label';
      label.textContent = item.label;

      const val = document.createElement('strong');
      val.className = 'q-seller-products__kpi-value';
      val.textContent = String(item.value);

      card.append(label, val);
      this._kpisContainer.appendChild(card);
    }
  }

  _renderFilters() {
    if (!this._filtersContainer) return;
    this._filtersContainer.replaceChildren();

    const tabs = [
      { label: 'Todos', status: null },
      { label: 'Borradores', status: 'draft' },
      { label: 'Publicados', status: 'published' },
      { label: 'No publicados', status: 'unpublished' },
    ];

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-seller-products__filter';
      if (this.viewModel.filterStatus === tab.status) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        btn.tabIndex = 0;
      } else {
        btn.setAttribute('aria-selected', 'false');
        btn.tabIndex = -1;
      }
      btn.setAttribute('role', 'tab');
      btn.id = `seller-products-tab-${tab.status || 'all'}`;
      btn.setAttribute('aria-controls', 'seller-products-panel');
      btn.textContent = tab.label;
      btn.dataset.status = tab.status || 'all';
      btn.addEventListener('click', () => {
        this.viewModel.setFilter(tab.status);
      });
      this._filtersContainer.appendChild(btn);
    }
  }

  _renderContent() {
    if (!this._contentContainer) return;
    this._contentContainer.replaceChildren();

    if (this.viewModel.isLoading) {
      const loading = document.createElement('div');
      loading.className = 'q-seller-products__loading';
      loading.setAttribute('role', 'status');
      loading.setAttribute('aria-live', 'polite');
      loading.textContent = 'Cargando productos…';
      this._contentContainer.appendChild(loading);
      return;
    }

    if (this.viewModel.errorMessage) {
      const errorBox = document.createElement('div');
      errorBox.className = 'q-seller-products__error';
      errorBox.setAttribute('role', 'alert');

      const msg = document.createElement('p');
      msg.className = 'q-seller-products__error-message';
      msg.textContent = this.viewModel.errorMessage;

      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'q-btn q-btn--outline q-btn--sm q-seller-products__retry-btn';
      retryBtn.textContent = 'Reintentar';
      retryBtn.addEventListener('click', () => {
        this.viewModel.load();
      });

      errorBox.append(msg, retryBtn);
      this._contentContainer.appendChild(errorBox);
      return;
    }

    if (this.viewModel.products.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'q-seller-products__empty';

      const p = document.createElement('p');
      p.textContent = 'No tienes productos en esta lista.';

      empty.appendChild(p);
      this._contentContainer.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'q-seller-products__grid';
    grid.dataset.role = 'grid';
    grid.setAttribute('role', 'list');

    for (const product of this.viewModel.products) {
      grid.appendChild(this._renderProductCard(product));
    }

    this._contentContainer.appendChild(grid);
  }

  _renderPagination() {
    if (!this._paginationContainer) return;
    this._paginationContainer.replaceChildren();

    const vm = this.viewModel;
    // Only show when not loading, have products, and more than 1 page
    if (vm.isLoading || vm.products.length === 0 || (vm.meta?.total_pages || 0) <= 1) {
      return;
    }

    const nav = document.createElement('nav');
    nav.className = 'q-seller-products__pagination';
    nav.setAttribute('aria-label', 'Paginación de productos');

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'q-btn q-btn--outline q-btn--sm q-seller-products__pagination-prev';
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = !vm.hasPrevPage;
    prevBtn.addEventListener('click', () => {
      vm.setPage(vm.currentPage - 1);
    });

    const rangeLabel = document.createElement('span');
    rangeLabel.className = 'q-seller-products__pagination-label';
    rangeLabel.textContent = vm.pageRangeLabel;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'q-btn q-btn--outline q-btn--sm q-seller-products__pagination-next';
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = !vm.hasNextPage;
    nextBtn.addEventListener('click', () => {
      vm.setPage(vm.currentPage + 1);
    });

    nav.append(prevBtn, rangeLabel, nextBtn);
    this._paginationContainer.appendChild(nav);
  }

  _renderProductCard(product) {
    const card = new ProductCard({
      product,
      variant: 'seller',
      hideAddToCart: true,
      hideSellerActions: true,
      onView: product.slug ? () => this.onViewProduct?.(product.slug) : undefined,
    }).render();
    card.dataset.productId = product.id;
    card.dataset.productState = product.state;

    const body = card.querySelector('.product-card__body');
    const media = card.querySelector('.product-card__media');
    const sellerControls = card.querySelector('.product-card__seller-controls');
    const status = sellerControls.querySelector('.product-card__status');
    if (status) {
      media.prepend(status);
    }
    sellerControls.remove();

    const stock = document.createElement('span');
    stock.className = 'q-seller-products__stock';
    stock.textContent = `Stock: ${product.stock ?? 0}`;
    const details = card.querySelector('.product-card__title-price') || body;
    details.appendChild(stock);

    const actions = document.createElement('div');
    actions.className = 'product-card__seller-controls q-seller-products__actions';
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', `Acciones para ${product.name || 'producto'}`);

    const addAction = (label, className, onClick) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.setAttribute('aria-label', `${label} ${product.name || 'producto'}`);
      button.addEventListener('click', onClick);
      actions.appendChild(button);
      return button;
    };

    if (product.state === 'published') {
      const isUnpublishing = this.viewModel.publishingId === product.id;
      const unpublishBtn = addAction(
        isUnpublishing ? 'Despublicando…' : 'Despublicar',
        'q-btn q-btn--outline q-btn--sm q-seller-products__unpublish-btn',
        () => this.viewModel.unpublishProduct(product.id)
      );
      unpublishBtn.disabled = isUnpublishing;
    } else if (product.state === 'draft' || product.state === 'unpublished') {
      const isPublishing = this.viewModel.publishingId === product.id;
      const canPublish = this.viewModel.canPublish(product);
      const publishBtn = addAction(
        isPublishing ? 'Publicando…' : 'Publicar',
        'q-btn q-btn--primary q-btn--sm q-seller-products__publish-btn',
        () => this.viewModel.publishProduct(product.id)
      );
      if (!canPublish || isPublishing) {
        publishBtn.disabled = true;
        if (!canPublish) {
          publishBtn.title = this.viewModel.publishTooltip;
        }
      }
    }

    addAction('Editar', 'q-btn q-btn--neutral q-btn--sm q-seller-products__edit-btn', () =>
      this.onEditProduct?.(product.id)
    );
    addAction('Eliminar', 'q-btn q-btn--outline q-btn--sm q-seller-products__delete-btn', () =>
      this.onDeleteProduct?.(product.id)
    );

    if (product.state === 'published' && product.slug) {
      addAction('Ver', 'q-btn q-btn--outline q-btn--sm q-seller-products__view-btn', () =>
        this.onViewProduct?.(product.slug)
      );
    }

    if (this.viewModel.publishErrors[product.id]) {
      const errorSpan = document.createElement('span');
      errorSpan.className = 'q-seller-products__publish-error';
      errorSpan.textContent = this.viewModel.publishErrors[product.id];
      errorSpan.setAttribute('role', 'alert');
      actions.appendChild(errorSpan);
    }

    body.appendChild(actions);
    return card;
  }
}
