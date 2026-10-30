/**
 * Component to display full details of a specific order.
 * Follows Qatu design tokens, accessible markup, and strict MVVM architecture.
 */
export class OrderDetailComponent {
  /**
   * @param {Object} [options]
   * @param {Object|null} [options.order=null]
   * @param {Function} [options.onBack] Callback when the user clicks 'Back to orders'.
   */
  constructor({ order = null, onBack = null } = {}) {
    this.order = order;
    this.onBack = onBack;
    this.element = null;
  }

  /**
   * Updates the order data and re-renders if mounted.
   * @param {Object|null} order
   */
  setOrder(order) {
    this.order = order;
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
   * Formats ISO date string to readable format.
   * @param {string|Date} dateStr
   * @returns {string}
   */
  _formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  }

  /**
   * Formats currency amounts.
   * @param {number} amount
   * @param {string} [currency='USD']
   * @returns {string}
   */
  _formatCurrency(amount, currency = 'USD') {
    const num = Number(amount) || 0;
    return `${currency} $${num.toFixed(2)}`;
  }

  /**
   * Renders the status progress tracker.
   * @param {string} currentStatus
   * @returns {HTMLElement}
   */
  _renderStatusTracker(currentStatus) {
    const tracker = document.createElement('div');
    tracker.className = 'q-order-tracker';
    tracker.setAttribute('data-testid', 'order-tracker');

    const steps = [
      { key: 'pending', label: 'Pendiente' },
      { key: 'confirmed', label: 'Confirmada' },
      { key: 'shipped', label: 'Enviada' },
      { key: 'delivered', label: 'Entregada' },
    ];

    const isCancelled = currentStatus === 'cancelled' || currentStatus === 'refunded';

    if (isCancelled) {
      const cancelledAlert = document.createElement('div');
      cancelledAlert.className = 'q-order-tracker__cancelled';
      cancelledAlert.setAttribute('data-testid', 'order-cancelled-notice');
      cancelledAlert.innerHTML = `
        <span class="q-order-tracker__cancelled-badge">Orden ${currentStatus === 'refunded' ? 'Reembolsada' : 'Cancelada'}</span>
        <p class="q-order-tracker__cancelled-desc">Esta orden no continuará su proceso de entrega.</p>
      `;
      tracker.appendChild(cancelledAlert);
      return tracker;
    }

    const currentIdx = steps.findIndex((s) => s.key === currentStatus);
    const activeIndex = currentIdx >= 0 ? currentIdx : 0;

    const list = document.createElement('ol');
    list.className = 'q-order-tracker__steps';

    steps.forEach((step, idx) => {
      const item = document.createElement('li');
      let statusClass = 'q-order-tracker__step--pending';
      if (idx < activeIndex) {
        statusClass = 'q-order-tracker__step--completed';
      } else if (idx === activeIndex) {
        statusClass = 'q-order-tracker__step--current';
      }

      item.className = `q-order-tracker__step ${statusClass}`;
      item.innerHTML = `
        <span class="q-order-tracker__icon" aria-hidden="true">${idx + 1}</span>
        <span class="q-order-tracker__label">${step.label}</span>
      `;
      list.appendChild(item);
    });

    tracker.appendChild(list);
    return tracker;
  }

