import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { AdminSellerApplicationsViewModel } from '../../viewmodels/pages/AdminSellerApplicationsViewModel.js';

const STATUS_LABELS = Object.freeze({
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
});

export class AdminSellerApplicationsPageView {
  /**
   * @param {Object} [options]
   * @param {AdminSellerApplicationsViewModel} [options.viewModel]
   * @param {Function|null} [options.onNavigate]
   */
  constructor({ viewModel = new AdminSellerApplicationsViewModel(), onNavigate = null } = {}) {
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
      this._renderGate('Debes iniciar sesión como administrador para acceder a este panel.', true);
      return this.element;
    }

    if (!authStore.isAdmin()) {
      this._renderForbidden();
      return this.element;
    }

    void this.viewModel.loadApplications(1);
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

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-admin-applications-page';
    section.setAttribute('aria-label', 'Administración de solicitudes de vendedores');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const header = document.createElement('div');
    header.className = 'q-admin-applications-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'q-admin-applications-heading';
    const title = document.createElement('h1');
    title.className = 'q-admin-applications-title';
    title.textContent = 'Solicitudes de vendedores';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-admin-applications-subtitle';
    subtitle.textContent = "Revisa, aprueba o rechaza las postulaciones para vender en Q'atu";
    titleGroup.append(title, subtitle);

    const filterGroup = document.createElement('div');
    filterGroup.className = 'q-orders-filter';

    const filterLabel = document.createElement('label');
    filterLabel.htmlFor = 'admin-seller-app-status-filter';
    filterLabel.className = 'q-orders-filter__label';
    filterLabel.textContent = 'Estado:';

    const filterSelect = document.createElement('select');
    filterSelect.id = 'admin-seller-app-status-filter';
    filterSelect.className = 'q-orders-filter__select';

    const options = [
      ['', 'Todos'],
      ['pending', 'Pendientes'],
      ['approved', 'Aprobadas'],
      ['rejected', 'Rechazadas'],
    ];
    for (const [value, label] of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      filterSelect.appendChild(opt);
    }

    filterSelect.addEventListener('change', () => {
      void this.viewModel.setStatusFilter(filterSelect.value);
    });

    filterGroup.append(filterLabel, filterSelect);
    header.append(titleGroup, filterGroup);

    const notices = document.createElement('div');
    notices.dataset.role = 'notices';

    const notice = document.createElement('div');
    notice.dataset.role = 'notice';
    notice.setAttribute('aria-live', 'polite');

    const error = document.createElement('div');
    error.dataset.role = 'error';
    error.setAttribute('role', 'alert');

    notices.append(notice, error);

    const content = document.createElement('div');
    content.dataset.role = 'content';
    content.className = 'q-admin-applications-content';

    container.append(header, notices, content);
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

    const notice = this.element.querySelector('[data-role="notice"]');
    const error = this.element.querySelector('[data-role="error"]');
    const content = this.element.querySelector('[data-role="content"]');
    if (!notice || !error || !content) return;

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

    content.replaceChildren();
    if (!vm.applications.length) {
      const empty = document.createElement('p');
      empty.className = 'q-admin-applications-empty';
      empty.textContent = vm.isLoading
        ? 'Cargando solicitudes…'
        : 'No hay solicitudes de vendedores para mostrar.';
      content.appendChild(empty);
      return;
    }

    content.appendChild(this._buildTable());

