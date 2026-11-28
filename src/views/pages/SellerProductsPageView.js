import { authStore } from '../../store/authStore.js';
import { SellerProductsViewModel } from '../../viewmodels/pages/SellerProductsViewModel.js';
import { ProductCard } from '../components/ProductCard.js';

const ICON_SHAPES = {
  add: [['path', { d: 'M12 5v14M5 12h14' }]],
  alert: [
    ['path', { d: 'm10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z' }],
    ['path', { d: 'M12 9v4m0 4h.01' }],
  ],
  box: [
    ['path', { d: 'm12 3 9 5-9 5-9-5 9-5Z' }],
    ['path', { d: 'M3 8v8l9 5 9-5V8M12 13v8' }],
  ],
  check: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'm8 12 2.5 2.5L16 9' }],
  ],
  chevronLeft: [['path', { d: 'm15 18-6-6 6-6' }]],
  chevronRight: [['path', { d: 'm9 18 6-6-6-6' }]],
  delete: [['path', { d: 'M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6' }]],
  edit: [['path', { d: 'm16 4 4 4M4 20l4.5-1 10.8-10.8a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z' }]],
  eye: [
    ['path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }],
    ['circle', { cx: '12', cy: '12', r: '3' }],
  ],
  eyeOff: [
    ['path', { d: 'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8' }],
    [
      'path',
      {
        d: 'M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 4-.8',
      },
    ],
  ],
  image: [
    ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '3' }],
    ['circle', { cx: '8.5', cy: '8.5', r: '1.5' }],
    ['path', { d: 'm21 15-5-5L5 21' }],
  ],
  publish: [['path', { d: 'M12 19V5m-7 7 7-7 7 7' }]],
  unpublish: [['path', { d: 'M12 5v14m7-7-7 7-7-7' }]],
};

