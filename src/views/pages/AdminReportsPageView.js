import { REPORT_RANGE_OPTIONS } from '../../models/adminReportRange.js';
import { authStore } from '../../store/authStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';
import { AdminReportsViewModel } from '../../viewmodels/pages/AdminReportsViewModel.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const TABS = Object.freeze([
  { id: 'sales', label: 'Ventas' },
  { id: 'users', label: 'Usuarios' },
  { id: 'products', label: 'Catálogo' },
]);

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
function formatCount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0';
  return String(Math.trunc(amount));
}

/**
 * @param {string} period
 * @returns {string}
 */
function shortPeriod(period) {
  if (typeof period !== 'string') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) return period.slice(5);
  if (/^\d{4}-\d{2}$/.test(period)) return period.slice(5);
  return period;
}

export class AdminReportsPageView {
  /**
   * @param {Object} [options]
   * @param {AdminReportsViewModel} [options.viewModel]
   * @param {Function|null} [options.onNavigate]
   */
  constructor({ viewModel = new AdminReportsViewModel(), onNavigate = null } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.element = null;
    this._unsubscribe = null;
  }

  /**
   * @param {HTMLElement} container
   * @returns {HTMLElement}
   */
  mount(container) {
    this.element = this.render();
    container.appendChild(this.element);
    this._unsubscribe = this.viewModel.subscribe(() => this._update());

    if (!authStore.isAuthenticated()) {
      this._renderGate();
      return this.element;
    }

    if (!authStore.isAdmin()) {
      this._renderForbidden();
      return this.element;
    }

    this._update();
    void this.viewModel.load();
    return this.element;
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

  /**
   * @returns {HTMLElement}
   */
  render() {
    if (this.element) return this.element;

    const section = el('section', 'q-reports-page');
    section.setAttribute('aria-label', 'Reportes del marketplace');

    const container = el('div', 'q-section-container');
    const header = el('div', 'q-reports-header');
    const titleGroup = el('div');
    titleGroup.append(
      el('h1', 'q-reports-title', 'Reportes'),
      el(
        'p',
        'q-reports-subtitle',
        'Ventas, usuarios y catálogo. Los pedidos cancelados o reembolsados no entran.'
      )
    );

    const rangeGroup = el('div', 'q-orders-filter');
    const rangeLabel = el('label', 'q-orders-filter__label', 'Período:');
    rangeLabel.htmlFor = 'admin-reports-range';
    const rangeSelect = document.createElement('select');
    rangeSelect.id = 'admin-reports-range';
    rangeSelect.className = 'q-orders-filter__select';
    for (const option of REPORT_RANGE_OPTIONS) {
      const node = document.createElement('option');
      node.value = option.key;
      node.textContent = option.label;
      rangeSelect.appendChild(node);
    }
    rangeSelect.addEventListener('change', () => {
      void this.viewModel.setRange(rangeSelect.value);
    });
    rangeGroup.append(rangeLabel, rangeSelect);

    header.append(titleGroup, rangeGroup);

    const tabs = el('div', 'q-reports-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Tipo de reporte');
    for (const tab of TABS) {
      const button = el('button', 'q-reports-tab', tab.label);
      button.type = 'button';
      button.dataset.tab = tab.id;
      button.setAttribute('role', 'tab');
      button.addEventListener('click', () => {
        void this.viewModel.selectTab(tab.id);
      });
      tabs.appendChild(button);
    }

    const error = el('div', 'q-reports-error');
    error.dataset.role = 'error';
    error.setAttribute('role', 'alert');

    const content = el('div', 'q-reports-panel');
    content.dataset.role = 'content';

    container.append(header, tabs, error, content);
    section.appendChild(container);
    this.element = section;
    return section;
  }

  _update() {
    if (!this.element) return;
    const vm = this.viewModel;

    if (vm.isForbidden) {
      this._renderForbidden();
      return;
    }

    const rangeSelect = this.element.querySelector('#admin-reports-range');
    if (rangeSelect && rangeSelect.value !== vm.rangeKey) {
      rangeSelect.value = vm.rangeKey;
    }

    for (const button of this.element.querySelectorAll('.q-reports-tab')) {
      const selected = button.dataset.tab === vm.tab;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    }

    const error = this.element.querySelector('[data-role="error"]');
    const content = this.element.querySelector('[data-role="content"]');
    if (!error || !content) return;

    error.replaceChildren();
    if (vm.errorMessage && !vm.isForbidden) {
      const alert = el('div', 'q-orders-alert q-orders-alert--forbidden');
      alert.textContent = vm.errorMessage;
      const retry = el('button', 'q-btn q-btn--secondary q-reports-retry', 'Reintentar');
      retry.type = 'button';
      retry.addEventListener('click', () => {
        void vm.load();
      });
      error.append(alert, retry);
    }

    content.replaceChildren();
    const payload = vm[vm.tab];
    if (vm.isLoading && !payload) {
      content.appendChild(el('p', 'q-reports-empty', 'Cargando reportes…'));
      return;
    }
    if (!payload) {
      if (!vm.errorMessage) {
        content.appendChild(el('p', 'q-reports-empty', 'No hay datos para este reporte.'));
      }
      return;
    }

    if (vm.tab === 'users') content.appendChild(this._renderUsers(payload));
    else if (vm.tab === 'products') content.appendChild(this._renderProducts(payload));
    else content.appendChild(this._renderSales(payload, vm.users, vm.usersErrorMessage));
  }

  /**
   * @param {Object} sales
   * @param {Object|null} users
   * @param {string} usersErrorMessage
   * @returns {HTMLElement}
   */
  _renderSales(sales, users, usersErrorMessage = '') {
    const wrap = el('div', 'q-reports-stack');
    const currency = sales.currency || null;
    const kpis = el('div', 'q-reports-kpis');
    const averageTicket =
      Number(sales.total_orders) > 0
        ? Number(sales.total_revenue) / Number(sales.total_orders)
        : null;
    kpis.append(
      this._kpi(
        'Ingresos',
        currency ? formatPrice(sales.total_revenue, currency) : '—',
        currency ? `Moneda ${currency}` : 'Sin ventas'
      ),
      this._kpi('Pedidos', formatCount(sales.total_orders), 'Sin cancelados ni reembolsos'),
      this._kpi(
        'Ticket promedio',
        currency && averageTicket !== null ? formatPrice(averageTicket, currency) : '—',
        'Por pedido'
      ),
      this._kpi('Compradores', users ? formatCount(users.buyer_count) : '—', 'Con el rol buyer'),
      this._kpi('Vendedores', users ? formatCount(users.seller_count) : '—', 'Con el rol seller'),
      this._kpi(
        'Pendientes',
        users ? formatCount(users.pending_seller_applications) : '—',
        'Solicitudes de vendedores'
      )
    );

    if (usersErrorMessage) {
      kpis.appendChild(el('p', 'q-reports-note', usersErrorMessage));
    }

    const others = Array.isArray(sales.revenue_by_currency)
      ? sales.revenue_by_currency.filter((row) => row.currency && row.currency !== sales.currency)
      : [];
    if (others.length) {
      const note = el(
        'p',
        'q-reports-note',
        `Otras monedas: ${others
          .map((row) => {
            const count = Number(row.order_count) || 0;
            const noun = count === 1 ? 'pedido' : 'pedidos';
            return `${formatPrice(row.revenue, row.currency)} (${formatCount(count)} ${noun})`;
          })
          .join(' · ')}`
      );
      kpis.appendChild(note);
    }
    wrap.appendChild(kpis);

    const periods = Array.isArray(sales.period_breakdown) ? sales.period_breakdown : [];
    const hasSales = Number(sales.total_orders) > 0;
    if (!hasSales) {
      wrap.appendChild(el('p', 'q-reports-empty', 'No hay ventas en este periodo.'));
    } else {
      wrap.appendChild(this._renderChart(periods, currency || 'USD'));
    }

    const columns = el('div', 'q-reports-columns');
    columns.append(
      this._table(
        'Productos más vendidos',
        ['Producto', 'Unidades', 'Ingresos'],
        (sales.top_products || []).map((row) => [
          row.title || '—',
          formatCount(row.units_sold),
          formatPrice(row.revenue, currency),
        ]),
        'Nadie compró productos en este periodo.'
      ),
      this._table(
        'Vendedores con más ingresos',
        ['Vendedor', 'Ingresos'],
        (sales.top_sellers || []).map((row) => [
          row.display_name || '—',
          formatPrice(row.revenue, currency),
        ]),
        'No hay vendedores con ventas en este periodo.'
      )
    );
    wrap.appendChild(columns);
    return wrap;
  }

  /**
   * @param {Object} users
   * @returns {HTMLElement}
   */
  _renderUsers(users) {
    const wrap = el('div', 'q-reports-stack');
    const kpis = el('div', 'q-reports-kpis');
    kpis.append(
      this._kpi('Compradores', formatCount(users.buyer_count), 'Con el rol buyer'),
      this._kpi('Vendedores', formatCount(users.seller_count), 'Con el rol seller'),
      this._kpi(
        'Solicitudes pendientes',
        formatCount(users.pending_seller_applications),
        'Cola actual'
      )
    );
    wrap.appendChild(kpis);

    const extra = el('div', 'q-reports-kpis');
    extra.append(
      this._kpi('Usuarios', formatCount(users.total_users), 'Perfiles registrados'),
      this._kpi('Altas del periodo', formatCount(users.new_registrations), 'Cuentas nuevas'),
      this._kpi('Compraron', formatCount(users.active_buyers), 'Con un pedido en el periodo'),
      this._kpi('Vendieron', formatCount(users.active_sellers), 'Con una venta en el periodo')
    );
    wrap.appendChild(extra);
    return wrap;
  }

  /**
   * @param {Object} products
   * @returns {HTMLElement}
   */
  _renderProducts(products) {
    const wrap = el('div', 'q-reports-stack');
    const kpis = el('div', 'q-reports-kpis');
    kpis.append(
      this._kpi('Publicados', formatCount(products.published_products), 'Visibles en el catálogo'),
      this._kpi('Borradores', formatCount(products.draft_products), 'Todavía no publicados'),
      this._kpi(
        'No publicados',
        formatCount(products.unpublished_products),
        'Retirados de la venta'
      )
    );
    wrap.appendChild(kpis);

    const extra = el('div', 'q-reports-kpis');
    extra.append(
      this._kpi('Total', formatCount(products.total_products), 'Sin los eliminados'),
      this._kpi('Archivados', formatCount(products.archived_products), 'Fuera del catálogo'),
      this._kpi('Nuevos en el periodo', formatCount(products.new_listings), 'Creados en las fechas')
    );
    wrap.appendChild(extra);

    const columns = el('div', 'q-reports-columns');
    columns.append(
      this._table(
        'Más vendidos',
        ['Producto', 'Unidades'],
        (products.top_selling_products || []).map((row) => [
          row.title || '—',
          formatCount(row.units_sold),
        ]),
        'Nadie compró productos en este periodo.'
      ),
      this._table(
        'Categorías',
        ['Categoría', 'Productos'],
        (products.top_categories || []).map((row) => [
          row.name || '—',
          formatCount(row.product_count),
        ]),
        'No hay productos con categoría.'
      ),
      this._table(
        'Mejor valorados',
        ['Producto', 'Nota', 'Reseñas'],
        (products.top_rated_products || []).map((row) => [
          row.title || '—',
          Number(row.average_rating || 0).toFixed(1),
          formatCount(row.rating_count),
        ]),
        'Todavía no hay valoraciones.'
      )
    );
    wrap.appendChild(columns);
    return wrap;
  }

  /**
   * @param {string} label
   * @param {string} value
   * @param {string} [hint]
   * @returns {HTMLElement}
   */
  _kpi(label, value, hint) {
    const card = el('article', 'q-reports-kpi');
    card.append(el('p', 'q-reports-kpi__label', label), el('p', 'q-reports-kpi__value', value));
    if (hint) card.appendChild(el('p', 'q-reports-kpi__hint', hint));
    return card;
  }

  /**
   * @param {Array<{ period: string, revenue: number, order_count: number }>} periods
   * @param {string} currency
   * @returns {HTMLElement}
   */
  _renderChart(periods, currency) {
    const panel = el('div', 'q-reports-chart');
    const title = el('h2', 'q-reports-chart__title', 'Ventas por período');
    const max = Math.max(...periods.map((period) => Number(period.revenue) || 0), 0);
    const slot = 36;
    const width = Math.max(periods.length * slot, 280);
    const height = 180;
    const barMax = 110;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('role', 'img');
    svg.setAttribute(
      'aria-label',
      `Ventas por periodo en ${currency}. ${periods.length} periodos.`
    );

    const defs = document.createElementNS(SVG_NS, 'defs');
    const gradient = document.createElementNS(SVG_NS, 'linearGradient');
    gradient.setAttribute('id', 'q-reports-bar');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', '1');
    const stopTop = document.createElementNS(SVG_NS, 'stop');
    stopTop.setAttribute('offset', '0%');
    stopTop.setAttribute('stop-color', 'var(--q-cat-pink)');
    const stopBottom = document.createElementNS(SVG_NS, 'stop');
    stopBottom.setAttribute('offset', '100%');
    stopBottom.setAttribute('stop-color', 'var(--q-cat-amber)');
    gradient.append(stopTop, stopBottom);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    periods.forEach((period, index) => {
      const revenue = Number(period.revenue) || 0;
      const barHeight = max > 0 ? Math.max(2, (revenue / max) * barMax) : 2;
      const x = index * slot + 8;
      const y = 24 + (barMax - barHeight);
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', '20');
      rect.setAttribute('height', String(barHeight));
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', 'url(#q-reports-bar)');
      const tip = document.createElementNS(SVG_NS, 'title');
      tip.textContent = `${period.period}: ${formatPrice(revenue, currency)}, ${formatCount(period.order_count)} pedidos`;
      rect.appendChild(tip);

      const showLabel = periods.length <= 12 || index % 5 === 0 || index === periods.length - 1;
      if (showLabel) {
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('x', String(x + 10));
        label.setAttribute('y', String(height - 8));
        label.setAttribute('text-anchor', 'middle');
        label.textContent = shortPeriod(period.period);
        svg.appendChild(label);
      }
      svg.appendChild(rect);
    });

    panel.append(title, svg);
    return panel;
  }

  /**
   * @param {string} caption
   * @param {string[]} headers
   * @param {string[][]} rows
   * @param {string} emptyText
   * @returns {HTMLElement}
   */
  _table(caption, headers, rows, emptyText) {
    const block = el('section', 'q-reports-table-block');
    block.appendChild(el('h2', 'q-reports-table-block__title', caption));
    if (!rows.length) {
      block.appendChild(el('p', 'q-reports-empty', emptyText));
      return block;
    }

    const wrap = el('div', 'q-reports-table-wrap');
    const table = el('table', 'q-reports-table');
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const header of headers) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = header;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      row.forEach((cell, index) => {
        const td = document.createElement('td');
        td.dataset.label = headers[index] || '';
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.append(thead, tbody);
    wrap.appendChild(table);
    block.appendChild(wrap);
    return block;
  }

  _renderGate() {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();
    const box = el('div', 'q-reports-forbidden');
    box.setAttribute('role', 'alert');
    box.append(
      el('h2', 'q-reports-forbidden__title', 'Inicia sesión'),
      el('p', null, 'Debes iniciar sesión como administrador para ver los reportes.')
    );
    content.appendChild(box);
  }

  _renderForbidden() {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();
    const box = el('div', 'q-reports-forbidden');
    box.setAttribute('role', 'alert');
    box.append(
      el('p', 'q-reports-forbidden__code', '403 Forbidden'),
      el('h2', 'q-reports-forbidden__title', 'Acceso denegado'),
      el('p', null, 'No tienes permisos de administrador para ver los reportes.')
    );
    const homeBtn = el('button', 'q-btn q-btn--primary', 'Volver al inicio');
    homeBtn.type = 'button';
    homeBtn.addEventListener('click', () => {
      if (typeof this.onNavigate === 'function') this.onNavigate('/');
    });
    box.appendChild(homeBtn);
    content.appendChild(box);
  }
}