    if (vm.meta.totalPages > 1) {
      content.appendChild(this._buildPager());
    }
  }

  _buildTable() {
    const vm = this.viewModel;
    const wrap = document.createElement('div');
    wrap.className = 'q-admin-applications-table-wrap';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Solicitudes de vendedores');
    wrap.tabIndex = 0;
    if (vm.isLoading) {
      wrap.classList.add('is-loading');
      wrap.setAttribute('aria-busy', 'true');
    }

    const table = document.createElement('table');
    table.className = 'q-admin-applications-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Negocio', 'Descripción', 'Contacto', 'Fecha', 'Estado', 'Acciones']) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    for (const application of vm.applications) {
      tbody.appendChild(this._buildRow(application));
    }

    table.append(thead, tbody);
    wrap.appendChild(table);
    return wrap;
  }

  _buildRow(application) {
    const vm = this.viewModel;
    const tr = document.createElement('tr');
    tr.dataset.applicationId = application.id;
    if (vm.isReviewing(application.id)) {
      tr.setAttribute('aria-busy', 'true');
    }

    const contactParts = [application.contact_email, application.contact_phone].filter(Boolean);
    const contactLabel = contactParts.length ? contactParts.join(' · ') : '—';
    const createdLabel = application.created_at
      ? new Date(application.created_at).toLocaleDateString()
      : '—';

    tr.append(
      this._cell('Negocio', application.business_name || '—'),
      this._cell('Descripción', application.business_description || '—'),
      this._cell('Contacto', contactLabel),
      this._cell('Fecha', createdLabel),
      this._cell('Estado', this._statusCell(application)),
      this._cell('Acciones', this._actionsCell(application))
    );

    return tr;
  }

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

  _statusCell(application) {
    const wrap = document.createElement('div');
    wrap.className = 'q-admin-app-status-wrap';

    const badge = document.createElement('span');
    const status = application.status || 'pending';
    badge.className = `q-seller-app-badge q-seller-app-badge--${status}`;
    badge.textContent = STATUS_LABELS[status] || status;
    wrap.appendChild(badge);

    if (status === 'rejected' && application.rejection_reason) {
      const reason = document.createElement('p');
      reason.className = 'q-admin-app-rejection-note';
      reason.textContent = `Motivo: ${application.rejection_reason}`;
      wrap.appendChild(reason);
    }

    return wrap;
  }

  _actionsCell(application) {
    const vm = this.viewModel;
    if (application.status !== 'pending') {
      const done = document.createElement('span');
      done.className = 'q-admin-app-reviewed';
      done.textContent = 'Revisada';
      return done;
    }

    const busy = vm.isReviewing(application.id);
    const container = document.createElement('div');
    container.className = 'q-admin-app-actions';

    if (vm.rejectingId === application.id) {
      const rejectForm = document.createElement('div');
      rejectForm.className = 'q-admin-app-reject-box';

      const label = document.createElement('label');
      label.className = 'q-admin-app-reject-label';
      label.htmlFor = `reject-reason-${application.id}`;
      label.textContent = 'Motivo de rechazo *';

      const textarea = document.createElement('textarea');
      textarea.id = `reject-reason-${application.id}`;
      textarea.className = 'q-admin-app-reject-input';
      textarea.rows = 2;
      textarea.maxLength = 500;
      textarea.placeholder = 'Explica brevemente el motivo del rechazo…';
      textarea.value = vm.rejectionReason;
      textarea.disabled = busy;
      textarea.addEventListener('input', (e) => {
        vm.setRejectionReason(e.target.value);
      });

      rejectForm.append(label, textarea);

      if (vm.rejectionError) {
        const err = document.createElement('p');
        err.className = 'q-seller-apply-field-error';
        err.textContent = vm.rejectionError;
        rejectForm.appendChild(err);
      }

      const btnRow = document.createElement('div');
      btnRow.className = 'q-admin-app-reject-buttons';

      const confirmRejectBtn = document.createElement('button');
      confirmRejectBtn.type = 'button';
      confirmRejectBtn.className = 'q-btn q-btn--sm q-admin-app-confirm-reject-btn';
      confirmRejectBtn.textContent = busy ? 'Rechazando…' : 'Confirmar rechazo';
      confirmRejectBtn.disabled = busy;
      confirmRejectBtn.addEventListener('click', () => {
        void vm.submitRejection(application.id);
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'q-btn q-btn--neutral q-btn--sm q-admin-app-cancel-reject-btn';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.disabled = busy;
      cancelBtn.addEventListener('click', () => {
        vm.cancelRejectForm();
      });

      btnRow.append(confirmRejectBtn, cancelBtn);
      rejectForm.appendChild(btnRow);
      container.appendChild(rejectForm);
      return container;
    }

    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.className = 'q-btn q-btn--primary q-btn--sm q-admin-app-approve-btn';
    approveBtn.textContent = busy ? 'Procesando…' : 'Aprobar';
    approveBtn.disabled = busy;
    approveBtn.addEventListener('click', () => {
      void vm.approveApplication(application.id);
    });

    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.className = 'q-btn q-btn--outline q-btn--sm q-admin-app-reject-btn';
    rejectBtn.textContent = 'Rechazar';
    rejectBtn.disabled = busy;
    rejectBtn.addEventListener('click', () => {
      vm.openRejectForm(application.id);
    });

    container.append(approveBtn, rejectBtn);
    return container;
  }

  _buildPager() {
    const vm = this.viewModel;
    const pager = document.createElement('nav');
    pager.className = 'q-orders-page__pagination';
    pager.setAttribute('aria-label', 'Paginación de solicitudes');

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'q-btn q-btn--neutral q-btn--sm q-pagination-btn q-pagination-prev';
    prev.textContent = 'Anterior';
    prev.disabled = vm.meta.page <= 1 || vm.isLoading;
    prev.addEventListener('click', () => void vm.loadApplications(vm.meta.page - 1));

    const info = document.createElement('span');
    info.className = 'q-pagination-info';
    info.textContent = `Página ${vm.meta.page} de ${vm.meta.totalPages}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'q-btn q-btn--neutral q-btn--sm q-pagination-btn q-pagination-next';
    next.textContent = 'Siguiente';
    next.disabled = vm.meta.page >= vm.meta.totalPages || vm.isLoading;
    next.addEventListener('click', () => void vm.loadApplications(vm.meta.page + 1));

    pager.append(prev, info, next);
    return pager;
  }

  _renderForbidden() {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'q-admin-applications-forbidden';
    box.setAttribute('role', 'alert');

    const code = document.createElement('p');
    code.className = 'q-admin-applications-forbidden__code';
    code.textContent = '403 Forbidden';

    const title = document.createElement('h2');
    title.className = 'q-admin-applications-forbidden__title';
    title.textContent = 'Acceso denegado';

    const desc = document.createElement('p');
    desc.textContent =
      'No tienes permisos de administrador para gestionar solicitudes de vendedores.';

    const homeBtn = document.createElement('button');
    homeBtn.type = 'button';
    homeBtn.className = 'q-btn q-btn--primary';
    homeBtn.textContent = 'Volver al inicio';
    homeBtn.addEventListener('click', () => {
      if (typeof this.onNavigate === 'function') this.onNavigate('/');
    });

    box.append(code, title, desc, homeBtn);
    content.appendChild(box);
  }

  _renderGate(message, offerLogin) {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'q-admin-applications-empty';

    const p = document.createElement('p');
    p.textContent = message;
    box.appendChild(p);

    if (offerLogin) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-btn q-btn--primary';
      btn.textContent = 'Iniciar sesión';
      btn.addEventListener('click', () => {
        authRedirectStore.setReturnTo('/admin/seller-applications');
        if (typeof this.onNavigate === 'function') this.onNavigate('/login');
      });
      box.appendChild(btn);
    }

    content.appendChild(box);
  }
}
