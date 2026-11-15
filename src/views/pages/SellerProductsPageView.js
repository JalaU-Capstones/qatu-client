import { formatPrice } from '../../utils/formatCurrency.js';
import { SellerProductsViewModel } from '../../viewmodels/pages/SellerProductsViewModel.js';

export class SellerProductsPageView {
  /**
   * @param {Object} [options]
   * @param {SellerProductsViewModel} [options.viewModel]
   * @param {Function} [options.onNavigate]
   * @param {Function} [options.onCreate]
   * @param {Function} [options.onViewProduct]
   */
  constructor({
    viewModel = new SellerProductsViewModel(),
    onNavigate = null,
    onCreate = null,
    onViewProduct = null,
  } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.onCreate = onCreate;
    this.onViewProduct = onViewProduct;
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

    // Content container
    this._contentContainer = document.createElement('div');
    this._contentContainer.className = 'q-seller-products__content';
    this._contentContainer.dataset.role = 'content';

    // Pagination container
    this._paginationContainer = document.createElement('div');
    this._paginationContainer.dataset.role = 'pagination';

    container.append(
      header,
      this._kpisContainer,
      this._filtersContainer,
      this._contentContainer,
      this._paginationContainer
    );
    section.appendChild(container);
    return section;
  }

  _render() {
    if (!this.element) return;
    this._renderKpis();
    this._renderFilters();
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
    ];

    for (const tab of tabs) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-seller-products__filter';
      if (this.viewModel.filterStatus === tab.status) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.setAttribute('aria-selected', 'false');
      }
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
    const card = document.createElement('article');
    card.className = 'q-seller-products__card q-glass-panel';
    card.dataset.productId = product.id;

    // Thumbnail
    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'q-seller-products__thumb-wrap';

    const showPlaceholder = () => {
      thumbWrap.replaceChildren();
      const placeholder = document.createElement('div');
      placeholder.className = 'q-seller-products__thumb-placeholder';
      const img = document.createElement('img');
      img.src = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url).href;
      img.alt = '';
      img.setAttribute('width', '32');
      img.setAttribute('height', '32');
      placeholder.appendChild(img);
      thumbWrap.appendChild(placeholder);
    };

    if (product.primary_image_path) {
      const img = document.createElement('img');
      img.className = 'q-seller-products__thumb';
      img.src = product.primary_image_path;
      img.alt = product.name || '';
      img.loading = 'lazy';
      img.addEventListener('error', showPlaceholder);
      thumbWrap.appendChild(img);
    } else {
      showPlaceholder();
    }

    card.appendChild(thumbWrap);

    // Info
    const info = document.createElement('div');
    info.className = 'q-seller-products__info';

    const headerRow = document.createElement('div');
    headerRow.className = 'q-seller-products__card-header';

    const title = document.createElement('h3');
    title.className = 'q-seller-products__name';
    title.textContent = product.name || 'Sin título';

    const badge = document.createElement('span');
    badge.className = `q-seller-products__badge q-seller-products__badge--${product.state}`;
    badge.textContent = product.state === 'published' ? 'Publicado' : 'Borrador';

    headerRow.append(title, badge);
    info.appendChild(headerRow);

    const metaRow = document.createElement('div');
    metaRow.className = 'q-seller-products__meta';

    const price = document.createElement('span');
    price.className = 'q-seller-products__price';
    price.textContent = formatPrice(product.price, product.currency);

    const stock = document.createElement('span');
    stock.className = 'q-seller-products__stock';
    stock.textContent = `Stock: ${product.stock ?? 0}`;

    metaRow.append(price, stock);
    info.appendChild(metaRow);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'q-seller-products__actions';

    if (product.state === 'draft') {
      const publishBtn = document.createElement('button');
      publishBtn.type = 'button';
      publishBtn.className = 'q-btn q-btn--primary q-btn--sm q-seller-products__publish-btn';
      const isPublishing = this.viewModel.publishingId === product.id;
      const canPublish = this.viewModel.canPublish(product);

      publishBtn.textContent = isPublishing ? 'Publicando…' : 'Publicar';

      if (!canPublish || isPublishing) {
        publishBtn.disabled = true;
        if (!canPublish) {
          publishBtn.title = this.viewModel.publishTooltip;
        }
      }

      publishBtn.addEventListener('click', () => {
        this.viewModel.publishProduct(product.id);
      });
      actions.appendChild(publishBtn);

      if (this.viewModel.publishErrors[product.id]) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'q-seller-products__publish-error';
        errorSpan.textContent = this.viewModel.publishErrors[product.id];
        actions.appendChild(errorSpan);
      }
    } else if (product.state === 'published') {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'q-btn q-btn--outline q-btn--sm q-seller-products__view-btn';
      viewBtn.textContent = 'Ver';
      viewBtn.addEventListener('click', () => {
        if (typeof this.onViewProduct === 'function') {
          this.onViewProduct(product.slug || product.id);
        } else if (typeof this.onNavigate === 'function') {
          this.onNavigate(`/products/${product.slug || product.id}`);
        }
      });
      actions.appendChild(viewBtn);
    }

    info.appendChild(actions);
    card.appendChild(info);
    return card;
  }
}
