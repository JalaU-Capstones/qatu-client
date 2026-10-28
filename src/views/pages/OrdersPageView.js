import { authStore } from '../../store/authStore.js';
import { OrdersViewModel } from '../../viewmodels/pages/OrdersViewModel.js';
import { OrderListComponent } from '../components/OrderListComponent.js';

/**
 * Orders page view mounted inside <main class="q-main">.
 * Manages rendering of orders, empty states, pagination controls, and 403 Forbidden errors.
 */
export class OrdersPageView {
  /**
   * @param {Object} [options]
   * @param {OrdersViewModel} [options.viewModel]
   * @param {Function} [options.onNavigate]
   */
  constructor({ viewModel = new OrdersViewModel(), onNavigate = null } = {}) {
    this.viewModel = viewModel;
    this.onNavigate = onNavigate;
    this.element = null;
    this._orderList = new OrderListComponent();
    this._unsubscribe = null;
  }

  /**
   * Mounts the view into the given container.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.element = this.render();
    container.appendChild(this.element);

    this._unsubscribe = this.viewModel.subscribe(() => {
      this._update();
    });

    // Check authentication
    if (!authStore.isAuthenticated()) {
      this._renderUnauthenticated();
      return;
    }

    this.viewModel.loadOrders(1);
  }

  /**
   * Destroys view and removes listeners.
   */
  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this.element && this.element.parentElement) {
      this.element.remove();
    }
    this.element = null;
  }

  /**
   * Renders the base page structure.
   * @returns {HTMLElement}
   */
  render() {
    const section = document.createElement('section');
    section.className = 'q-orders-page';
    section.setAttribute('aria-label', 'Historial de compras');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    // Header
    const header = document.createElement('div');
    header.className = 'q-orders-page__header';

    const title = document.createElement('h1');
    title.className = 'q-orders-page__title';
    title.textContent = 'Mis Órdenes';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-orders-page__subtitle';
    subtitle.textContent = 'Revisa el historial y estado de todas tus compras';

    header.appendChild(title);
    header.appendChild(subtitle);
    container.appendChild(header);

    // Alerts area (for 403 Forbidden and general errors)
    const alertArea = document.createElement('div');
    alertArea.className = 'q-orders-page__alerts';
    container.appendChild(alertArea);

    // Content container
    const content = document.createElement('div');
    content.className = 'q-orders-page__content';
    container.appendChild(content);

    // Pagination container
    const pagination = document.createElement('nav');
    pagination.className = 'q-orders-page__pagination';
    pagination.setAttribute('aria-label', 'Paginación de órdenes');
    container.appendChild(pagination);

    section.appendChild(container);
    return section;
  }

  /**
   * Renders when user is not authenticated.
   * @private
   */
  _renderUnauthenticated() {
    if (!this.element) return;
    const content = this.element.querySelector('.q-orders-page__content');
    if (!content) return;

    content.innerHTML = `
      <div class="q-orders-empty q-orders-auth-required" data-testid="orders-unauthenticated">
        <h3 class="q-orders-empty-title">Inicia sesión</h3>
        <p class="q-orders-empty-subtitle">Debes iniciar sesión como comprador para ver tu historial de órdenes.</p>
        <a href="/login" class="q-button q-button--primary" data-route>Iniciar sesión</a>
      </div>
    `;

    const loginLink = content.querySelector('a[data-route]');
    if (loginLink && this.onNavigate) {
      loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.onNavigate('/login');
      });
    }
  }

  /**
   * Updates page contents based on viewModel state.
   * @private
   */
  _update() {
    if (!this.element) return;

    const alertArea = this.element.querySelector('.q-orders-page__alerts');
    const content = this.element.querySelector('.q-orders-page__content');
    const pagination = this.element.querySelector('.q-orders-page__pagination');

    if (!alertArea || !content || !pagination) return;

    // 1. Alerts & Error handling
    alertArea.innerHTML = '';
    if (this.viewModel.forbiddenError) {
      const forbiddenBox = document.createElement('div');
      forbiddenBox.className = 'q-orders-alert q-orders-alert--forbidden';
      forbiddenBox.setAttribute('data-testid', 'forbidden-alert');
      forbiddenBox.setAttribute('role', 'alert');
      forbiddenBox.innerHTML = `
        <strong>403 Forbidden:</strong> ${this.viewModel.errorMessage || 'No tienes permiso para acceder a esta orden.'}
      `;
      alertArea.appendChild(forbiddenBox);
    } else if (this.viewModel.errorMessage) {
      const errorBox = document.createElement('div');
      errorBox.className = 'q-orders-alert q-orders-alert--error';
      errorBox.setAttribute('role', 'alert');
      errorBox.textContent = this.viewModel.errorMessage;
      alertArea.appendChild(errorBox);
    }

    // 2. Loading state
    if (this.viewModel.isLoading) {
      content.innerHTML = `
        <div class="q-orders-loading" data-testid="orders-loading">
          <div class="q-spinner"></div>
          <p>Cargando órdenes...</p>
        </div>
      `;
      pagination.innerHTML = '';
      return;
    }

    // 3. Render Order List Component
    content.innerHTML = '';
    this._orderList.setOrders(this.viewModel.orders);
    content.appendChild(this._orderList.render());

    // 4. Render Pagination Controls
    pagination.innerHTML = '';
    const { page, total_pages: totalPages } = this.viewModel.meta;
    if (totalPages > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'q-pagination-btn q-pagination-prev';
      prevBtn.textContent = 'Anterior';
      prevBtn.disabled = page <= 1;
      prevBtn.addEventListener('click', () => this.viewModel.prevPage());

      const infoSpan = document.createElement('span');
      infoSpan.className = 'q-pagination-info';
      infoSpan.textContent = `Página ${page} de ${totalPages}`;

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'q-pagination-btn q-pagination-next';
      nextBtn.textContent = 'Siguiente';
      nextBtn.disabled = page >= totalPages;
      nextBtn.addEventListener('click', () => this.viewModel.nextPage());

      pagination.appendChild(prevBtn);
      pagination.appendChild(infoSpan);
      pagination.appendChild(nextBtn);
    }
  }
}

