import { OrderConfirmationViewModel } from '../../viewmodels/pages/OrderConfirmationViewModel.js';

const CHECK_ICON = `
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

const STEP_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

const ARROW_ICON = `
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
`;

const TIMELINE = [
  { status: 'pending', label: 'Pendiente' },
  { status: 'confirmed', label: 'Confirmado' },
  { status: 'shipped', label: 'Enviado' },
  { status: 'delivered', label: 'Entregado' },
];

export class OrderConfirmationView {
  constructor({
    orderId,
    viewModel = new OrderConfirmationViewModel(),
    onNavigate = null,
    onLogin = null,
  } = {}) {
    this.orderId = orderId;
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.onLogin = onLogin;
    this.element = null;
    this._unsubscribe = null;
  }

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-order-confirmation';
    section.setAttribute('aria-label', 'Confirmación de pedido');
    this.element = section;
    this._renderContent();
    return section;
  }

  mount(container) {
    const el = this.render();
    container.appendChild(el);

    this._unsubscribe = this.viewModel.subscribe(() => this._renderContent());
    void this.viewModel.load(this.orderId);

    return el;
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.viewModel.destroy();
    this.element?.remove();
    this.element = null;
  }

  _renderContent() {
    if (!this.element) return;
    const vm = this.viewModel;
    this.element.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'q-section-container';

    if (vm.requiresAuth) {
      container.appendChild(
        this._renderNotice({
          title: 'Inicia sesión para ver tu pedido',
          message: 'Necesitas iniciar sesión para ver los detalles de tu compra.',
          action: { label: 'Iniciar sesión', onClick: () => this.onLogin?.() },
        })
      );
    } else if (vm.isLoading || (!vm.order && !vm.errorMessage)) {
      container.appendChild(this._renderNotice({ title: 'Cargando tu pedido…' }));
    } else if (vm.errorMessage) {
      container.appendChild(
        this._renderNotice({
          title: 'No pudimos mostrar tu pedido',
          message: vm.errorMessage,
          action: { label: 'Ver mis pedidos', onClick: () => this.onNavigate?.('/orders') },
        })
      );
    } else {
      container.append(
        this._renderHeader(),
        this._renderCard(vm.order),
        this._renderReceipt(vm.order)
      );
    }

    this.element.appendChild(container);
  }

  _renderHeader() {
    const name = this.viewModel.firstName;

    const header = document.createElement('div');
    header.className = 'q-checkout__header';

    const heading = document.createElement('div');

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-checkout__eyebrow';
    eyebrow.textContent = 'Pedido confirmado';

    const title = document.createElement('h1');
    title.className = 'q-checkout__title';
    title.textContent = name ? `¡Gracias por tu compra, ${name}!` : '¡Gracias por tu compra!';

    heading.append(eyebrow, title);

    const back = document.createElement('a');
    back.className = 'q-checkout__back';
    back.href = '/';
    back.dataset.route = '';
    back.innerHTML = `<span>Volver al inicio</span>${ARROW_ICON}`;

    header.append(heading, back);
    return header;
  }

  _renderCard(order) {
    const card = document.createElement('div');
    card.className = 'q-order-confirmation__card q-glass-panel';
    card.dataset.testid = 'order-confirmation';

    const icon = document.createElement('div');
    icon.className = 'q-order-confirmation__icon';
    icon.innerHTML = CHECK_ICON;

    const title = document.createElement('h2');
    title.className = 'q-order-confirmation__title';
    title.textContent = 'Tu pedido está confirmado';

    const number = document.createElement('p');
    number.className = 'q-order-confirmation__number';
    number.dataset.testid = 'order-confirmation-number';
    number.textContent = `Número de pedido: #${order.order_number}`;

    const cta = document.createElement('a');
    cta.className = 'q-btn q-btn--primary';
    cta.href = '/orders';
    cta.dataset.route = '';
    cta.textContent = 'Ver mis pedidos';

    card.append(icon, title, number, this._renderTimeline(order.status), cta);
    return card;
  }

  _renderTimeline(status) {
    if (status === 'cancelled') {
      const cancelled = document.createElement('p');
      cancelled.className = 'q-order-confirmation__cancelled';
      cancelled.textContent = 'Cancelado';
      return cancelled;
    }

    const current = Math.max(
      0,
      TIMELINE.findIndex((step) => step.status === status)
    );

    const list = document.createElement('ol');
    list.className = 'q-order-confirmation__timeline';
    list.dataset.testid = 'order-timeline';

    TIMELINE.forEach((step, index) => {
      const item = document.createElement('li');
      const reached = index <= current;
      item.className = `q-order-confirmation__step${reached ? ' is-reached' : ''}`;
      if (index === current) item.setAttribute('aria-current', 'step');

      if (reached) {
        const mark = document.createElement('span');
        mark.className = 'q-order-confirmation__step-icon';
        mark.innerHTML = STEP_ICON;
        item.appendChild(mark);
      }
      const label = document.createElement('span');
      label.textContent = step.label;
      item.appendChild(label);
      list.appendChild(item);
    });
    return list;
  }

  // Not in the mockup: a short receipt so the buyer can check what was ordered.
  _renderReceipt(order) {
    const vm = this.viewModel;

    const section = document.createElement('section');
    section.className = 'q-order-confirmation__receipt q-glass-panel';
    section.setAttribute('aria-labelledby', 'q-receipt-title');

    const title = document.createElement('h2');
    title.id = 'q-receipt-title';
    title.className = 'q-checkout__panel-title';
    title.textContent = 'Resumen del pedido';

    const list = document.createElement('ul');
    list.className = 'q-checkout__items q-order-confirmation__items';
    (order.items ?? []).forEach((item) => {
      const li = document.createElement('li');
      li.className = 'q-checkout__item q-order-confirmation__item';
      li.dataset.testid = 'receipt-item';

      const name = document.createElement('span');
      name.className = 'q-checkout__item-name';
      name.textContent = item.product_name;

      const quantity = document.createElement('span');
      quantity.className = 'q-checkout__item-qty';
      quantity.textContent = `× ${item.quantity}`;

      const subtotal = document.createElement('span');
      subtotal.className = 'q-checkout__item-subtotal';
      subtotal.textContent = vm.formatAmount(item.subtotal);

      li.append(name, quantity, subtotal);
      list.appendChild(li);
    });

    const rows = document.createElement('div');
    rows.className = 'q-checkout__rows';
    rows.append(
      this._row('Subtotal', vm.formatAmount(order.subtotal)),
      this._row('Envío estándar', vm.formatAmount(order.shipping_cost))
    );
    if (Number(order.tax) > 0) rows.appendChild(this._row('Impuestos', vm.formatAmount(order.tax)));
    const total = this._row('Total', vm.formatAmount(order.total), 'total');
    total.classList.add('q-checkout__row--total');
    rows.appendChild(total);

    section.append(title, list, rows);

    const address = this._renderAddress(order.shipping_address);
    if (address) section.appendChild(address);
    return section;
  }

  _renderAddress(address) {
    if (!address) return null;

    const block = document.createElement('div');
    block.className = 'q-order-confirmation__address';
    block.dataset.testid = 'receipt-address';

    const heading = document.createElement('h3');
    heading.className = 'q-order-confirmation__address-title';
    heading.textContent = 'Enviamos a';

    const lines = [
      address.full_name,
      address.phone,
      address.street,
      [address.city, address.state].filter(Boolean).join(', '),
      address.country,
    ].filter(Boolean);

    block.appendChild(heading);
    lines.forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      block.appendChild(p);
    });
    return block;
  }

  _row(label, value, testId) {
    const row = document.createElement('div');
    row.className = 'q-checkout__row';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.className = 'q-checkout__row-value';
    if (testId) valueEl.dataset.testid = `receipt-${testId}`;
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    return row;
  }

  _renderNotice({ title, message, action }) {
    const box = document.createElement('div');
    box.className = 'q-cart__empty';
    box.setAttribute('role', 'status');

    const heading = document.createElement('h1');
    heading.className = 'q-cart__empty-title';
    heading.textContent = title;
    box.appendChild(heading);

    if (message) {
      const text = document.createElement('p');
      text.className = 'q-cart__empty-message';
      text.textContent = message;
      box.appendChild(text);
    }

    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'q-btn q-btn--primary q-btn--block';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      box.appendChild(button);
    }
    return box;
  }
}
