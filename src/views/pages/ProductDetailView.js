import { authStore as realAuthStore } from '../../store/authStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';
import { getProductImageUrl } from '../../utils/productImageUrl.js';
import { ProductDetailViewModel } from '../../viewmodels/pages/ProductDetailViewModel.js';
import { createImageWithFallback } from '../components/ImageWithFallback.js';
import { ProductCardView } from '../components/ProductCardView.js';
import { QuantitySelectorView } from '../components/QuantitySelectorView.js';

/**
 * Product detail page content view. Mounts INSIDE the persistent
 * `<main class="q-main">`; header and footer belong to the app shell.
 */
export class ProductDetailView {
  /**
   * @param {Object} [options]
   * @param {ProductDetailViewModel} [options.viewModel]
   * @param {string|null} [options.productSlug] Route segment (`/products/:slug`).
   * @param {Function} [options.onBuyNow] Called after a successful "Comprar ahora".
   * @param {Function} [options.onAuthRequired] Called when a guest tries to add
   *   the product to the cart — the shell redirects to `/login`.
   * @param {Function} [options.onEditProduct] Opens the existing edit modal.
   * @param {Function} [options.onDeleteProduct] Opens the existing delete confirmation.
   * @param {Function} [options.onAddToCart] Adds a similar product to the cart.
   * @param {Object} [options.authStore] Injectable for testing; defaults to the real singleton.
   */
  constructor({
    viewModel = new ProductDetailViewModel(),
    productSlug = null,
    onBuyNow = null,
    onAuthRequired = null,
    onEditProduct = null,
    onDeleteProduct = null,
    onAddToCart = null,
    authStore = realAuthStore,
  } = {}) {
    this.viewModel = viewModel;
    this.productSlug = productSlug;
    this.onBuyNow = onBuyNow;
    this.onAuthRequired = onAuthRequired;
    this.onEditProduct = onEditProduct;
    this.onDeleteProduct = onDeleteProduct;
    this.onAddToCart = onAddToCart;
    this.authStore = authStore;
    this.element = null;
    this._unsubscribe = null;
    this._authUnsubscribe = null;
  }

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-product-detail';
    section.setAttribute('aria-label', 'Detalle del producto');
    this.element = section;
    this._renderContent();
    return section;
  }

  /**
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    const el = this.render();
    container.appendChild(el);

    this._unsubscribe = this.viewModel.subscribe(() => {
      this._renderContent();
    });

    this._authUnsubscribe = this.authStore.subscribe(() => {
      this._renderContent();
    });

    if (this.productSlug) {
      this.viewModel.load(this.productSlug);
    }

    return el;
  }

  /**
   * @private
   */
  _renderContent() {
    if (!this.element) return;
    this.element.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const vm = this.viewModel;
    container.appendChild(this._renderBreadcrumb());

    if (vm.status === 'loading' || vm.status === 'idle') {
      container.appendChild(
        this._renderState('Cargando producto…', 'status', 'q-product-detail__message--loading')
      );
    } else if (vm.status === 'not-found') {
      container.appendChild(
        this._renderState(
          'No encontramos este producto. Puede que ya no esté disponible.',
          'alert',
          'q-product-detail__message--not-found',
          'Producto no encontrado'
        )
      );
    } else if (vm.status === 'error') {
      container.appendChild(
        this._renderState(
          vm.errorMessage || 'No pudimos cargar la información del producto.',
          'alert',
          'q-product-detail__message--error',
          'Algo salió mal'
        )
      );
    } else {
      container.appendChild(this._renderProductContext());
      container.appendChild(this._renderMain());
      container.appendChild(this._renderTabs());
      container.appendChild(this._renderSellerCard());
      container.appendChild(this._renderSimilar());
    }

    this.element.appendChild(container);
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderBreadcrumb() {
    const nav = document.createElement('nav');
    nav.className = 'q-breadcrumb';
    nav.setAttribute('aria-label', 'Migas de pan');

    const home = document.createElement('a');
    home.className = 'q-breadcrumb__link';
    home.href = '/';
    home.dataset.route = '';
    home.textContent = 'Inicio';

    const catalog = document.createElement('a');
    catalog.className = 'q-breadcrumb__link';
    catalog.href = '/products';
    catalog.dataset.route = '';
    catalog.textContent = 'Catálogo';

    const current = document.createElement('span');
    current.className = 'q-breadcrumb__current';
    current.setAttribute('aria-current', 'page');
    current.textContent = this.viewModel.product?.name || 'Producto';

    nav.appendChild(home);
    nav.appendChild(this._renderBreadcrumbSeparator());
    nav.appendChild(catalog);
    nav.appendChild(this._renderBreadcrumbSeparator());
    nav.appendChild(current);
    return nav;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderProductContext() {
    const context = document.createElement('p');
    context.className = 'q-product-detail__context';
    const category = this.viewModel.product?.category?.name;
    context.textContent = category ? `PRODUCTOS / ${category}` : 'PRODUCTOS';
    return context;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderBreadcrumbSeparator() {
    const separator = document.createElement('span');
    separator.className = 'q-breadcrumb__separator';
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '/';
    return separator;
  }

  /**
   * @param {string} message
   * @param {'status'|'alert'} role
   * @param {string} modifier
   * @param {string} [title]
   * @returns {HTMLElement}
   * @private
   */
  _renderState(message, role, modifier, title) {
    const wrapper = document.createElement('div');
    wrapper.className = 'q-product-detail__state';

    if (title) {
      const heading = document.createElement('h1');
      heading.className = 'q-product-detail__state-title';
      heading.textContent = title;
      wrapper.appendChild(heading);
    }

    const text = document.createElement('p');
    text.className = `q-product-detail__message ${modifier}`;
    text.setAttribute('role', role);
    text.textContent = message;
    wrapper.appendChild(text);

    const link = document.createElement('a');
    link.className = 'q-product-detail__state-link';
    link.href = '/products';
    link.dataset.route = '';
    link.textContent = 'Volver al catálogo';
    wrapper.appendChild(link);

    return wrapper;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderMain() {
    const main = document.createElement('div');
    main.className = 'q-product-detail__layout';

    main.appendChild(this._renderGallery());
    main.appendChild(this._renderInfo());
    return main;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderGallery() {
    const gallery = document.createElement('div');
    gallery.className = 'q-product-detail__gallery';

    const mainImage = document.createElement('div');
    mainImage.className = 'q-product-detail__main-image';
    const selectedFrame = this.viewModel.getGallery()[this.viewModel.selectedImage];
    mainImage.appendChild(
      this._renderImageFrame(
        selectedFrame || { path: null, label: this.viewModel.getSelectedImageLabel() },
        true
      )
    );

    const thumbnails = document.createElement('div');
    thumbnails.className = 'q-product-detail__thumbnails';
    thumbnails.setAttribute('role', 'group');
    thumbnails.setAttribute('aria-label', 'Vistas del producto');

    this.viewModel.getGallery().forEach((frame, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'q-product-detail__thumbnail';
      button.setAttribute('aria-label', `Ver ${frame.label}`);
      button.setAttribute('aria-pressed', String(index === this.viewModel.selectedImage));
      if (index === this.viewModel.selectedImage) {
        button.classList.add('is-selected');
      }

      button.appendChild(this._renderImageFrame(frame, false));
      button.addEventListener('click', () => this.viewModel.setSelectedImage(index));
      thumbnails.appendChild(button);
    });

    gallery.appendChild(mainImage);
    gallery.appendChild(thumbnails);
    return gallery;
  }

  /**
   * Renders the product photo when the frame has a contract `image_path`,
   * falling back to the design placeholder when it is missing or fails to load.
   * @param {{ path: string|null, label: string }} frame
   * @param {boolean} large
   * @returns {HTMLElement}
   * @private
   */
  _renderImageFrame(frame, large) {
    const wrapper = document.createElement('div');
    wrapper.className = large
      ? 'q-product-detail__image-frame q-product-detail__image-frame--large'
      : 'q-product-detail__image-frame';

    wrapper.appendChild(
      createImageWithFallback({
        src: frame?.path,
        alt: frame?.label || '',
        size: large ? 160 : 56,
        imageClassName: large
          ? 'q-product-detail__image-photo q-product-detail__image-photo--large'
          : 'q-product-detail__image-photo',
        placeholderClassName: large
          ? 'q-product-detail__image-placeholder q-product-detail__image-placeholder--large'
          : 'q-product-detail__image-placeholder',
        markClassName: 'q-product-detail__image-mark',
        label: frame?.label || 'Imagen del producto',
        labelClassName: 'q-product-detail__image-label',
      })
    );

    return wrapper;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderInfo() {
    const vm = this.viewModel;
    const product = vm.product;
    const info = document.createElement('div');
    info.className = 'q-product-detail__info q-glass-panel';

    const seller = document.createElement('p');
    seller.className = 'q-product-detail__seller-line';
    seller.textContent = vm.getSellerLine();
    info.appendChild(seller);

    const title = document.createElement('h1');
    title.className = 'q-product-detail__title';
    title.textContent = product.name;
    info.appendChild(title);

    const rating = document.createElement('div');
    rating.className = 'q-product-detail__rating';
    rating.appendChild(this._renderStars(vm.getStarsFilled()));
    const ratingText = document.createElement('span');
    ratingText.className = 'q-product-detail__rating-text';
    ratingText.textContent = vm.getRatingLabel();
    rating.appendChild(ratingText);
    info.appendChild(rating);

    const price = document.createElement('p');
    price.className = 'q-product-detail__price';
    price.textContent = vm.getPriceLabel();
    info.appendChild(price);

    const stock = document.createElement('p');
    stock.className = 'q-product-detail__stock';
    if (vm.isOutOfStock()) stock.classList.add('is-out-of-stock');
    stock.textContent = vm.getStockLabel();
    info.appendChild(stock);

    const description = document.createElement('p');
    description.className = 'q-product-detail__short-description';
    description.textContent = product.description;
    info.appendChild(description);

    const purchase = document.createElement('div');
    purchase.className = 'q-product-detail__purchase';

    const user = this.authStore.getUser();
    const isOwn = Boolean(user && user.id && product.seller_id && user.id === product.seller_id);

    if (isOwn) {
      purchase.appendChild(this._renderOwnerActions(product));
    } else {
      const quantityRow = document.createElement('div');
      quantityRow.className = 'q-product-detail__quantity-row';

      const quantityLabel = document.createElement('span');
      quantityLabel.className = 'q-product-detail__quantity-label';
      quantityLabel.textContent = 'Cantidad';

      const quantitySelector = new QuantitySelectorView({
        value: vm.quantity,
        min: 1,
        max: vm.getMaxQuantity(),
        disabled: vm.isOutOfStock(),
        onChange: (value) => vm.setQuantity(value),
        label: 'Cantidad del producto',
      });

      quantityRow.appendChild(quantityLabel);
      quantityRow.appendChild(quantitySelector.render());
      purchase.appendChild(quantityRow);

      const actions = document.createElement('div');
      actions.className = 'q-product-detail__actions';

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'q-btn q-btn--primary q-btn--block q-btn--lg q-product-detail__add';
      addButton.textContent = vm.isOutOfStock()
        ? 'Agotado'
        : vm.isAdding
          ? 'Añadiendo…'
          : 'Agregar al carrito';
      addButton.disabled = vm.isOutOfStock() || vm.isAdding;
      addButton.addEventListener('click', () =>
        vm.addToCart().then((result) => {
          if (result?.status === 'auth-required' && typeof this.onAuthRequired === 'function') {
            this.onAuthRequired();
          }
        })
      );
      actions.appendChild(addButton);

      const buyButton = document.createElement('button');
      buyButton.type = 'button';
      buyButton.className = 'q-btn q-btn--outline q-btn--block q-btn--lg q-product-detail__buy-now';
      buyButton.textContent = 'Comprar ahora';
      buyButton.disabled = vm.isOutOfStock() || vm.isAdding;
      buyButton.addEventListener('click', async () => {
        const result = await vm.addToCart();
        if (result.status === 'added' && typeof this.onBuyNow === 'function') {
          this.onBuyNow();
        } else if (result.status === 'auth-required' && typeof this.onAuthRequired === 'function') {
          this.onAuthRequired();
        }
      });
      actions.appendChild(buyButton);

      purchase.appendChild(actions);

      const shipping = document.createElement('p');
      shipping.className = 'q-product-detail__shipping';
      shipping.textContent = 'Envío gratis en compras sobre US$ 50.';
      purchase.appendChild(shipping);
    }

    info.appendChild(purchase);

    if (!isOwn && vm.feedback) {
      const feedback = document.createElement('p');
      feedback.className = 'q-product-detail__feedback';
      feedback.setAttribute('role', 'status');
      feedback.textContent = vm.feedback;
      info.appendChild(feedback);
    }

    return info;
  }

  /**
   * @param {Object} product
   * @returns {HTMLElement}
   * @private
   */
  _renderOwnerActions(product) {
    const vm = this.viewModel;
    const actions = document.createElement('section');
    actions.className = 'q-product-detail__owner-actions';
    actions.setAttribute('aria-label', 'Acciones del vendedor');

    const heading = document.createElement('h2');
    heading.className = 'q-product-detail__owner-title';
    heading.textContent = 'Administrar producto';
    actions.appendChild(heading);

    const buttons = document.createElement('div');
    buttons.className = 'q-product-detail__owner-buttons';

    const editButton = this._createOwnerActionButton('edit', 'Editar', 'q-btn--outline');
    editButton.addEventListener('click', () => this.onEditProduct?.(product.id));
    buttons.appendChild(editButton);

    const isUnpublished = product.state === 'unpublished';
    const unpublishButton = this._createOwnerActionButton(
      'unpublish',
      vm.isUnpublishing ? 'Despublicando…' : isUnpublished ? 'Despublicado' : 'Despublicar',
      'q-btn--outline'
    );
    unpublishButton.disabled = vm.isUnpublishing || isUnpublished || product.state !== 'published';
    unpublishButton.addEventListener('click', () => {
      void vm.unpublishProduct();
    });
    buttons.appendChild(unpublishButton);

    const deleteButton = this._createOwnerActionButton(
      'delete',
      vm.isDeleting ? 'Eliminando…' : 'Eliminar',
      'q-btn--danger'
    );
    deleteButton.disabled = vm.isDeleting;
    deleteButton.addEventListener('click', () => this.onDeleteProduct?.(product.id));
    buttons.appendChild(deleteButton);

    actions.appendChild(buttons);

    if (vm.ownerActionFeedback) {
      const notice = document.createElement('div');
      notice.className = `q-product-detail__owner-feedback q-product-detail__owner-feedback--${vm.ownerActionFeedbackType}`;
      notice.setAttribute('role', vm.ownerActionFeedbackType === 'alert' ? 'alert' : 'status');

      const message = document.createElement('p');
      message.textContent = vm.ownerActionFeedback;
      notice.appendChild(message);

      if (vm.ownerActionFeedbackType !== 'alert') {
        const productsLink = document.createElement('a');
        productsLink.href = '/seller/products';
        productsLink.dataset.route = '';
        productsLink.textContent = 'Ir a Mis productos';
        notice.appendChild(productsLink);
      }

      actions.appendChild(notice);
    }

    return actions;
  }

  /**
   * @param {'edit'|'unpublish'|'delete'} action
   * @param {string} label
   * @param {string} buttonVariant
   * @returns {HTMLButtonElement}
   * @private
   */
  _createOwnerActionButton(action, label, buttonVariant) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `q-btn ${buttonVariant} q-product-detail__owner-button q-product-detail__owner-button--${action}`;
    button.setAttribute('aria-label', label);

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('width', '18');
    icon.setAttribute('height', '18');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.75');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('stroke-linejoin', 'round');
    icon.setAttribute('aria-hidden', 'true');

    const paths = {
      edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z'],
      unpublish: ['M3 5.5h18v14H3z', 'M3 9h5l2 3h4l2-3h5', 'M12 2.5v6', 'm9.5 6 2.5 2.5L14.5 6'],
      delete: ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6', 'M10 11v5', 'M14 11v5'],
    };
    paths[action].forEach((pathData) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      icon.appendChild(path);
    });

    const text = document.createElement('span');
    text.textContent = label;
    button.append(icon, text);
    return button;
  }

  /**
   * @param {boolean[]} filled
   * @returns {HTMLElement}
   * @private
   */
  _renderStars(filled) {
    const wrap = document.createElement('span');
    wrap.className = 'q-product-detail__stars';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = filled
      .map(
        (isFilled) =>
          `<svg class="q-product-detail__star${isFilled ? ' is-filled' : ''}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
      )
      .join('');
    return wrap;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderTabs() {
    const vm = this.viewModel;
    const section = document.createElement('section');
    section.className = 'q-product-detail__tabs';
    section.setAttribute('aria-label', 'Información del producto');

    const tabList = document.createElement('div');
    tabList.className = 'q-product-detail__tablist';
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Secciones de información');

    vm.tabs.forEach((tab) => {
      const isActive = vm.activeTab === tab.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'q-product-detail__tab';
      button.id = `q-product-tab-${tab.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('aria-controls', `q-product-panel-${tab.id}`);
      button.tabIndex = isActive ? 0 : -1;
      if (isActive) button.classList.add('is-active');
      button.textContent = tab.label;
      button.addEventListener('click', () => vm.setTab(tab.id));
      tabList.appendChild(button);
    });

    const panel = document.createElement('div');
    panel.className = 'q-product-detail__panel';
    panel.id = `q-product-panel-${vm.activeTab}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `q-product-tab-${vm.activeTab}`);
    panel.appendChild(this._renderTabPanel(vm.activeTab));

    section.appendChild(tabList);
    section.appendChild(panel);
    return section;
  }

  /**
   * @param {string} tabId
   * @returns {HTMLElement}
   * @private
   */
  _renderTabPanel(tabId) {
    const vm = this.viewModel;

    if (tabId === 'features') {
      const list = document.createElement('dl');
      list.className = 'q-product-detail__attributes';
      vm.getAttributes().forEach((attribute) => {
        const term = document.createElement('dt');
        term.textContent = attribute.label;
        const value = document.createElement('dd');
        value.textContent = attribute.value;
        list.appendChild(term);
        list.appendChild(value);
      });
      return list;
    }

    if (tabId === 'reviews') {
      const reviews = vm.getReviews();
      if (reviews.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'q-product-detail__reviews-empty';
        empty.textContent = 'Todavía no hay reseñas para este producto.';
        return empty;
      }

      const list = document.createElement('ul');
      list.className = 'q-product-detail__reviews';
      reviews.forEach((review) => {
        const item = document.createElement('li');
        item.className = 'q-product-detail__review';

        const header = document.createElement('div');
        header.className = 'q-product-detail__review-header';

        const author = document.createElement('strong');
        author.textContent = review.author;

        const date = document.createElement('span');
        date.className = 'q-product-detail__review-date';
        date.textContent = review.date;

        header.appendChild(author);
        header.appendChild(date);
        item.appendChild(header);
        item.appendChild(this._renderStars(vm.getStarsForRating(review.rating)));

        const comment = document.createElement('p');
        comment.className = 'q-product-detail__review-comment';
        comment.textContent = review.comment;
        item.appendChild(comment);

        list.appendChild(item);
      });
      return list;
    }

    const description = document.createElement('p');
    description.className = 'q-product-detail__description';
    description.textContent = vm.product?.description || '';
    return description;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderSellerCard() {
    const vm = this.viewModel;
    const section = document.createElement('section');
    section.className = 'q-product-detail__seller-card';
    section.setAttribute('aria-label', `Sobre ${vm.getSellerLine()}`);

    const avatar = document.createElement('span');
    avatar.className = 'q-product-detail__seller-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = vm.getSellerInitials();

    const info = document.createElement('div');
    info.className = 'q-product-detail__seller-info';

    const heading = document.createElement('h2');
    heading.className = 'q-product-detail__seller-name';
    heading.textContent = vm.getSellerLine();

    info.appendChild(heading);

    const location = vm.getSellerLocation();
    if (location) {
      const locationElement = document.createElement('p');
      locationElement.className = 'q-product-detail__seller-location';
      locationElement.textContent = location;
      info.appendChild(locationElement);
    }

    const stats = document.createElement('p');
    stats.className = 'q-product-detail__seller-stats';
    stats.textContent = vm.getStockLabel() || 'Producto publicado en la tienda';

    info.appendChild(stats);

    const link = document.createElement('a');
    link.className = 'q-product-detail__seller-link';
    link.href = '/products';
    link.dataset.route = '';
    link.textContent = 'Ver tienda';

    section.appendChild(avatar);
    section.appendChild(info);
    section.appendChild(link);
    return section;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderSimilar() {
    const section = document.createElement('section');
    section.className = 'q-product-detail__similar';
    section.setAttribute('aria-labelledby', 'q-similar-title');

    const heading = document.createElement('div');
    heading.className = 'q-product-detail__similar-heading';

    const title = document.createElement('h2');
    title.id = 'q-similar-title';
    title.className = 'q-product-detail__similar-title';
    title.textContent = 'Productos similares';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-product-detail__similar-subtitle';
    subtitle.textContent = 'Otras piezas que podrían interesarte.';

    heading.appendChild(title);
    heading.appendChild(subtitle);
    section.appendChild(heading);

    if (this.viewModel.similarProducts.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'q-product-detail__similar-empty';
      empty.textContent = 'No hay recomendaciones disponibles por ahora.';
      section.appendChild(empty);
      return section;
    }

    const grid = document.createElement('ul');
    grid.className = 'q-product-detail__similar-grid q-catalog__grid';
    grid.setAttribute('role', 'list');

    this.viewModel.similarProducts.forEach((product) => {
      const rating = Number(product.average_rating || 0);
      const ratingCount = Number(product.ratings_count) || 0;
      const ratingLabel = product.average_rating
        ? `${rating.toFixed(1)} (${ratingCount})`
        : undefined;
      const seller = product.seller || product.store;
      const sellerLine =
        (typeof seller === 'string' && seller) ||
        seller?.full_name ||
        seller?.store_name ||
        seller?.username ||
        seller?.name ||
        product.seller_name ||
        product.store_name ||
        product.category?.name ||
        product.category_name ||
        '';
      const user = this.authStore.getUser();
      const isOwn = Boolean(user?.id && product.seller_id && user.id === product.seller_id);
      const card = new ProductCardView(
        {
          id: product.id,
          name: product.name,
          sellerLine,
          priceLabel: formatPrice(product.price, product.currency || 'BOB'),
          ratingLabel,
          ratingAccessible: ratingLabel
            ? `Calificación ${rating.toFixed(1)} de 5, ${ratingCount} reseñas`
            : undefined,
          starsFilled: this.viewModel.getStarsForRating(rating),
          imageUrl: getProductImageUrl(product),
          isNew: Boolean(product.is_new || product.isNew),
          badgeLabel: product.badge || product.tag || null,
          stock: typeof product.stock === 'number' ? product.stock : null,
          state: product.state || 'published',
        },
        {
          variant: 'default',
          onAddToCart: () => this.onAddToCart?.(product, 1),
          detailHref: `/products/${encodeURIComponent(product.slug || product.id)}`,
          hideCartButton: isOwn,
        }
      );
      grid.appendChild(card.render());
    });

    section.appendChild(grid);
    return section;
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._authUnsubscribe?.();
    this._authUnsubscribe = null;
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