function createIcon(name, className = '') {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.setAttribute('class', ['q-seller-products__icon', className].filter(Boolean).join(' '));

  for (const [tagName, attributes] of ICON_SHAPES[name] || ICON_SHAPES.box) {
    const shape = document.createElementNS(namespace, tagName);
    for (const [attribute, value] of Object.entries(attributes)) {
      shape.setAttribute(attribute, value);
    }
    icon.appendChild(shape);
  }
  return icon;
}

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
    if (authStore.isAdmin()) {
      this._renderAdminForbidden();
      return this.element;
    }
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
    createBtn.append(createIcon('add'), document.createTextNode('Crear producto'));
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

  _renderAdminForbidden() {
    if (!this._contentContainer) return;
    this._contentContainer.replaceChildren();

    const box = document.createElement('div');
    box.className = 'q-admin-applications-forbidden';
    box.setAttribute('role', 'alert');

    const code = document.createElement('p');
    code.className = 'q-admin-applications-forbidden__code';
    code.textContent = 'No disponible';

    const title = document.createElement('h2');
    title.className = 'q-admin-applications-forbidden__title';
    title.textContent = 'Esta sección no está disponible para administradores';

    const description = document.createElement('p');
    description.textContent =
      'La gestión de productos es exclusiva de vendedores. Como administrador, revisa las categorías y las solicitudes de vendedores desde el panel de administración.';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'q-btn q-btn--primary';
    button.textContent = 'Ir a reportes';
    button.addEventListener('click', () => {
      if (typeof this.onNavigate === 'function') {
        this.onNavigate('/admin/reports');
      } else {
        window.location.assign('/admin/reports');
      }
    });

    box.append(code, title, description, button);
    this._contentContainer.appendChild(box);
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
      { key: 'total', label: 'Total', value: kpis.total, icon: 'box' },
      { key: 'published', label: 'Publicados', value: kpis.published, icon: 'check' },
      { key: 'drafts', label: 'Borradores', value: kpis.drafts, icon: 'edit' },
      { key: 'unpublished', label: 'No publicados', value: kpis.unpublished, icon: 'eyeOff' },
      { key: 'withImage', label: 'Con imagen', value: kpis.withImage, icon: 'image' },
    ];

    for (const item of kpiData) {
      const card = document.createElement('div');
      card.className = 'q-seller-products__kpi q-glass-panel';
      card.dataset.kpi = item.key;

      const heading = document.createElement('div');
      heading.className = 'q-seller-products__kpi-heading';

      const icon = document.createElement('span');
      icon.className = 'q-seller-products__kpi-icon';
      icon.appendChild(createIcon(item.icon));

      const label = document.createElement('span');
      label.className = 'q-seller-products__kpi-label';
      label.textContent = item.label;

      const val = document.createElement('strong');
      val.className = 'q-seller-products__kpi-value';
      val.textContent = String(item.value);

      heading.append(icon, label);
      card.append(heading, val);
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

      const icon = createIcon('alert', 'q-seller-products__state-icon');
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'q-btn q-btn--outline q-btn--sm q-seller-products__retry-btn';
      retryBtn.textContent = 'Reintentar';
      retryBtn.addEventListener('click', () => {
        this.viewModel.load();
      });

      errorBox.append(icon, msg, retryBtn);
      this._contentContainer.appendChild(errorBox);
      return;
    }

    if (this.viewModel.products.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'q-seller-products__empty';

      const p = document.createElement('p');
      p.textContent = 'No tienes productos en esta lista.';

      empty.append(createIcon('box', 'q-seller-products__state-icon'), p);
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
    prevBtn.append(createIcon('chevronLeft'), document.createTextNode('Anterior'));
    prevBtn.setAttribute('aria-label', 'Página anterior');
    prevBtn.disabled = !vm.hasPrevPage;
    prevBtn.addEventListener('click', () => {
      vm.setPage(vm.currentPage - 1);
    });

    const rangeLabel = document.createElement('div');
    rangeLabel.className = 'q-seller-products__pagination-range';
    const fullRange = document.createElement('span');
    fullRange.className = 'q-seller-products__pagination-label';
    fullRange.textContent = vm.pageRangeLabel;
    const compactRange = document.createElement('span');
    compactRange.className = 'q-seller-products__pagination-compact';
    compactRange.textContent = vm.compactPageRangeLabel;
    rangeLabel.append(fullRange, compactRange);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'q-btn q-btn--outline q-btn--sm q-seller-products__pagination-next';
    nextBtn.append(document.createTextNode('Siguiente'), createIcon('chevronRight'));
    nextBtn.setAttribute('aria-label', 'Página siguiente');
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

    const addAction = (label, iconName, className, onClick) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.append(createIcon(iconName), document.createTextNode(label));
      button.setAttribute('aria-label', `${label} ${product.name || 'producto'}`);
      button.addEventListener('click', onClick);
      actions.appendChild(button);
      return button;
    };

    if (product.state === 'published') {
      const isUnpublishing = this.viewModel.publishingId === product.id;
      const unpublishBtn = addAction(
        isUnpublishing ? 'Despublicando…' : 'Despublicar',
        'unpublish',
        'q-btn q-btn--outline q-btn--sm q-seller-products__unpublish-btn',
        () => this.viewModel.unpublishProduct(product.id)
      );
      unpublishBtn.disabled = isUnpublishing;
    } else if (product.state === 'draft' || product.state === 'unpublished') {
      const isPublishing = this.viewModel.publishingId === product.id;
      const canPublish = this.viewModel.canPublish(product);
      const publishBtn = addAction(
        isPublishing ? 'Publicando…' : 'Publicar',
        'publish',
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

    addAction('Editar', 'edit', 'q-btn q-btn--neutral q-btn--sm q-seller-products__edit-btn', () =>
      this.onEditProduct?.(product.id)
    );
    addAction(
      'Eliminar',
      'delete',
      'q-btn q-btn--outline q-btn--sm q-seller-products__delete-btn',
      () => this.onDeleteProduct?.(product.id)
    );

    if (product.state === 'published' && product.slug) {
      addAction('Ver', 'eye', 'q-btn q-btn--outline q-btn--sm q-seller-products__view-btn', () =>
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
