import { getOrderStatusLabel, ORDER_STATUSES } from '../../models/entities/orderStatus.js';
import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { SellerOrdersViewModel } from '../../viewmodels/pages/SellerOrdersViewModel.js';

/** SC-11 seller order dashboard (`/seller/orders`). */
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
    filterSelect.innerHTML = `<option value="">Todos</option>${ORDER_STATUSES.map(
      (s) => `<option value="${s}">${getOrderStatusLabel(s)}</option>`
    ).join('')}`;
    filterSelect.addEventListener('change', () => {
      this.viewModel.setStatusFilter(filterSelect.value);
    });
    filterContainer.appendChild(filterLabel);
    filterContainer.appendChild(filterSelect);
    header.appendChild(filterContainer);

    const kpis = document.createElement('div');
    kpis.className = 'q-seller-orders-kpis';
    kpis.dataset.role = 'kpis';

    const notices = document.createElement('div');
    notices.dataset.role = 'notices';

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
    const notices = this.element.querySelector('[data-role="notices"]');
    const content = this.element.querySelector('[data-role="content"]');
    const kpis = this.element.querySelector('[data-role="kpis"]');
    if (!notices || !content || !kpis) return;

    notices.innerHTML = '';
    if (vm.noticeMessage) {
      const ok = document.createElement('div');
      ok.className = 'q-orders-alert q-orders-alert--success';
      ok.textContent = vm.noticeMessage;
      notices.appendChild(ok);
    }
    if (vm.errorMessage) {
      const err = document.createElement('div');
      err.className = 'q-orders-alert q-orders-alert--forbidden';
      err.textContent = vm.errorMessage;
      notices.appendChild(err);
    }

    const kpi = vm.getKpis();
    kpis.innerHTML = `
      <div class="q-seller-orders-kpi"><span class="q-seller-orders-kpi__label">Por confirmar</span><strong>${kpi.toConfirm}</strong></div>
      <div class="q-seller-orders-kpi"><span class="q-seller-orders-kpi__label">Por enviar</span><strong>${kpi.toShip}</strong></div>
      <div class="q-seller-orders-kpi"><span class="q-seller-orders-kpi__label">Enviados</span><strong>${kpi.shipped}</strong></div>
      <div class="q-seller-orders-kpi"><span class="q-seller-orders-kpi__label">Ingresos (página)</span><strong>${kpi.revenue.toFixed(2)}</strong></div>
    `;

    content.innerHTML = '';
    if (vm.isLoading) {
      content.innerHTML = '<p class="q-seller-orders-empty">Cargando ventas…</p>';
      return;
    }

    if (!vm.orders.length) {
      content.innerHTML = `
        <div class="q-seller-orders-empty">
          <p>Aún no tienes ventas</p>
          <a href="/products" data-route="">Ver catálogo</a>
        </div>`;
      return;
    }

    const tableWrap = document.createElement('div');
    tableWrap.className = 'q-seller-orders-table-wrap';
    const table = document.createElement('table');
    table.className = 'q-seller-orders-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pedido</th>
          <th>Fecha</th>
          <th>Comprador</th>
          <th>Productos</th>
          <th>Ingreso</th>
          <th>Estado</th>
          <th>Actualizar</th>
        </tr>
      </thead>
      <tbody></tbody>`;
    const tbody = table.querySelector('tbody');

    for (const order of vm.orders) {
      const tr = document.createElement('tr');
      const items = Array.isArray(order.items) ? order.items : [];
      const productsLabel = items
        .map((i) => `${i.product_name || 'Producto'} ×${i.quantity}`)
        .join(', ');
      const next = vm.getNextStatuses(order);
      const revenue = SellerOrdersViewModel.sellerRevenue(order).toFixed(2);
      const created = order.created_at ? new Date(order.created_at).toLocaleDateString() : '—';

      tr.innerHTML = `
        <td data-label="Pedido">${order.order_number || order.id}</td>
        <td data-label="Fecha">${created}</td>
        <td data-label="Comprador">${vm.getBuyerLabel(order)}</td>
        <td data-label="Productos">${productsLabel || '—'}</td>
        <td data-label="Ingreso">${revenue} ${order.currency || ''}</td>
        <td data-label="Estado"><span class="q-order-status q-order-status--${order.status}">${getOrderStatusLabel(order.status)}</span></td>
        <td data-label="Actualizar"></td>`;

      const actionCell = tr.querySelector('td:last-child');
      if (!next.length) {
        actionCell.textContent = '—';
      } else {
        const select = document.createElement('select');
        select.className = 'q-orders-filter__select';
        select.disabled = vm.isUpdating;
        select.innerHTML = `<option value="">Cambiar…</option>${next
          .map((s) => `<option value="${s}">${getOrderStatusLabel(s)}</option>`)
          .join('')}`;
        select.addEventListener('change', () => {
          if (!select.value) return;
          this.viewModel.updateStatus(order.id, select.value);
        });
        actionCell.appendChild(select);
      }

      tbody.appendChild(tr);
    }

    tableWrap.appendChild(table);
    content.appendChild(tableWrap);

    if (vm.meta.total_pages > 1) {
      const pager = document.createElement('div');
      pager.className = 'q-orders-pagination';
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.textContent = 'Anterior';
      prev.disabled = vm.meta.page <= 1 || vm.isLoading;
      prev.addEventListener('click', () => this.viewModel.loadOrders(vm.meta.page - 1));
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.textContent = 'Siguiente';
      nextBtn.disabled = vm.meta.page >= vm.meta.total_pages || vm.isLoading;
      nextBtn.addEventListener('click', () => this.viewModel.loadOrders(vm.meta.page + 1));
      const info = document.createElement('span');
      info.textContent = `Página ${vm.meta.page} de ${vm.meta.total_pages}`;
      pager.appendChild(prev);
      pager.appendChild(info);
      pager.appendChild(nextBtn);
      content.appendChild(pager);
    }
  }

  _renderGate(message, offerLogin) {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.innerHTML = '';
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
