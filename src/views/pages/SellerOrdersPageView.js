import { getOrderStatusLabel, ORDER_STATUSES } from '../../models/entities/orderStatus.js';
import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { SellerOrdersViewModel } from '../../viewmodels/pages/SellerOrdersViewModel.js';

/**
 * SC-11 seller order dashboard (`/seller/orders`).
 *
 * Security: order, product and buyer values are user-controlled (a buyer chooses their own
 * `full_name`), so every cell is built with `textContent`. Never interpolate API data into
 * `innerHTML`.
 */
export class SellerOrdersPageView {
  /** @param {{ viewModel?: SellerOrdersViewModel, onNavigate?: Function }} [options] */
  constructor({ viewModel = new SellerOrdersViewModel(), onNavigate = null } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.element = null;
    this._unsubscribe = null;
  }

  mount(container) {
    this.element = this.render();
    container.appendChild(this.element);
    this._unsubscribe = this.viewModel.subscribe(() => this._update());

    // Defense in depth: the route guard in main.js already redirects these cases.
    if (!authStore.isAuthenticated()) {
      this._renderGate('Debes iniciar sesión para ver tus ventas.', true);
      return;
    }
    if (!authStore.isSeller()) {
      this._renderGate('Solo los vendedores pueden acceder a este panel.', false);
      return;
    }

    this.viewModel.loadOrders(1);
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
  }

  render() {
    const section = document.createElement('section');
    section.className = 'q-seller-orders-page';
    section.setAttribute('aria-label', 'Panel de pedidos del vendedor');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const header = document.createElement('div');
    header.className = 'q-seller-orders-page__header';

    const title = document.createElement('h1');
    title.className = 'q-seller-orders-page__title';
    title.textContent = 'Mis ventas';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-seller-orders-page__subtitle';
    subtitle.textContent = 'Pedidos que incluyen tus productos y control de estado';

    header.appendChild(title);
    header.appendChild(subtitle);

    const filterContainer = document.createElement('div');
    filterContainer.className = 'q-orders-filter';
    const filterLabel = document.createElement('label');
    filterLabel.htmlFor = 'seller-order-status-filter';
    filterLabel.className = 'q-orders-filter__label';
    filterLabel.textContent = 'Estado:';
    const filterSelect = document.createElement('select');
    filterSelect.id = 'seller-order-status-filter';
    filterSelect.className = 'q-orders-filter__select';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Todos';
    filterSelect.appendChild(allOption);
    for (const status of ORDER_STATUSES) {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = getOrderStatusLabel(status);
      filterSelect.appendChild(option);
    }
    filterSelect.addEventListener('change', () => {
      this.viewModel.setStatusFilter(filterSelect.value);
    });
    filterContainer.appendChild(filterLabel);
    filterContainer.appendChild(filterSelect);
    header.appendChild(filterContainer);

    const kpis = document.createElement('div');
    kpis.className = 'q-seller-orders-kpis';
    kpis.dataset.role = 'kpis';

    // Live regions exist from the start so screen readers announce later changes.
    const notices = document.createElement('div');
    notices.dataset.role = 'notices';
    const notice = document.createElement('div');
    notice.dataset.role = 'notice';
    notice.setAttribute('aria-live', 'polite');
    notice.setAttribute('aria-atomic', 'true');
    const error = document.createElement('div');
    error.dataset.role = 'error';
    error.setAttribute('role', 'alert');
    notices.appendChild(notice);
    notices.appendChild(error);

    const content = document.createElement('div');
    content.dataset.role = 'content';
    content.className = 'q-seller-orders-content';

    container.appendChild(header);
    container.appendChild(kpis);
    container.appendChild(notices);
    container.appendChild(content);
    section.appendChild(container);
    return section;
  }

