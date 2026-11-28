import { NotificationsApi } from '../../models/api/NotificationsApi.js';

export const NOTIFICATIONS_PAGE_SIZE = 6;
export const NOTIFICATIONS_POLL_INTERVAL_MS = 30000;

export class NotificationsViewModel {
  constructor({
    api = new NotificationsApi(),
    onNavigate = null,
    onOpen = null,
    pageSize = NOTIFICATIONS_PAGE_SIZE,
  } = {}) {
    this.api = api;
    this.onNavigate = onNavigate;
    this.onOpen = onOpen;
    this.pageSize = pageSize;

    this.isAuthenticated = false;
    this.isOpen = false;
    this.unreadCount = 0;
    this.filter = 'all';
    this.items = [];
    this.page = 1;
    this.totalPages = 1;
    this.total = 0;
    this.status = 'idle';
    this.errorMessage = '';
    this.isMarkingAll = false;

    this._pollTimer = null;
    this._requestId = 0;
    this._listeners = new Set();
  }

  get hasUnread() {
    return this.unreadCount > 0;
  }

  get canGoBack() {
    return this.page > 1;
  }

  get canGoForward() {
    return this.page < this.totalPages;
  }

  /** Signing out clears the previous user's data */
  setAuthenticated(value) {
    const next = Boolean(value);
    if (next === this.isAuthenticated) return;

    this.isAuthenticated = next;
    if (next) {
      void this.refreshUnreadCount();
    } else {
      this._reset();
    }
    this._notify();
  }

  async refreshUnreadCount() {
    if (!this.isAuthenticated) return;
    try {
      const count = await this.api.getUnreadCount();
      const changed = count !== this.unreadCount;
      this.unreadCount = count;
      if (changed) {
        this._notify();
        if (this.isOpen) void this.load(this.page);
      }
    } catch {
      // The badge keeps the last value; the next poll tries again
    }
  }

  async open() {
    if (!this.isAuthenticated || this.isOpen) return;
    this.isOpen = true;
    if (typeof this.onOpen === 'function') this.onOpen();
    this._notify();
    await this.load(1);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._notify();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
      return Promise.resolve();
    }
    return this.open();
  }

  async setFilter(filter) {
    const next = filter === 'unread' ? 'unread' : 'all';
    if (next === this.filter) return;
    this.filter = next;
    await this.load(1);
  }

  async goToPage(page) {
    const target = Math.min(Math.max(1, Number(page) || 1), this.totalPages);
    if (target === this.page && this.status === 'ready') return;
    await this.load(target);
  }

  nextPage() {
    return this.goToPage(this.page + 1);
  }

  previousPage() {
    return this.goToPage(this.page - 1);
  }

  async load(page = 1) {
    if (!this.isAuthenticated) return;
    const requestId = ++this._requestId;
    this.status = 'loading';
    this.errorMessage = '';
    this._notify();

    try {
      const { data, meta } = await this.api.list({
        page,
        limit: this.pageSize,
        unreadOnly: this.filter === 'unread',
      });
      if (requestId !== this._requestId) return;

      this.items = data;
      this.page = Number(meta.page) || page;
      this.totalPages = Math.max(1, Number(meta.total_pages) || 1);
      this.total = Number(meta.total) || 0;
      if (Number.isFinite(Number(meta.unread_count))) {
        this.unreadCount = Number(meta.unread_count);
      }
      this.status = 'ready';
    } catch (error) {
      if (requestId !== this._requestId) return;
      this.status = 'error';
      this.errorMessage = 'No pudimos cargar tus notificaciones. Intenta de nuevo.';
      if (error?.code === 'SESSION_EXPIRED') this.close();
    }
    this._notify();
  }

  retry() {
    return this.load(this.page);
  }

  /** Marks it read, closes the panel and follows the link */
  async openNotification(notification) {
    if (!notification) return;

    if (!notification.read_at) {
      this._applyRead(notification.id, new Date().toISOString());
      try {
        await this.api.markAsRead(notification.id);
      } catch {
        void this.refreshUnreadCount();
      }
    }

    const target = notification.action_url;
    if (target) {
      this.close();
      if (typeof this.onNavigate === 'function') this.onNavigate(target);
    }
  }

  async markAllAsRead() {
    if (!this.hasUnread || this.isMarkingAll) return;
    this.isMarkingAll = true;
    this._notify();

    try {
      await this.api.markAllAsRead();
      const readAt = new Date().toISOString();
      this.items = this.items.map((item) => (item.read_at ? item : { ...item, read_at: readAt }));
      this.unreadCount = 0;
      if (this.filter === 'unread') {
        this.isMarkingAll = false;
        await this.load(1);
        return;
      }
    } catch {
      this.errorMessage = 'No pudimos marcar las notificaciones como leídas.';
    }
    this.isMarkingAll = false;
    this._notify();
  }

  startPolling(intervalMs = NOTIFICATIONS_POLL_INTERVAL_MS) {
    this.stopPolling();
    this._pollTimer = setInterval(() => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (!hidden) void this.refreshUnreadCount();
    }, intervalMs);
  }

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _applyRead(notificationId, readAt) {
    let changed = false;
    this.items = this.items.map((item) => {
      if (item.id !== notificationId || item.read_at) return item;
      changed = true;
      return { ...item, read_at: readAt };
    });
    if (changed || !this.items.some((item) => item.id === notificationId)) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    this._notify();
  }

  _reset() {
    this._requestId += 1;
    this.isOpen = false;
    this.unreadCount = 0;
    this.filter = 'all';
    this.items = [];
    this.page = 1;
    this.totalPages = 1;
    this.total = 0;
    this.status = 'idle';
    this.errorMessage = '';
    this.isMarkingAll = false;
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }
}
