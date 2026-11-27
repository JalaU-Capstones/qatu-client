import { NotificationsViewModel } from './NotificationsViewModel.js';

const notification = (overrides = {}) => ({
  id: 'n-1',
  type: 'order_status_changed',
  title: 'Pedido enviado',
  body: 'Tu pedido ORD-1 ahora está enviado.',
  action_url: '/orders/ORD-1',
  payload: { to_status: 'shipped' },
  read_at: null,
  created_at: '2026-11-26T12:00:00.000Z',
  ...overrides,
});

const page = (data, meta = {}) => ({
  data,
  meta: { page: 1, total_pages: 1, total: data.length, unread_count: 0, ...meta },
});

describe('NotificationsViewModel', () => {
  let api;
  let vm;
  let onNavigate;
  let onOpen;

  beforeEach(() => {
    api = jasmine.createSpyObj('NotificationsApi', [
      'list',
      'getUnreadCount',
      'markAsRead',
      'markAllAsRead',
    ]);
    api.getUnreadCount.and.resolveTo(0);
    api.list.and.resolveTo(page([]));
    api.markAsRead.and.resolveTo({});
    api.markAllAsRead.and.resolveTo(0);
    onNavigate = jasmine.createSpy('onNavigate');
    onOpen = jasmine.createSpy('onOpen');
    vm = new NotificationsViewModel({ api, onNavigate, onOpen, pageSize: 5 });
  });

  afterEach(() => vm.stopPolling());

  it('starts signed out with an empty state', () => {
    const defaults = new NotificationsViewModel({ api });

    expect(defaults.pageSize).toBe(6);
    expect(vm.isAuthenticated).toBeFalse();
    expect(vm.hasUnread).toBeFalse();
    expect(vm.canGoBack).toBeFalse();
    expect(vm.canGoForward).toBeFalse();
  });

  it('loads the unread counter when the user signs in', async () => {
    api.getUnreadCount.and.resolveTo(3);
    const listener = jasmine.createSpy('listener');
    vm.subscribe(listener);

    vm.setAuthenticated(true);
    await vm.refreshUnreadCount();

    expect(vm.unreadCount).toBe(3);
    expect(vm.hasUnread).toBeTrue();
    expect(listener).toHaveBeenCalled();
  });

  it('ignores repeated authentication changes', () => {
    vm.setAuthenticated(false);

    expect(api.getUnreadCount).not.toHaveBeenCalled();
  });

  it('clears everything from memory when the user signs out', async () => {
    api.list.and.resolveTo(page([notification()], { unread_count: 1 }));
    vm.setAuthenticated(true);
    await vm.open();

    vm.setAuthenticated(false);

    expect(vm.isOpen).toBeFalse();
    expect(vm.items).toEqual([]);
    expect(vm.unreadCount).toBe(0);
    expect(vm.status).toBe('idle');
  });

  it('keeps the last counter when polling fails and skips while signed out', async () => {
    await vm.refreshUnreadCount();
    expect(api.getUnreadCount).not.toHaveBeenCalled();

    api.getUnreadCount.and.rejectWith(new Error('offline'));
    vm.setAuthenticated(true);
    vm.unreadCount = 2;
    await vm.refreshUnreadCount();

    expect(vm.unreadCount).toBe(2);
  });

  it('reloads the open page when the polled counter changes', async () => {
    vm.setAuthenticated(true);
    await vm.open();
    api.list.calls.reset();
    api.getUnreadCount.and.resolveTo(4);

    await vm.refreshUnreadCount();

    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 5, unreadOnly: false });
  });

  describe('panel', () => {
    beforeEach(async () => {
      vm.setAuthenticated(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    it('does not open for anonymous users', async () => {
      vm.setAuthenticated(false);

      await vm.open();

      expect(vm.isOpen).toBeFalse();
      expect(api.list).not.toHaveBeenCalled();
    });

    it('opens on page 1, notifies the header and loads the list', async () => {
      api.list.and.resolveTo(
        page([notification()], { page: 1, total_pages: 3, total: 12, unread_count: 7 })
      );

      await vm.open();

      expect(onOpen).toHaveBeenCalled();
      expect(vm.isOpen).toBeTrue();
      expect(vm.status).toBe('ready');
      expect(vm.items.length).toBe(1);
      expect(vm.totalPages).toBe(3);
      expect(vm.total).toBe(12);
      expect(vm.unreadCount).toBe(7);
      expect(vm.canGoForward).toBeTrue();
    });

    it('does not reload when it is already open', async () => {
      await vm.open();
      await vm.open();

      expect(api.list).toHaveBeenCalledTimes(1);
    });

    it('toggles open and closed', async () => {
      await vm.toggle();
      expect(vm.isOpen).toBeTrue();

      await vm.toggle();
      expect(vm.isOpen).toBeFalse();

      vm.close();
      expect(vm.isOpen).toBeFalse();
    });

    it('shows an error state and retries the same page', async () => {
      api.list.and.rejectWith(new Error('500'));
      await vm.open();

      expect(vm.status).toBe('error');
      expect(vm.errorMessage).toContain('No pudimos cargar');

      api.list.and.resolveTo(page([notification()]));
      await vm.retry();

      expect(vm.status).toBe('ready');
    });

    it('closes the panel when the session expired', async () => {
      const expired = new Error('SESSION_EXPIRED');
      expired.code = 'SESSION_EXPIRED';
      api.list.and.rejectWith(expired);

      await vm.open();

      expect(vm.isOpen).toBeFalse();
    });

    it('ignores a response that arrives after a newer request', async () => {
      let resolveSlow;
      api.list.and.returnValues(
        new Promise((resolve) => {
          resolveSlow = resolve;
        }),
        Promise.resolve(page([notification({ id: 'fresh' })]))
      );

      const slow = vm.load(1);
      await vm.load(1);
      resolveSlow(page([notification({ id: 'stale' })]));
      await slow;

      expect(vm.items[0].id).toBe('fresh');
    });

    it('ignores a failure that arrives after a newer request', async () => {
      let rejectSlow;
      api.list.and.returnValues(
        new Promise((_resolve, reject) => {
          rejectSlow = reject;
        }),
        Promise.resolve(page([notification()]))
      );

      const slow = vm.load(1);
      await vm.load(1);
      rejectSlow(new Error('late'));
      await slow;

      expect(vm.status).toBe('ready');
    });

    it('keeps the counter when the list omits it', async () => {
      vm.unreadCount = 2;
      api.list.and.resolveTo({ data: [], meta: {} });

      await vm.load(1);

      expect(vm.unreadCount).toBe(2);
      expect(vm.totalPages).toBe(1);
    });
  });

  describe('filters and pages', () => {
    beforeEach(async () => {
      vm.setAuthenticated(true);
      api.list.and.callFake(async ({ page: requested }) =>
        page([notification()], { page: requested, total_pages: 3, total: 15 })
      );
      await vm.open();
    });

    it('switches to unread only from page 1 and ignores the same filter', async () => {
      await vm.goToPage(2);
      await vm.setFilter('unread');

      expect(vm.filter).toBe('unread');
      expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 5, unreadOnly: true });

      api.list.calls.reset();
      await vm.setFilter('unread');
      expect(api.list).not.toHaveBeenCalled();

      await vm.setFilter('anything');
      expect(vm.filter).toBe('all');
    });

    it('moves between pages within bounds', async () => {
      await vm.nextPage();
      expect(vm.page).toBe(2);
      expect(vm.canGoBack).toBeTrue();

      await vm.goToPage(99);
      expect(vm.page).toBe(3);

      await vm.previousPage();
      expect(vm.page).toBe(2);

      api.list.calls.reset();
      await vm.goToPage(2);
      expect(api.list).not.toHaveBeenCalled();
    });
  });

  describe('reading', () => {
    beforeEach(async () => {
      vm.setAuthenticated(true);
      api.list.and.resolveTo(
        page([notification(), notification({ id: 'n-2', read_at: 'yesterday' })], {
          unread_count: 1,
        })
      );
      await vm.open();
    });

    it('marks an unread notification as read, closes the panel and navigates', async () => {
      await vm.openNotification(vm.items[0]);

      expect(api.markAsRead).toHaveBeenCalledWith('n-1');
      expect(vm.items[0].read_at).not.toBeNull();
      expect(vm.unreadCount).toBe(0);
      expect(vm.isOpen).toBeFalse();
      expect(onNavigate).toHaveBeenCalledWith('/orders/ORD-1');
    });

    it('does not call the API again for a read notification', async () => {
      await vm.openNotification(vm.items[1]);

      expect(api.markAsRead).not.toHaveBeenCalled();
      expect(vm.unreadCount).toBe(1);
    });

    it('stays open when the notification has no link', async () => {
      await vm.openNotification({ ...vm.items[0], action_url: null });

      expect(vm.isOpen).toBeTrue();
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('refreshes the counter when marking fails', async () => {
      api.markAsRead.and.rejectWith(new Error('500'));
      api.getUnreadCount.and.resolveTo(1);

      await vm.openNotification(vm.items[0]);
      await Promise.resolve();

      expect(api.getUnreadCount).toHaveBeenCalled();
    });

    it('decrements the counter for a notification that is not on the page', async () => {
      await vm.openNotification(notification({ id: 'elsewhere', action_url: null }));

      expect(vm.unreadCount).toBe(0);
    });

    it('ignores an empty notification', async () => {
      await vm.openNotification(null);

      expect(api.markAsRead).not.toHaveBeenCalled();
    });

    it('marks everything as read', async () => {
      await vm.markAllAsRead();

      expect(api.markAllAsRead).toHaveBeenCalled();
      expect(vm.unreadCount).toBe(0);
      expect(vm.items.every((item) => item.read_at)).toBeTrue();
      expect(vm.isMarkingAll).toBeFalse();
    });

    it('reloads the unread filter after marking everything', async () => {
      await vm.setFilter('unread');
      vm.unreadCount = 1;
      api.list.calls.reset();

      await vm.markAllAsRead();

      expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 5, unreadOnly: true });
    });

    it('does nothing when there is nothing unread or a request is running', async () => {
      vm.unreadCount = 0;
      await vm.markAllAsRead();

      vm.unreadCount = 1;
      vm.isMarkingAll = true;
      await vm.markAllAsRead();

      expect(api.markAllAsRead).not.toHaveBeenCalled();
    });

    it('reports a failure to mark everything', async () => {
      api.markAllAsRead.and.rejectWith(new Error('500'));

      await vm.markAllAsRead();

      expect(vm.errorMessage).toContain('No pudimos marcar');
      expect(vm.unreadCount).toBe(1);
      expect(vm.isMarkingAll).toBeFalse();
    });
  });

  describe('polling', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('polls the counter on the interval and stops on demand', () => {
      spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
      vm.setAuthenticated(true);
      api.getUnreadCount.calls.reset();

      vm.startPolling(1000);
      jasmine.clock().tick(2100);
      expect(api.getUnreadCount).toHaveBeenCalledTimes(2);

      vm.stopPolling();
      jasmine.clock().tick(5000);
      expect(api.getUnreadCount).toHaveBeenCalledTimes(2);
    });

    it('skips polls while the tab is hidden', () => {
      vm.setAuthenticated(true);
      api.getUnreadCount.calls.reset();
      spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');

      vm.startPolling(1000);
      jasmine.clock().tick(3100);

      expect(api.getUnreadCount).not.toHaveBeenCalled();
    });
  });
});