  _update() {
    if (!this.element) return;
    const vm = this.viewModel;
    const notice = this.element.querySelector('[data-role="notice"]');
    const error = this.element.querySelector('[data-role="error"]');
    const content = this.element.querySelector('[data-role="content"]');
    const kpis = this.element.querySelector('[data-role="kpis"]');
    if (!notice || !error || !content || !kpis) return;

    notice.replaceChildren();
    if (vm.noticeMessage) {
      const ok = document.createElement('div');
      ok.className = 'q-orders-alert q-orders-alert--success';
      ok.textContent = vm.noticeMessage;
      notice.appendChild(ok);
    }
    error.replaceChildren();
    if (vm.errorMessage) {
      const err = document.createElement('div');
      err.className = 'q-orders-alert q-orders-alert--forbidden';
      err.textContent = vm.errorMessage;
      error.appendChild(err);
    }

    this._renderKpis(kpis);

    content.replaceChildren();
    if (!vm.orders.length) {
      if (vm.isLoading) {
        content.appendChild(this._message('Cargando ventas…'));
      } else if (!vm.errorMessage) {
        content.appendChild(this._emptyState());
      }
      return;
    }

    // Keep the previous rows readable (dimmed) while a new page or filter loads.
    content.appendChild(this._buildTable());

    if (vm.meta.total_pages > 1) {
      content.appendChild(this._buildPager());
    }
  }

  _renderKpis(kpisEl) {
    const kpi = this.viewModel.getKpis();
    const entries = [
      ['Por confirmar', String(kpi.toConfirm)],
      ['Por enviar', String(kpi.toShip)],
      ['Enviados', String(kpi.shipped)],
      ['Ingresos (página)', kpi.revenue.toFixed(2)],
    ];
    kpisEl.replaceChildren(
      ...entries.map(([label, value]) => {
        const card = document.createElement('div');
        card.className = 'q-seller-orders-kpi';
        const labelEl = document.createElement('span');
        labelEl.className = 'q-seller-orders-kpi__label';
        labelEl.textContent = label;
        const valueEl = document.createElement('strong');
        valueEl.textContent = value;
        card.append(labelEl, valueEl);
        return card;
      })
    );
  }

  _message(text) {
    const p = document.createElement('p');
    p.className = 'q-seller-orders-empty';
    p.textContent = text;
    return p;
  }

  _emptyState() {
    const box = document.createElement('div');
    box.className = 'q-seller-orders-empty';
    const p = document.createElement('p');
    p.textContent = 'Aún no tienes ventas';
    const link = document.createElement('a');
    link.href = '/products';
    link.dataset.route = '';
    link.textContent = 'Ver catálogo';
    box.append(p, link);
    return box;
  }

