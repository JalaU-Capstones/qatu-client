import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { AdminSellerApplicationsViewModel } from '../../viewmodels/pages/AdminSellerApplicationsViewModel.js';
import { AdminSellerApplicationsPageView } from './AdminSellerApplicationsPageView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function application(overrides = {}) {
  return {
    id: 'app-pending',
    business_name: 'Taller Illimani',
    business_description: 'Textiles y artesanía andina.',
    contact_email: 'taller@example.com',
    contact_phone: '+591 700 12345',
    created_at: '2026-11-18T12:00:00.000Z',
    status: 'pending',
    ...overrides,
  };
}

describe('AdminSellerApplicationsPageView', () => {
  let container;
  let view;
  let viewModel;
  let applications;
  let api;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    applications = [
      application(),
      application({ id: 'app-approved', status: 'approved', business_name: 'Café Altura' }),
      application({
        id: 'app-rejected',
        status: 'rejected',
        business_name: 'Cerámica del Valle',
        rejection_reason: 'Completa la información comercial.',
      }),
    ];
    api = {
      listApplications: jasmine.createSpy('listApplications').and.callFake(async () => ({
        data: applications,
        meta: { page: 1, limit: 20, total: applications.length, totalPages: 1 },
      })),
      reviewApplication: jasmine
        .createSpy('reviewApplication')
        .and.callFake(async (id, decision) => ({
          data: { id, ...decision },
        })),
    };
    viewModel = new AdminSellerApplicationsViewModel({ sellerApplicationsApi: api });
    view = new AdminSellerApplicationsPageView({ viewModel });
    spyOn(authStore, 'isAuthenticated').and.returnValue(true);
    spyOn(authStore, 'isAdmin').and.returnValue(true);
  });

  afterEach(() => {
    view?.destroy();
    container.remove();
  });

  it('renders the labeled admin table, status badges and action controls', async () => {
    view.mount(container);
    await tick();

    expect(container.querySelector('.q-admin-applications-title').textContent).toBe(
      'Solicitudes de vendedores'
    );
    expect(container.querySelector('.q-admin-applications-subtitle').textContent).toBe(
      "Revisa, aprueba o rechaza las postulaciones para vender en Q'atu"
    );
    expect(container.querySelector('#admin-seller-app-status-filter')).not.toBeNull();
    expect([...container.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
      'Negocio',
      'Descripción',
      'Contacto',
      'Fecha',
      'Estado',
      'Acciones',
    ]);
    expect(
      [...container.querySelectorAll('tbody td')].slice(0, 6).map((cell) => cell.dataset.label)
    ).toEqual(['Negocio', 'Descripción', 'Contacto', 'Fecha', 'Estado', 'Acciones']);
    expect(
      [...container.querySelectorAll('.q-seller-app-badge')].map((badge) => badge.textContent)
    ).toEqual(['Pendiente', 'Aprobada', 'Rechazada']);
    expect(container.querySelector('.q-admin-applications-table-wrap').getAttribute('role')).toBe(
      'region'
    );
    expect(container.querySelector('.q-admin-app-approve-btn').textContent).toBe('Aprobar');
    expect(container.querySelector('.q-admin-app-reject-btn').textContent).toBe('Rechazar');

    container.querySelector('.q-admin-app-approve-btn').click();
    await tick();
    expect(api.reviewApplication).toHaveBeenCalledWith('app-pending', { status: 'approved' });
    expect(
      container.querySelector('tr[data-application-id="app-pending"] .q-seller-app-badge')
        .textContent
    ).toBe('Aprobada');
  });

  it('keeps the rejection form and filtering controls connected to the view model', async () => {
    view.mount(container);
    await tick();

    container.querySelector('.q-admin-app-reject-btn').click();
    const reason = container.querySelector('#reject-reason-app-pending');
    expect(reason).not.toBeNull();
    reason.value = 'Información incompleta';
    reason.dispatchEvent(new Event('input'));
    container.querySelector('.q-admin-app-confirm-reject-btn').click();
    await tick();
    expect(api.reviewApplication).toHaveBeenCalledWith('app-pending', {
      status: 'rejected',
      rejectionReason: 'Información incompleta',
    });

    const filter = container.querySelector('#admin-seller-app-status-filter');
    filter.value = 'approved';
    filter.dispatchEvent(new Event('change'));
    await tick();
    expect(api.listApplications).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, status: 'approved' })
    );
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

  function mockApplication(overrides = {}) {
    return {
      business_description: 'Artesanía textil',
      business_name: 'Tejidos Illimani',
      contact_email: 'ana@example.com',
      contact_phone: '77712345',
      created_at: '2026-10-14T11:00:00.000Z',
      id: 'app-1',
      status: 'pending',
      ...overrides,
    };
  }

  function createViewModel(overrides = {}) {
    const listeners = new Set();
    const vm = {
      applications: [mockApplication()],
      errorMessage: '',
      isForbidden: false,
      isLoading: false,
      meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
      noticeMessage: '',
      rejectionError: '',
      rejectionReason: '',
      rejectingId: null,
      reviewingIds: new Set(),
      statusFilter: '',
      subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
        listeners.add(listener);
        return jasmine.createSpy('unsubscribe').and.callFake(() => listeners.delete(listener));
      }),
      _notify() {
        for (const listener of [...listeners]) listener(vm);
      },
      approveApplication: jasmine.createSpy('approveApplication').and.resolveTo(true),
      cancelRejectForm: jasmine.createSpy('cancelRejectForm').and.callFake(() => {
        vm.rejectingId = null;
        vm._notify();
      }),
      isReviewing: jasmine.createSpy('isReviewing').and.callFake((id) => vm.reviewingIds.has(id)),
      loadApplications: jasmine.createSpy('loadApplications').and.callFake(() => {
        vm._notify();
        return Promise.resolve();
      }),
      openRejectForm: jasmine.createSpy('openRejectForm').and.callFake((id) => {
        vm.rejectingId = id;
        vm.rejectionReason = '';
        vm.rejectionError = '';
        vm._notify();
      }),
      setRejectionReason: jasmine.createSpy('setRejectionReason').and.callFake((value) => {
        vm.rejectionReason = value;
        vm._notify();
      }),
      setStatusFilter: jasmine.createSpy('setStatusFilter').and.callFake((value) => {
        vm.statusFilter = value || '';
        vm._notify();
      }),
      submitRejection: jasmine.createSpy('submitRejection').and.resolveTo(true),
      ...overrides,
    };
    return vm;
  }

  describe('AdminSellerApplicationsPageView (recovered 1)', () => {
    let container;
    let onNavigate;
    let viewModel;
    let view;

    const rowFor = (id) => container.querySelector(`tr[data-application-id="${id}"]`);
    const cellFor = (row, label) => row.querySelector(`td[data-label="${label}"]`);

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      authStore.setSession({
        roles: [{ name: 'admin' }],
        user: { id: 'admin-1', username: 'ada' },
      });
      onNavigate = jasmine.createSpy('onNavigate');
      viewModel = createViewModel();
      view = new AdminSellerApplicationsPageView({ onNavigate, viewModel });
    });

    afterEach(() => {
      view?.destroy();
      view = null;
      container.remove();
      authStore.clearSession();
      authRedirectStore.clearReturnTo();
    });

    it('renders an accessible section header and the exact status filter options', () => {
      view.mount(container);
      const section = container.querySelector('.q-admin-applications-page');

      expect(section.getAttribute('aria-label')).toBe(
        'Administración de solicitudes de vendedores'
      );
      expect(section.querySelector('.q-admin-applications-title').textContent).toBe(
        'Solicitudes de vendedores'
      );
      const filterLabel = section.querySelector('label[for="admin-seller-app-status-filter"]');
      expect(filterLabel.textContent).toBe('Estado:');
      const select = section.querySelector('#admin-seller-app-status-filter');
      expect([...select.options].map((option) => [option.value, option.textContent])).toEqual([
        ['', 'Todos'],
        ['pending', 'Pendientes'],
        ['approved', 'Aprobadas'],
        ['rejected', 'Rechazadas'],
      ]);
    });

    it('loads applications on page 1 for an admin', () => {
      view.mount(container);
      expect(viewModel.loadApplications).toHaveBeenCalledWith(1);
    });

    it('shows the exact login gate for anonymous visitors and remembers the return path', () => {
      authStore.clearSession();
      spyOn(authRedirectStore, 'setReturnTo');

      view.mount(container);
      const gate = container.querySelector('.q-admin-applications-empty');
      expect(gate).not.toBeNull();
      expect(gate.querySelector('p').textContent).toBe(
        'Debes iniciar sesión como administrador para acceder a este panel.'
      );
      const loginButton = gate.querySelector('button.q-btn--primary');
      expect(loginButton.textContent).toBe('Iniciar sesión');
      expect(viewModel.loadApplications).not.toHaveBeenCalled();

      loginButton.click();
      expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith('/admin/seller-applications');
      expect(onNavigate).toHaveBeenCalledWith('/login');
    });

    it('shows the exact forbidden box for signed-in non-admins at mount', () => {
      authStore.setSession({
        roles: [{ name: 'buyer' }],
        user: { id: 'buyer-1', username: 'brian' },
      });

      view.mount(container);
      const box = container.querySelector('.q-admin-applications-forbidden');
      expect(box).not.toBeNull();
      expect(box.getAttribute('role')).toBe('alert');
      const paragraphs = box.querySelectorAll('p');
      expect(paragraphs[0].textContent).toBe('403 Forbidden');
      expect(paragraphs[0].className).toBe('q-admin-applications-forbidden__code');
      expect(box.querySelector('.q-admin-applications-forbidden__title').textContent).toBe(
        'Acceso denegado'
      );
      expect(paragraphs[1].textContent).toBe(
        'No tienes permisos de administrador para gestionar solicitudes de vendedores.'
      );
      const homeButton = box.querySelector('button.q-btn--primary');
      expect(homeButton.textContent).toBe('Volver al inicio');
      expect(viewModel.loadApplications).not.toHaveBeenCalled();

      homeButton.click();
      expect(onNavigate).toHaveBeenCalledWith('/');
    });

    it('switches to the forbidden box when the view model reports isForbidden', () => {
      view.mount(container);
      expect(container.querySelector('.q-admin-applications-table')).not.toBeNull();

      viewModel.isForbidden = true;
      viewModel._notify();

      expect(container.querySelector('.q-admin-applications-forbidden')).not.toBeNull();
      expect(container.querySelector('.q-admin-applications-table')).toBeNull();
    });

    it('renders application cells, joined contact, localized date, and pending badge', () => {
      view.mount(container);
      const row = rowFor('app-1');

      expect(row.dataset.applicationId).toBe('app-1');
      const cells = [...row.querySelectorAll('td')];
      expect(cells.map((cell) => cell.dataset.label)).toEqual([
        'Negocio',
        'Descripción',
        'Contacto',
        'Fecha',
        'Estado',
        'Acciones',
      ]);
      expect(cellFor(row, 'Negocio').textContent).toBe('Tejidos Illimani');
      expect(cellFor(row, 'Descripción').textContent).toBe('Artesanía textil');
      expect(cellFor(row, 'Contacto').textContent).toBe('ana@example.com · 77712345');
      expect(cellFor(row, 'Fecha').textContent).toBe(
        new Date('2026-10-14T11:00:00.000Z').toLocaleDateString()
      );
      const badge = cellFor(row, 'Estado').querySelector('.q-seller-app-badge');
      expect(badge.className).toBe('q-seller-app-badge q-seller-app-badge--pending');
      expect(badge.textContent).toBe('Pendiente');
    });

    it('shows dashes for missing data and characterizes the missing-status badge/actions mismatch', () => {
      viewModel.applications = [
        mockApplication({
          business_description: '',
          business_name: '',
          contact_email: '',
          contact_phone: '',
          created_at: '',
          status: '',
        }),
      ];
      view.mount(container);
      const row = rowFor('app-1');

      expect([...row.querySelectorAll('td')].slice(0, 4).map((cell) => cell.textContent)).toEqual([
        '—',
        '—',
        '—',
        '—',
      ]);
      const badge = cellFor(row, 'Estado').querySelector('.q-seller-app-badge');
      expect(badge.textContent).toBe('Pendiente');
      expect(badge.className).toBe('q-seller-app-badge q-seller-app-badge--pending');
      expect(cellFor(row, 'Acciones').textContent).toBe('Revisada');
      expect(row.querySelector('.q-admin-app-approve-btn')).toBeNull();
      expect(row.querySelector('.q-admin-app-reject-btn')).toBeNull();
    });

    it('renders the rejected badge, reason note, and no action buttons', () => {
      viewModel.applications = [
        mockApplication({ rejection_reason: 'Datos incompletos', status: 'rejected' }),
      ];
      view.mount(container);
      const row = rowFor('app-1');
      const wrap = cellFor(row, 'Estado').querySelector('.q-admin-app-status-wrap');

      expect(wrap.querySelector('.q-seller-app-badge').textContent).toBe('Rechazada');
      expect(wrap.querySelector('.q-admin-app-rejection-note').textContent).toBe(
        'Motivo: Datos incompletos'
      );
      expect(cellFor(row, 'Acciones').textContent).toBe('Revisada');
      expect(row.querySelector('.q-admin-app-approve-btn')).toBeNull();
      expect(row.querySelector('.q-admin-app-reject-btn')).toBeNull();
    });

    it('renders an unknown status verbatim in the badge text and class name', () => {
      viewModel.applications = [mockApplication({ status: 'on_hold' })];
      view.mount(container);
      const row = rowFor('app-1');
      const badge = cellFor(row, 'Estado').querySelector('.q-seller-app-badge');

      expect(badge.textContent).toBe('on_hold');
      expect(badge.className).toContain('q-seller-app-badge--on_hold');
      expect(cellFor(row, 'Acciones').textContent).toBe('Revisada');
    });

    it('marks a busy row and disables approve/reject with Procesando…', () => {
      viewModel.reviewingIds.add('app-1');
      view.mount(container);
      const row = rowFor('app-1');
      const approveButton = row.querySelector('.q-admin-app-approve-btn');
      const rejectButton = row.querySelector('.q-admin-app-reject-btn');

      expect(row.getAttribute('aria-busy')).toBe('true');
      expect(viewModel.isReviewing).toHaveBeenCalledWith('app-1');
      expect(approveButton.textContent).toBe('Procesando…');
      expect(approveButton.disabled).toBe(true);
      expect(rejectButton.disabled).toBe(true);
    });

    it('delegates approve and reject clicks to the view model', () => {
      view.mount(container);
      const row = rowFor('app-1');

      row.querySelector('.q-admin-app-approve-btn').click();
      expect(viewModel.approveApplication).toHaveBeenCalledWith('app-1');

      row.querySelector('.q-admin-app-reject-btn').click();
      expect(viewModel.openRejectForm).toHaveBeenCalledWith('app-1');
    });

    it('renders the rejection form with exact field metadata and delegates confirmation', async () => {
      viewModel.rejectingId = 'app-1';
      viewModel.rejectionReason = 'Falta de datos';
      view.mount(container);
      const row = rowFor('app-1');
      const box = row.querySelector('.q-admin-app-reject-box');
      const label = box.querySelector('.q-admin-app-reject-label');
      const textarea = box.querySelector('.q-admin-app-reject-input');

      expect(label.textContent).toBe('Motivo de rechazo *');
      expect(label.htmlFor).toBe('reject-reason-app-1');
      expect(textarea.id).toBe('reject-reason-app-1');
      expect(textarea.rows).toBe(2);
      expect(textarea.maxLength).toBe(500);
      expect(textarea.placeholder).toBe('Explica brevemente el motivo del rechazo…');
      expect(textarea.value).toBe('Falta de datos');
      expect(row.querySelector('.q-admin-app-approve-btn')).toBeNull();
      expect(row.querySelector('.q-admin-app-reject-btn')).toBeNull();

      box.querySelector('.q-admin-app-confirm-reject-btn').click();
      await tick();
      expect(viewModel.submitRejection).toHaveBeenCalledWith('app-1');
    });

    it('delegates rejection cancellation to the view model', () => {
      viewModel.rejectingId = 'app-1';
      view.mount(container);

      rowFor('app-1').querySelector('.q-admin-app-cancel-reject-btn').click();

      expect(viewModel.cancelRejectForm).toHaveBeenCalled();
    });

    it('forwards rejection reason input to the view model', () => {
      viewModel.rejectingId = 'app-1';
      view.mount(container);
      const textarea = rowFor('app-1').querySelector('.q-admin-app-reject-input');

      textarea.value = 'Motivo actualizado';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      expect(viewModel.setRejectionReason).toHaveBeenCalledWith('Motivo actualizado');
    });

    it('renders the exact rejection validation error', () => {
      viewModel.rejectingId = 'app-1';
      viewModel.rejectionError =
        'El motivo de rechazo es obligatorio cuando se rechaza una solicitud.';
      view.mount(container);

      expect(rowFor('app-1').querySelector('.q-seller-apply-field-error').textContent).toBe(
        'El motivo de rechazo es obligatorio cuando se rechaza una solicitud.'
      );
    });

    it('disables the rejection form and shows Rechazando… while submitting', () => {
      viewModel.rejectingId = 'app-1';
      viewModel.reviewingIds.add('app-1');
      view.mount(container);
      const row = rowFor('app-1');
      const textarea = row.querySelector('.q-admin-app-reject-input');
      const confirmButton = row.querySelector('.q-admin-app-confirm-reject-btn');
      const cancelButton = row.querySelector('.q-admin-app-cancel-reject-btn');

      expect(row.getAttribute('aria-busy')).toBe('true');
      expect(textarea.disabled).toBe(true);
      expect(confirmButton.textContent).toBe('Rechazando…');
      expect(confirmButton.disabled).toBe(true);
      expect(cancelButton.disabled).toBe(true);
    });

    it('renders and clears success and error alerts from the view model', () => {
      view.mount(container);
      const notice = container.querySelector('[data-role="notice"]');
      const error = container.querySelector('[data-role="error"]');
      expect(notice.getAttribute('aria-live')).toBe('polite');
      expect(error.getAttribute('role')).toBe('alert');

      viewModel.noticeMessage =
        'Solicitud aprobada. El solicitante recibió el rol de vendedor y fue notificado.';
      viewModel.errorMessage = 'No se pudo aprobar la solicitud.';
      viewModel._notify();

      expect(notice.querySelector('.q-orders-alert--success').textContent).toBe(
        'Solicitud aprobada. El solicitante recibió el rol de vendedor y fue notificado.'
      );
      expect(error.querySelector('.q-orders-alert--forbidden').textContent).toBe(
        'No se pudo aprobar la solicitud.'
      );

      viewModel.noticeMessage = '';
      viewModel.errorMessage = '';
      viewModel._notify();
      expect(notice.children.length).toBe(0);
      expect(error.children.length).toBe(0);
    });

    it('shows the exact empty and loading messages', () => {
      viewModel.applications = [];
      view.mount(container);
      const content = container.querySelector('[data-role="content"]');

      expect(content.textContent).toBe('No hay solicitudes de vendedores para mostrar.');
      expect(content.querySelector('.q-admin-applications-empty')).not.toBeNull();

      viewModel.isLoading = true;
      viewModel._notify();
      expect(content.textContent).toBe('Cargando solicitudes…');
    });

    it('marks the applications table wrapper as busy while loading', () => {
      viewModel.isLoading = true;
      view.mount(container);
      let wrap = container.querySelector('.q-admin-applications-table-wrap');

      expect(wrap.classList.contains('is-loading')).toBe(true);
      expect(wrap.getAttribute('aria-busy')).toBe('true');

      viewModel.isLoading = false;
      viewModel._notify();
      wrap = container.querySelector('.q-admin-applications-table-wrap');
      expect(wrap.classList.contains('is-loading')).toBe(false);
      expect(wrap.hasAttribute('aria-busy')).toBe(false);
    });

    it('omits the pager when there is only one page', () => {
      view.mount(container);
      expect(container.querySelector('.q-orders-page__pagination')).toBeNull();
    });

    it('renders the pager with exact label and enforces page and loading rules', () => {
      viewModel.meta = { limit: 20, page: 2, total: 40, totalPages: 3 };
      view.mount(container);
      let pager = container.querySelector('.q-orders-page__pagination');

      expect(pager.getAttribute('aria-label')).toBe('Paginación de solicitudes');
      expect(pager.querySelector('.q-pagination-info').textContent).toBe('Página 2 de 3');
      expect(pager.querySelector('.q-pagination-prev').disabled).toBe(false);
      expect(pager.querySelector('.q-pagination-next').disabled).toBe(false);

      pager.querySelector('.q-pagination-prev').click();
      expect(viewModel.loadApplications).toHaveBeenCalledWith(1);

      pager = container.querySelector('.q-orders-page__pagination');
      pager.querySelector('.q-pagination-next').click();
      expect(viewModel.loadApplications).toHaveBeenCalledWith(3);

      viewModel.meta.page = 1;
      viewModel._notify();
      expect(container.querySelector('.q-pagination-prev').disabled).toBe(true);
      expect(container.querySelector('.q-pagination-next').disabled).toBe(false);

      viewModel.meta.page = 3;
      viewModel._notify();
      expect(container.querySelector('.q-pagination-prev').disabled).toBe(false);
      expect(container.querySelector('.q-pagination-next').disabled).toBe(true);

      viewModel.isLoading = true;
      viewModel._notify();
      expect(container.querySelector('.q-pagination-prev').disabled).toBe(true);
      expect(container.querySelector('.q-pagination-next').disabled).toBe(true);
    });

    it('forwards status filter changes to the view model', () => {
      view.mount(container);
      const select = container.querySelector('#admin-seller-app-status-filter');

      select.value = 'approved';
      select.dispatchEvent(new Event('change', { bubbles: true }));

      expect(viewModel.setStatusFilter).toHaveBeenCalledWith('approved');
    });

    it('caches render() output across calls and mount()', () => {
      const rendered = view.render();

      expect(view.render()).toBe(rendered);
      expect(view.mount(container)).toBe(rendered);
      expect(view.render()).toBe(rendered);
      expect(view.element).toBe(rendered);
    });

    it('unsubscribes once and ignores notifications after destroy', () => {
      view.mount(container);
      const rendered = view.element;
      const unsubscribe = viewModel.subscribe.calls.mostRecent().returnValue;
      const content = container.querySelector('[data-role="content"]');
      const before = content.textContent;

      view.destroy();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(container.querySelector('.q-admin-applications-page')).toBeNull();
      expect(view.element).toBeNull();

      viewModel.noticeMessage = 'No debe aparecer.';
      viewModel._notify();
      expect(content.textContent).toBe(before);

      expect(() => view.destroy()).not.toThrow();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
      expect(view.render()).not.toBe(rendered);
    });

    it('keeps the forbidden home button safe when onNavigate is absent', () => {
      authStore.setSession({ roles: [{ name: 'buyer' }], user: { id: 'buyer-1' } });
      view = new AdminSellerApplicationsPageView({ viewModel });

      view.mount(container);
      const homeButton = container.querySelector('.q-admin-applications-forbidden button');
      expect(() => homeButton.click()).not.toThrow();
    });
  });
})();
