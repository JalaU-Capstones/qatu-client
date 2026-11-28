import { NotificationsViewModel } from '../../viewmodels/components/NotificationsViewModel.js';
import { getNotificationVisual, NotificationBellView } from './NotificationBellView.js';

const notification = (overrides = {}) => ({
  id: 'n-1',
  type: 'message_received',
  title: 'Nuevo mensaje recibido',
  body: 'Tienes un mensaje nuevo.',
  action_url: '/conversations?active=c-1',
  payload: {},
  read_at: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('NotificationBellView', () => {
  let api;
  let vm;
  let view;
  let container;

  const panel = () => view.element.querySelector('.q-notif__panel');
  const bell = () => view.element.querySelector('.q-notif__bell');

  beforeEach(() => {
    api = jasmine.createSpyObj('NotificationsApi', [
      'list',
      'getUnreadCount',
      'markAsRead',
      'markAllAsRead',
    ]);
    api.getUnreadCount.and.resolveTo(0);
    api.list.and.resolveTo({ data: [], meta: { page: 1, total_pages: 1, unread_count: 0 } });
    api.markAsRead.and.resolveTo({});
    api.markAllAsRead.and.resolveTo(0);

    vm = new NotificationsViewModel({ api, pageSize: 5 });
    view = new NotificationBellView(vm);
    container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(view.render());
    vm.setAuthenticated(true);
  });

  afterEach(() => {
    view.destroy();
    container.remove();
  });

  it('renders once and reuses the same element', () => {
    expect(view.render()).toBe(view.element);
    expect(bell().getAttribute('aria-label')).toBe('Notificaciones');
    expect(panel().hidden).toBeTrue();
  });

  it('works with a default view model', () => {
    const standalone = new NotificationBellView();

    expect(standalone.render().classList.contains('q-notif')).toBeTrue();
    standalone.destroy();
  });

  it('shows the unread badge, capped at 9+', () => {
    vm.unreadCount = 3;
    vm.subscribe(() => {});
    vm._notify();

    const badge = view.element.querySelector('.q-notif__badge');
    expect(badge.hidden).toBeFalse();
    expect(badge.textContent).toBe('3');
    expect(bell().getAttribute('aria-label')).toContain('3 notificaciones sin leer');

    vm.unreadCount = 1;
    vm._notify();
    expect(bell().getAttribute('title')).toBe('1 notificación sin leer');

    vm.unreadCount = 27;
    vm._notify();
    expect(badge.textContent).toBe('9+');
  });

  it('opens the panel from the bell and shows the empty state', async () => {
    bell().click();
    await vm.load(1);

    expect(panel().hidden).toBeFalse();
    expect(bell().getAttribute('aria-expanded')).toBe('true');
    expect(panel().textContent).toContain('Todavía no tienes notificaciones');
    expect(panel().querySelector('.q-notif__mark-all').disabled).toBeTrue();
  });

  it('shows skeletons while the first page loads', async () => {
    api.list.and.returnValue(new Promise(() => {}));

    void vm.open();

    expect(panel().querySelectorAll('.q-notif__skeleton').length).toBe(3);
    expect(panel().querySelector('.q-notif__body').getAttribute('aria-busy')).toBe('true');
  });

  it('renders notifications with read state, relative time and pagination', async () => {
    api.list.and.resolveTo({
      data: [notification(), notification({ id: 'n-2', read_at: 'x', body: null })],
      meta: { page: 1, total_pages: 2, total: 7, unread_count: 4 },
    });

    await vm.open();

    const items = panel().querySelectorAll('.q-notif__item');
    expect(items.length).toBe(2);
    expect(items[0].classList.contains('q-notif__item--unread')).toBeTrue();
    expect(items[0].querySelector('.q-notif__dot')).not.toBeNull();
    expect(items[0].getAttribute('aria-label')).toContain('Sin leer');
    expect(items[0].querySelector('time').textContent).toBe('Justo ahora');
    expect(items[1].getAttribute('aria-label')).toContain('Leída');
    expect(items[1].querySelector('.q-notif__item-body')).toBeNull();
    expect(panel().querySelector('.q-notif__count').textContent).toBe('4 sin leer');
    expect(panel().querySelector('.q-notif__page-status').textContent).toBe('Página 1 de 2');
    expect(panel().querySelector('[data-focus-key="page-prev"]').disabled).toBeTrue();
  });

  it('opens a notification when it is clicked', async () => {
    api.list.and.resolveTo({
      data: [notification()],
      meta: { page: 1, total_pages: 1, unread_count: 1 },
    });
    spyOn(vm, 'openNotification').and.resolveTo();
    await vm.open();

    panel().querySelector('.q-notif__item').click();

    expect(vm.openNotification).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'n-1' }));
  });

  it('wires the header, tab and pager controls to the view model', async () => {
    api.list.and.resolveTo({
      data: [notification({ action_url: null })],
      meta: { page: 1, total_pages: 2, unread_count: 2 },
    });
    await vm.open();
    spyOn(vm, 'markAllAsRead').and.resolveTo();
    spyOn(vm, 'setFilter').and.resolveTo();
    spyOn(vm, 'nextPage').and.resolveTo();
    spyOn(vm, 'previousPage').and.resolveTo();

    panel().querySelector('.q-notif__mark-all').click();
    panel().querySelector('[data-filter="unread"]').click();
    panel().querySelector('[data-focus-key="page-next"]').click();
    panel().querySelector('[data-focus-key="page-prev"]').click();

    expect(vm.markAllAsRead).toHaveBeenCalled();
    expect(vm.setFilter).toHaveBeenCalledWith('unread');
    expect(vm.nextPage).toHaveBeenCalled();
    expect(vm.previousPage).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus on the same control after re-rendering', async () => {
    api.list.and.resolveTo({
      data: [notification()],
      meta: { page: 1, total_pages: 2, unread_count: 1 },
    });
    await vm.open();

    panel().querySelector('[data-focus-key="page-next"]').focus();
    vm._notify();

    expect(document.activeElement.dataset.focusKey).toBe('page-next');
  });

  it('shows the "Marcando…" label while marking everything', async () => {
    api.list.and.resolveTo({
      data: [notification()],
      meta: { page: 1, total_pages: 1, unread_count: 1 },
    });
    await vm.open();

    vm.isMarkingAll = true;
    vm._notify();

    expect(panel().querySelector('.q-notif__mark-all').textContent).toContain('Marcando');
  });

  it('shows an inline error under the list', async () => {
    api.list.and.resolveTo({
      data: [notification()],
      meta: { page: 1, total_pages: 1, unread_count: 1 },
    });
    await vm.open();

    vm.errorMessage = 'No pudimos marcar las notificaciones como leídas.';
    vm._notify();

    expect(panel().querySelector('.q-notif__inline-error')).not.toBeNull();
  });

  it('shows the unread empty state', async () => {
    await vm.open();
    await vm.setFilter('unread');

    expect(panel().textContent).toContain('Estás al día');
  });

  it('shows the error state with a working retry button', async () => {
    api.list.and.rejectWith(new Error('500'));
    await vm.open();
    spyOn(vm, 'retry').and.resolveTo();

    expect(panel().textContent).toContain('No pudimos cargar');
    panel().querySelector('.q-notif__retry').click();

    expect(vm.retry).toHaveBeenCalled();
  });

  it('closes on outside click and Escape, but not on inside clicks', async () => {
    await vm.open();

    panel().click();
    expect(vm.isOpen).toBeTrue();

    document.body.click();
    expect(vm.isOpen).toBeFalse();

    await vm.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(vm.isOpen).toBeFalse();
    expect(document.activeElement).toBe(bell());

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.body.click();
    expect(vm.isOpen).toBeFalse();
  });

  it('removes itself and stops listening on destroy', () => {
    const element = view.element;
    view.destroy();

    expect(element.isConnected).toBeFalse();
    expect(() => vm._notify()).not.toThrow();
    view.destroy();
  });
});

describe('getNotificationVisual', () => {
  it('maps every notification type to an icon and tone', () => {
    const visual = (type, toStatus) =>
      getNotificationVisual({ type, payload: { to_status: toStatus } });

    expect(visual('order_status_changed', 'cancelled')).toEqual(
      jasmine.objectContaining({ icon: 'cancel', tone: 'danger' })
    );
    expect(visual('order_status_changed', 'delivered').tone).toBe('success');
    expect(visual('order_status_changed', 'shipped').icon).toBe('truck');
    expect(visual('order_status_changed', 'confirmed').icon).toBe('order');
    expect(visual('order_placed').label).toBe('Pedido');
    expect(visual('message_received').label).toBe('Mensaje');
    expect(visual('seller_approved').tone).toBe('success');
    expect(visual('seller_rejected').tone).toBe('danger');
    expect(visual('rating_received').icon).toBe('star');
    expect(getNotificationVisual(null).label).toBe('Aviso');
  });
});
