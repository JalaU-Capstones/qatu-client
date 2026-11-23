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
