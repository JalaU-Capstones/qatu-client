import { getOrderStatusLabel } from '../../models/entities/orderStatus.js';

/**
 * Component to display a list of orders or the "No orders yet" empty state.
 */
export class OrderListComponent {
  /**
   * @param {Object} [options]
   * @param {Array<Object>} [options.orders=[]]
   * @param {Function} [options.onOrderClick]
   */
  constructor({ orders = [], onOrderClick = null } = {}) {
    this.orders = Array.isArray(orders) ? orders : [];
    this.onOrderClick = onOrderClick;
    this.element = null;
  }

  /**
   * Updates orders and re-renders element if already mounted.
   * @param {Array<Object>} orders
   */
  setOrders(orders) {
    this.orders = Array.isArray(orders) ? orders : [];
    if (this.element) {
      const parent = this.element.parentElement;
      const nextSibling = this.element.nextSibling;
      this.element.remove();
      this.element = null;
      const newEl = this.render();
      if (parent) {
        parent.insertBefore(newEl, nextSibling);
      }
    }
  }

  /**
   * Formats ISO date to readable string.
   * @param {string|Date} dateStr
   * @returns {string}
   */
  _formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  }

  /**
   * Formats currency and total amount.
   * Uses currency code returned by the API; does not assume USD.
   * @param {number|string} total
   * @param {string} [currency='']
   * @returns {string}
   */
  _formatTotal(total, currency = '') {
    const num = Number(total) || 0;
    const formattedNum = num.toFixed(2);
    return currency ? `${currency} ${formattedNum}` : formattedNum;
  }

  /**
   * Renders the order list component.
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('div');
    container.className = 'q-order-list';
    container.setAttribute('data-testid', 'order-list');

    if (this.orders.length === 0) {
      // Empty state scenario
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'q-orders-empty';
      emptyDiv.setAttribute('data-testid', 'orders-empty-state');

      const emptyIcon = document.createElement('div');
      emptyIcon.className = 'q-orders-empty-icon';
      emptyIcon.innerHTML = `
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
      `;

      const emptyMessage = document.createElement('h3');
      emptyMessage.className = 'q-orders-empty-message';
      emptyMessage.textContent = 'Aún no tienes órdenes';

      const emptySubtitle = document.createElement('p');
      emptySubtitle.className = 'q-orders-empty-subtitle';
      emptySubtitle.textContent =
        'Aún no has realizado ninguna compra. Explora nuestro catálogo y encuentra lo que necesitas.';

      const exploreLink = document.createElement('a');
      exploreLink.className = 'q-btn q-btn--primary q-btn--block q-orders-empty-btn';
      exploreLink.href = '/products';
      exploreLink.setAttribute('data-route', '');
      exploreLink.textContent = 'Explorar productos';

      emptyDiv.appendChild(emptyIcon);
      emptyDiv.appendChild(emptyMessage);
      emptyDiv.appendChild(emptySubtitle);
      emptyDiv.appendChild(exploreLink);

      container.appendChild(emptyDiv);
      this.element = container;
      return container;
    }

    // Orders list scenario
    const list = document.createElement('ul');
    list.className = 'q-orders-grid';

    this.orders.forEach((order) => {
      const card = document.createElement('li');
      card.className = 'q-order-card';
      card.setAttribute('data-order-id', order.id);

      const header = document.createElement('div');
      header.className = 'q-order-card__header';

      const idBadge = document.createElement('span');
      idBadge.className = 'q-order-id';
      idBadge.setAttribute('data-testid', 'order-id');
      idBadge.textContent = order.order_number || order.id;

      const dateSpan = document.createElement('span');
      dateSpan.className = 'q-order-date';
      dateSpan.setAttribute('data-testid', 'order-date');
      dateSpan.textContent = this._formatDate(order.created_at);

      header.appendChild(idBadge);
      header.appendChild(dateSpan);

      const body = document.createElement('div');
      body.className = 'q-order-card__body';

      const statusBadge = document.createElement('span');
      statusBadge.className = `q-order-status q-order-status--${order.status || 'pending'}`;
      statusBadge.setAttribute('data-testid', 'order-status');
      statusBadge.textContent = getOrderStatusLabel(order.status || 'pending');

      const totalSpan = document.createElement('span');
      totalSpan.className = 'q-order-total';
      totalSpan.setAttribute('data-testid', 'order-total');
      totalSpan.textContent = this._formatTotal(order.total, order.currency);

      body.appendChild(statusBadge);
      body.appendChild(totalSpan);

      // If items exist, render preview
      if (Array.isArray(order.items) && order.items.length > 0) {
        const itemsPreview = document.createElement('div');
        itemsPreview.className = 'q-order-card__items';
        const itemsCountText =
          order.items.length === 1 ? '1 producto' : `${order.items.length} productos`;
        itemsPreview.textContent = itemsCountText;
        body.appendChild(itemsPreview);
      }

      // Actions / View detail button
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'q-order-card__actions';

      const viewDetailBtn = document.createElement('button');
      viewDetailBtn.type = 'button';
      viewDetailBtn.className = 'q-btn q-btn--outline q-btn--sm q-order-card__action-btn';
      viewDetailBtn.setAttribute('data-testid', 'view-order-details-btn');
      viewDetailBtn.textContent = 'Ver detalle';

      if (this.onOrderClick) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => this.onOrderClick(order));
        viewDetailBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onOrderClick(order);
        });
      }

      actionsDiv.appendChild(viewDetailBtn);
      body.appendChild(actionsDiv);

      card.appendChild(header);
      card.appendChild(body);
      list.appendChild(card);
    });

    container.appendChild(list);
    this.element = container;
    return container;
  }
}
