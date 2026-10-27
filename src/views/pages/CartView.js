import { CartViewModel } from '../../viewmodels/pages/CartViewModel.js';
import { QuantitySelectorView } from '../components/QuantitySelectorView.js';

/**
 * Shopping cart page content view. Mounts INSIDE the persistent
 * `<main class="q-main">`; header and footer belong to the app shell.
 */
export class CartView {
  /**
   * @param {Object} [options]
   * @param {CartViewModel} [options.viewModel]
   * @param {Function} [options.onCheckout] Overrides the default placeholder notice.
   */
  constructor({ viewModel = new CartViewModel(), onCheckout = null } = {}) {
    this.viewModel = viewModel;
    this.onCheckout = onCheckout;
    this.element = null;
    this._unsubscribe = null;
  }

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-cart';
    section.setAttribute('aria-label', 'Carrito de compras');
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

    container.appendChild(this._renderHeader());

    if (this.viewModel.isEmpty) {
      container.appendChild(this._renderEmptyState());
    } else {
      container.appendChild(this._renderLayout());
    }

    this.element.appendChild(container);
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderHeader() {
    const header = document.createElement('div');
    header.className = 'q-cart__header';

    const title = document.createElement('h1');
    title.className = 'q-cart__title';
    title.textContent = 'Carrito de compras';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-cart__subtitle';
    subtitle.textContent = this.viewModel.isEmpty
      ? 'Todavía no tienes productos en tu carrito.'
      : `Revisa tus productos: ${this.viewModel.getItemCountLabel()}.`;

    header.appendChild(title);
    header.appendChild(subtitle);
    return header;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderEmptyState() {
    const empty = document.createElement('div');
    empty.className = 'q-cart__empty';

    const icon = document.createElement('div');
    icon.className = 'q-cart__empty-icon';
    icon.textContent = 'X';

    const title = document.createElement('h2');
    title.className = 'q-cart__empty-title';
    title.textContent = 'Tu carrito está vacío';

    const message = document.createElement('p');
    message.className = 'q-cart__empty-message';
    message.textContent =
      'Explora el catálogo y añade tus productos favoritos. Los guardaremos aquí para ti.';

    const link = document.createElement('a');
    link.className = 'q-cart__continue q-cart__continue--primary';
    link.href = '/products';
    link.dataset.route = '';
    link.textContent = 'Continuar comprando';

    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(message);
    empty.appendChild(link);
    return empty;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderLayout() {
    const layout = document.createElement('div');
    layout.className = 'q-cart__layout';

    layout.appendChild(this._renderItems());
    layout.appendChild(this._renderSummary());
    return layout;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderItems() {
    const section = document.createElement('section');
    section.className = 'q-cart__items';
    section.setAttribute('aria-labelledby', 'q-cart-items-title');

    const title = document.createElement('h2');
    title.id = 'q-cart-items-title';
    title.className = 'q-cart__items-title';
    title.textContent = 'Productos';

    const list = document.createElement('ul');
    list.className = 'q-cart__list';

    this.viewModel.items.forEach((item) => {
      list.appendChild(this._renderItem(item));
    });

    section.appendChild(title);
    section.appendChild(list);
    return section;
  }

  /**
   * @param {Object} item
   * @returns {HTMLElement}
   * @private
   */
  _renderItem(item) {
    const li = document.createElement('li');
    li.className = 'q-cart-item';
    li.dataset.productId = item.productId;

    li.appendChild(this._renderItemMedia(item));

    const info = document.createElement('div');
    info.className = 'q-cart-item__info';

    const name = document.createElement('a');
    name.className = 'q-cart-item__name';
    name.href = item.detailHref || `/products/${item.productId}`;
    name.dataset.route = '';
    name.textContent = item.name;

    const seller = document.createElement('p');
    seller.className = 'q-cart-item__seller';
    seller.textContent = item.seller || '';

    const unitPrice = document.createElement('p');
    unitPrice.className = 'q-cart-item__unit-price';
    unitPrice.textContent = `${item.priceLabel} c/u`;

    info.appendChild(name);
    if (item.seller) info.appendChild(seller);
    info.appendChild(unitPrice);
    li.appendChild(info);

    const quantity = document.createElement('div');
    quantity.className = 'q-cart-item__quantity';

    const quantityLabel = document.createElement('span');
    quantityLabel.className = 'q-cart-item__quantity-label';
    quantityLabel.textContent = 'Cantidad';

    const selector = new QuantitySelectorView({
      value: item.quantity,
      min: 1,
      onChange: (value) => this.viewModel.setQuantity(item.productId, value),
      label: `Cantidad de ${item.name}`,
    });

    quantity.appendChild(quantityLabel);
    quantity.appendChild(selector.render());
    li.appendChild(quantity);

    const subtotal = document.createElement('div');
    subtotal.className = 'q-cart-item__subtotal';

    const subtotalLabel = document.createElement('span');
    subtotalLabel.className = 'q-cart-item__subtotal-label';
    subtotalLabel.textContent = 'Subtotal';

    const subtotalValue = document.createElement('strong');
    subtotalValue.className = 'q-cart-item__subtotal-value';
    subtotalValue.textContent = item.subtotalLabel;

    subtotal.appendChild(subtotalLabel);
    subtotal.appendChild(subtotalValue);
    li.appendChild(subtotal);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'q-cart-item__remove';
    remove.setAttribute('aria-label', `Eliminar ${item.name} del carrito`);
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => this.viewModel.remove(item.productId));
    li.appendChild(remove);

    return li;
  }

  /**
   * @param {Object} item
   * @returns {HTMLElement}
   * @private
   */
  _renderItemMedia(item) {
    const media = document.createElement('div');
    media.className = 'q-cart-item__media';

    if (item.imageUrl) {
      const photo = document.createElement('img');
      photo.className = 'q-cart-item__photo';
      photo.src = item.imageUrl;
      photo.alt = '';
      photo.loading = 'lazy';
      photo.addEventListener('error', () => {
        media.innerHTML = '';
        media.appendChild(this._renderMediaPlaceholder());
      });
      media.appendChild(photo);
      return media;
    }

    media.appendChild(this._renderMediaPlaceholder());
    return media;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderMediaPlaceholder() {
    const placeholder = document.createElement('div');
    placeholder.className = 'q-cart-item__placeholder';

    const markImg = document.createElement('img');
    markImg.src = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url).href;
    markImg.alt = '';
    markImg.setAttribute('width', '20');
    markImg.setAttribute('height', '20');

    const label = document.createElement('span');
    label.className = 'q-cart-item__placeholder-label';
    label.textContent = 'Imagen';

    placeholder.appendChild(markImg);
    placeholder.appendChild(label);
    return placeholder;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderSummary() {
    const aside = document.createElement('aside');
    aside.className = 'q-cart__summary';
    aside.setAttribute('aria-labelledby', 'q-cart-summary-title');

    const title = document.createElement('h2');
    title.id = 'q-cart-summary-title';
    title.className = 'q-cart__summary-title';
    title.textContent = 'Resumen del pedido';

    const rows = document.createElement('div');
    rows.className = 'q-cart__summary-rows';
    rows.appendChild(this._renderSummaryRow('Subtotal', this.viewModel.getSubtotalLabel()));

    const shippingRow = this._renderSummaryRow('Envío', this.viewModel.getShippingLabel());
    if (this.viewModel.shipping === 0) {
      shippingRow.querySelector('.q-cart__summary-value').classList.add('is-free');
    }
    rows.appendChild(shippingRow);

    const totalRow = document.createElement('div');
    totalRow.className = 'q-cart__summary-row q-cart__summary-row--total';
    const totalLabel = document.createElement('span');
    totalLabel.textContent = 'Total';
    const totalValue = document.createElement('strong');
    totalValue.className = 'q-cart__summary-value';
    totalValue.textContent = this.viewModel.getTotalLabel();
    totalRow.appendChild(totalLabel);
    totalRow.appendChild(totalValue);
    rows.appendChild(totalRow);

    const shippingNotice = document.createElement('p');
    shippingNotice.className = 'q-cart__shipping-notice';
    shippingNotice.textContent = this.viewModel.getShippingNotice();

    const checkout = document.createElement('button');
    checkout.type = 'button';
    checkout.className = 'q-cart__checkout';
    checkout.textContent = 'Continuar al pago';
    checkout.addEventListener('click', () => {
      if (typeof this.onCheckout === 'function') {
        this.onCheckout();
      } else {
        this.viewModel.checkout();
      }
    });

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'q-cart__clear';
    clear.textContent = 'Vaciar carrito';
    clear.addEventListener('click', () => this.viewModel.clear());

    const continueLink = document.createElement('a');
    continueLink.className = 'q-cart__continue';
    continueLink.href = '/products';
    continueLink.dataset.route = '';
    continueLink.textContent = 'Continuar comprando';

    aside.appendChild(title);
    aside.appendChild(rows);
    aside.appendChild(shippingNotice);
    aside.appendChild(checkout);
    aside.appendChild(clear);
    aside.appendChild(continueLink);

    if (this.viewModel.notice) {
      aside.appendChild(this._renderNotice());
    }

    return aside;
  }

  /**
   * @param {string} label
   * @param {string} value
   * @returns {HTMLElement}
   * @private
   */
  _renderSummaryRow(label, value) {
    const row = document.createElement('div');
    row.className = 'q-cart__summary-row';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'q-cart__summary-value';
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
  }

  /**
   * @returns {HTMLElement}
   * @private
   */
  _renderNotice() {
    const notice = document.createElement('div');
    notice.className = 'q-cart__notice';
    notice.setAttribute('role', 'status');

    const text = document.createElement('p');
    text.className = 'q-cart__notice-text';
    text.textContent = this.viewModel.notice;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'q-cart__notice-close';
    close.setAttribute('aria-label', 'Cerrar aviso');
    close.textContent = '×';
    close.addEventListener('click', () => this.viewModel.dismissNotice());

    notice.appendChild(text);
    notice.appendChild(close);
    return notice;
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (typeof this.viewModel.destroy === 'function') {
      this.viewModel.destroy();
    }
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