  _buildTable() {
    const vm = this.viewModel;
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-orders-table-wrap';
    if (vm.isLoading) {
      wrap.classList.add('is-loading');
      wrap.setAttribute('aria-busy', 'true');
    }

    const table = document.createElement('table');
    table.className = 'q-seller-orders-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of [
      'Pedido',
      'Fecha',
      'Comprador',
      'Productos',
      'Ingreso',
      'Estado',
      'Actualizar',
    ]) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    for (const order of vm.orders) {
      tbody.appendChild(this._buildRow(order));
    }

    table.append(thead, tbody);
    wrap.appendChild(table);
    return wrap;
  }

  _buildRow(order) {
    const vm = this.viewModel;
    const tr = document.createElement('tr');
    tr.dataset.orderId = order.id;
    if (vm.isOrderUpdating(order.id)) tr.setAttribute('aria-busy', 'true');

    const items = Array.isArray(order.items) ? order.items : [];
    const productsLabel = items
      .map((item) => `${item.product_name || 'Producto'} ×${item.quantity}`)
      .join(', ');
    const revenue = SellerOrdersViewModel.sellerRevenue(order).toFixed(2);
    const created = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';

    tr.append(
      this._cell('Pedido', order.order_number || order.id),
      this._cell('Fecha', created),
      this._cell('Comprador', vm.getBuyerLabel(order)),
      this._cell('Productos', productsLabel || '—'),
      this._cell('Ingreso', `${revenue} ${order.currency || ''}`.trim()),
      this._cell('Estado', this._statusBadge(order.status)),
      this._cell('Actualizar', this._actionControl(order))
    );
    return tr;
  }

  /** @param {string} label column name (shown on mobile) @param {string|Node} content */
  _cell(label, content) {
    const td = document.createElement('td');
    td.dataset.label = label;
    if (content instanceof Node) {
      td.appendChild(content);
    } else {
      td.textContent = String(content ?? '');
    }
    return td;
  }

  _statusBadge(status) {
    const badge = document.createElement('span');
    const known = ORDER_STATUSES.includes(status) ? status : 'unknown';
    badge.className = `q-order-status q-order-status--${known}`;
    badge.textContent = getOrderStatusLabel(status);
    return badge;
  }

  /** Status selector, or an explained dash when the order is in a terminal state. */
  _actionControl(order) {
    const vm = this.viewModel;
    const next = vm.getNextStatuses(order);

    if (!next.length) {
      const final = document.createElement('span');
      final.title = 'Estado final: no se puede cambiar';
      const dash = document.createElement('span');
      dash.setAttribute('aria-hidden', 'true');
      dash.textContent = '—';
      const hint = document.createElement('span');
      hint.className = 'q-sr-only';
      hint.textContent = 'Estado final: no se puede cambiar';
      final.append(dash, hint);
      return final;
    }

    const updating = vm.isOrderUpdating(order.id);
    const wrapper = document.createElement('span');
    wrapper.className = 'q-seller-orders-action';

    const select = document.createElement('select');
    select.className = 'q-orders-filter__select';
    select.setAttribute(
      'aria-label',
      `Cambiar estado del pedido ${order.order_number || order.id}`
    );
    select.disabled = updating;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Cambiar…';
    select.appendChild(placeholder);
    for (const status of next) {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = getOrderStatusLabel(status);
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      if (!select.value) return;
      this.viewModel.updateStatus(order.id, select.value);
    });
    wrapper.appendChild(select);

    if (updating) {
      const indicator = document.createElement('span');
      indicator.className = 'q-seller-orders-updating';
      indicator.textContent = 'Actualizando…';
      wrapper.appendChild(indicator);
    }
    return wrapper;
  }

  _buildPager() {
    const vm = this.viewModel;
    // Same markup/classes as the buyer's order list so both pages share one pager style.
    const pager = document.createElement('nav');
    pager.className = 'q-orders-page__pagination';
    pager.setAttribute('aria-label', 'Paginación de ventas');

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'q-btn q-btn--neutral q-btn--sm q-pagination-btn q-pagination-prev';
    prev.textContent = 'Anterior';
    prev.disabled = vm.meta.page <= 1 || vm.isLoading;
    prev.addEventListener('click', () => this.viewModel.loadOrders(vm.meta.page - 1));

    const info = document.createElement('span');
    info.className = 'q-pagination-info';
    info.textContent = `Página ${vm.meta.page} de ${vm.meta.total_pages}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'q-btn q-btn--neutral q-btn--sm q-pagination-btn q-pagination-next';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = vm.meta.page >= vm.meta.total_pages || vm.isLoading;
    nextBtn.addEventListener('click', () => this.viewModel.loadOrders(vm.meta.page + 1));

    pager.append(prev, info, nextBtn);
    return pager;
  }

  _renderGate(message, offerLogin) {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();
    const box = document.createElement('div');
    box.className = 'q-seller-orders-empty';
    const p = document.createElement('p');
    p.textContent = message;
    box.appendChild(p);
    if (offerLogin) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-btn q-btn--primary';
      btn.textContent = 'Iniciar sesión';
      btn.addEventListener('click', () => {
        authRedirectStore.setReturnTo('/seller/orders');
        if (typeof this.onNavigate === 'function') this.onNavigate('/login');
      });
      box.appendChild(btn);
    }
    content.appendChild(box);
  }
}