  /**
   * Renders the Order Detail Component.
   * @returns {HTMLElement}
   */
  render() {
    const container = document.createElement('article');
    container.className = 'q-order-detail';
    container.setAttribute('data-testid', 'order-detail');

    if (!this.order) {
      container.innerHTML =
        '<p class="q-order-detail__empty">No se encontró información de la orden.</p>';
      this.element = container;
      return container;
    }

    const order = this.order;

    // 1. Back button header
    const topBar = document.createElement('div');
    topBar.className = 'q-order-detail__top-bar';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'q-button q-button--secondary q-order-detail__back-btn';
    backBtn.setAttribute('data-testid', 'order-detail-back-btn');
    backBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      <span>Volver a mis órdenes</span>
    `;

    if (this.onBack) {
      backBtn.addEventListener('click', () => this.onBack());
    }
    topBar.appendChild(backBtn);
    container.appendChild(topBar);

    // 2. Order Header (ID, Date, Status)
    const header = document.createElement('div');
    header.className = 'q-order-detail__header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'q-order-detail__header-left';

    const title = document.createElement('h2');
    title.className = 'q-order-detail__title';
    title.setAttribute('data-testid', 'order-detail-title');
    title.textContent = `Orden #${order.order_number || order.id}`;

    const dateSpan = document.createElement('p');
    dateSpan.className = 'q-order-detail__date';
    dateSpan.setAttribute('data-testid', 'order-detail-date');
    dateSpan.textContent = `Realizada el ${this._formatDate(order.created_at)}`;

    headerLeft.appendChild(title);
    headerLeft.appendChild(dateSpan);

    const headerRight = document.createElement('div');
    headerRight.className = 'q-order-detail__header-right';

    const statusBadge = document.createElement('span');
    statusBadge.className = `q-order-status q-order-status--${order.status || 'pending'}`;
    statusBadge.setAttribute('data-testid', 'order-detail-status');
    statusBadge.textContent = order.status || 'pending';

    headerRight.appendChild(statusBadge);

    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    container.appendChild(header);

    // 3. Status Tracker
    const tracker = this._renderStatusTracker(order.status || 'pending');
    container.appendChild(tracker);

    // 4. Main grid layout (Items section + Summary sidebar)
    const layoutGrid = document.createElement('div');
    layoutGrid.className = 'q-order-detail__grid';

    // 4A. Items Section
    const itemsSection = document.createElement('section');
    itemsSection.className = 'q-order-detail__items-section';
    itemsSection.setAttribute('aria-label', 'Productos en la orden');

    const itemsHeading = document.createElement('h3');
    itemsHeading.className = 'q-order-detail__section-title';
    itemsHeading.textContent = 'Productos';
    itemsSection.appendChild(itemsHeading);

    const itemsList = document.createElement('ul');
    itemsList.className = 'q-order-detail__items-list';
    itemsList.setAttribute('data-testid', 'order-detail-items-list');

    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'q-order-detail__item-empty';
      emptyItem.textContent = 'No hay desglose de productos disponible para esta orden.';
      itemsList.appendChild(emptyItem);
    } else {
      items.forEach((item) => {
        const itemEl = document.createElement('li');
        itemEl.className = 'q-order-detail__item';
        itemEl.setAttribute('data-testid', 'order-detail-item');

        const imgDiv = document.createElement('div');
        imgDiv.className = 'q-order-detail__item-image';
        if (item.product_image_path || item.product_image) {
          const img = document.createElement('img');
          img.src = item.product_image_path || item.product_image;
          img.alt = item.product_name || item.name || 'Producto';
          img.loading = 'lazy';
          imgDiv.appendChild(img);
        } else {
          imgDiv.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          `;
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'q-order-detail__item-info';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'q-order-detail__item-name';
        nameSpan.setAttribute('data-testid', 'order-item-name');
        nameSpan.textContent = item.product_name || item.name || 'Producto sin nombre';

        const qtySpan = document.createElement('span');
        qtySpan.className = 'q-order-detail__item-qty';
        qtySpan.setAttribute('data-testid', 'order-item-qty');
        const unitPriceStr = this._formatCurrency(item.unit_price || item.price, order.currency);
        qtySpan.textContent = `Cantidad: ${item.quantity || 1} × ${unitPriceStr}`;

        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(qtySpan);

        const subtotalSpan = document.createElement('span');
        subtotalSpan.className = 'q-order-detail__item-subtotal';
        subtotalSpan.setAttribute('data-testid', 'order-item-subtotal');
        const itemSubtotal =
          item.subtotal ?? Number(item.quantity || 1) * Number(item.unit_price || item.price || 0);
        subtotalSpan.textContent = this._formatCurrency(itemSubtotal, order.currency);

        itemEl.appendChild(imgDiv);
        itemEl.appendChild(infoDiv);
        itemEl.appendChild(subtotalSpan);
        itemsList.appendChild(itemEl);
      });
    }

    itemsSection.appendChild(itemsList);
    layoutGrid.appendChild(itemsSection);

    // 4B. Sidebar (Summary, Shipping Address, Notes)
    const sidebar = document.createElement('aside');
    sidebar.className = 'q-order-detail__sidebar';

    // Summary Card
    const summaryCard = document.createElement('div');
    summaryCard.className = 'q-order-detail__summary-card';
    summaryCard.setAttribute('data-testid', 'order-summary-card');

    const summaryTitle = document.createElement('h3');
    summaryTitle.className = 'q-order-detail__section-title';
    summaryTitle.textContent = 'Resumen del pedido';
    summaryCard.appendChild(summaryTitle);

    const summaryRows = document.createElement('div');
    summaryRows.className = 'q-order-detail__summary-rows';

    const subtotal = order.subtotal !== undefined ? order.subtotal : order.total || 0;
    const shipping = order.shipping_cost ?? 0;
    const tax = order.tax ?? 0;
    const total = order.total !== undefined ? order.total : subtotal + shipping + tax;

    summaryRows.innerHTML = `
      <div class="q-order-detail__summary-row">
        <span>Subtotal</span>
        <span>${this._formatCurrency(subtotal, order.currency)}</span>
      </div>
      <div class="q-order-detail__summary-row">
        <span>Envío</span>
        <span>${shipping > 0 ? this._formatCurrency(shipping, order.currency) : 'Gratis'}</span>
      </div>
      <div class="q-order-detail__summary-row">
        <span>Impuestos</span>
        <span>${tax > 0 ? this._formatCurrency(tax, order.currency) : '$0.00'}</span>
      </div>
      <div class="q-order-detail__summary-row q-order-detail__summary-row--total">
        <span>Total</span>
        <span data-testid="order-detail-total">${this._formatCurrency(total, order.currency)}</span>
      </div>
    `;
    summaryCard.appendChild(summaryRows);
    sidebar.appendChild(summaryCard);

    // Shipping Address (if available)
    if (order.shipping_address) {
      const shippingCard = document.createElement('div');
      shippingCard.className = 'q-order-detail__info-card';
      shippingCard.setAttribute('data-testid', 'order-shipping-card');

      const shippingTitle = document.createElement('h4');
      shippingTitle.className = 'q-order-detail__info-title';
      shippingTitle.textContent = 'Dirección de entrega';

      const shippingDesc = document.createElement('p');
      shippingDesc.className = 'q-order-detail__info-text';
      shippingDesc.textContent =
        typeof order.shipping_address === 'object'
          ? JSON.stringify(order.shipping_address)
          : String(order.shipping_address);

      shippingCard.appendChild(shippingTitle);
      shippingCard.appendChild(shippingDesc);
      sidebar.appendChild(shippingCard);
    }

    // Buyer Notes (if available)
    if (order.notes) {
      const notesCard = document.createElement('div');
      notesCard.className = 'q-order-detail__info-card';

      const notesTitle = document.createElement('h4');
      notesTitle.className = 'q-order-detail__info-title';
      notesTitle.textContent = 'Notas';

      const notesDesc = document.createElement('p');
      notesDesc.className = 'q-order-detail__info-text';
      notesDesc.textContent = String(order.notes);

      notesCard.appendChild(notesTitle);
      notesCard.appendChild(notesDesc);
      sidebar.appendChild(notesCard);
    }

    layoutGrid.appendChild(sidebar);
    container.appendChild(layoutGrid);

    this.element = container;
    return container;
  }
}
