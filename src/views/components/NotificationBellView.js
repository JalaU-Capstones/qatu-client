import { formatFullDateTime, formatRelativeTime } from '../../utils/formatRelativeTime.js';
import { NotificationsViewModel } from '../../viewmodels/components/NotificationsViewModel.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>',
  order:
    '<path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5M12 22V12"></path>',
  truck:
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle>',
  check: '<circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 4.5-5"></path>',
  cancel: '<circle cx="12" cy="12" r="9"></circle><path d="m15 9-6 6M9 9l6 6"></path>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  store: '<path d="M3 10h18l-2-6H5l-2 6z"></path><path d="M5 10v10h14V10M9 20v-6h6v6"></path>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"></path>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>',
  chevronLeft: '<path d="m15 18-6-6 6-6"></path>',
  chevronRight: '<path d="m9 18 6-6-6-6"></path>',
  checkAll: '<path d="M18 6 7 17l-5-5"></path><path d="m22 10-7.5 7.5L13 16"></path>',
};

/** Icon and color from the type and order status */
export function getNotificationVisual(notification) {
  const type = notification?.type;
  const toStatus = notification?.payload?.to_status;

  if (type === 'order_status_changed') {
    if (toStatus === 'cancelled') return { icon: 'cancel', tone: 'danger', label: 'Pedido' };
    if (toStatus === 'delivered') return { icon: 'check', tone: 'success', label: 'Pedido' };
    if (toStatus === 'shipped') return { icon: 'truck', tone: 'info', label: 'Pedido' };
    return { icon: 'order', tone: 'info', label: 'Pedido' };
  }
  if (type === 'order_placed') return { icon: 'order', tone: 'accent', label: 'Pedido' };
  if (type === 'message_received') return { icon: 'message', tone: 'accent', label: 'Mensaje' };
  if (type === 'seller_approved') return { icon: 'store', tone: 'success', label: 'Vendedor' };
  if (type === 'seller_rejected') return { icon: 'store', tone: 'danger', label: 'Vendedor' };
  if (type === 'rating_received') return { icon: 'star', tone: 'warning', label: 'Calificación' };
  return { icon: 'bell', tone: 'accent', label: 'Aviso' };
}

function createIcon(name, className) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] || ICONS.bell;
  return svg;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const formatBadge = (count) => (count > 9 ? '9+' : String(count));

export class NotificationBellView {
  constructor(viewModel = new NotificationsViewModel()) {
    this.viewModel = viewModel;
    this.element = null;
    this._bell = null;
    this._badge = null;
    this._panel = null;
    this._unsubscribe = null;
    this._handleDocumentClick = this._handleDocumentClick.bind(this);
    this._handleKeydown = this._handleKeydown.bind(this);
  }

  render() {
    if (this.element) return this.element;

    const wrapper = el('div', 'q-notif');

    const bell = el('button', 'q-header-icon-btn q-notif__bell');
    bell.type = 'button';
    bell.setAttribute('aria-haspopup', 'dialog');
    bell.setAttribute('aria-controls', 'q-notif-panel');
    bell.appendChild(createIcon('bell', 'q-notif__bell-icon'));
    bell.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.viewModel.toggle();
    });

    const badge = el('span', 'q-notif__badge');
    badge.setAttribute('aria-hidden', 'true');
    bell.appendChild(badge);

    const panel = el('section', 'q-notif__panel');
    panel.id = 'q-notif-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notificaciones');
    panel.hidden = true;
    panel.addEventListener('click', (event) => event.stopPropagation());

    wrapper.append(bell, panel);

    this.element = wrapper;
    this._bell = bell;
    this._badge = badge;
    this._panel = panel;

    this._unsubscribe = this.viewModel.subscribe(() => this._update());
    document.addEventListener('click', this._handleDocumentClick);
    document.addEventListener('keydown', this._handleKeydown);

    this._update();
    return wrapper;
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') this._unsubscribe();
    this._unsubscribe = null;
    document.removeEventListener('click', this._handleDocumentClick);
    document.removeEventListener('keydown', this._handleKeydown);
    this.element?.remove();
    this.element = null;
  }

  _update() {
    if (!this.element) return;
    const vm = this.viewModel;

    const unreadLabel =
      vm.unreadCount === 1
        ? '1 notificación sin leer'
        : `${vm.unreadCount} notificaciones sin leer`;
    this._bell.setAttribute(
      'aria-label',
      vm.hasUnread ? `Notificaciones, ${unreadLabel}` : 'Notificaciones'
    );
    this._bell.setAttribute('title', vm.hasUnread ? unreadLabel : 'Notificaciones');
    this._bell.setAttribute('aria-expanded', String(vm.isOpen));
    this._bell.classList.toggle('q-notif__bell--active', vm.isOpen);
    this._badge.hidden = !vm.hasUnread;
    this._badge.textContent = vm.hasUnread ? formatBadge(vm.unreadCount) : '';

    const wasOpen = !this._panel.hidden;
    this._panel.hidden = !vm.isOpen;
    if (vm.isOpen) {
      this._renderPanel();
      if (!wasOpen) this._panel.querySelector('.q-notif__tab[aria-selected="true"]')?.focus();
    }
  }

  _renderPanel() {
    const vm = this.viewModel;
    const active = document.activeElement;
    const focusKey = this._panel.contains(active) ? active?.dataset?.focusKey : null;

    this._panel.replaceChildren(this._renderHead(), this._renderTabs(), this._renderBody());
    if (vm.status === 'ready' && vm.totalPages > 1) {
      this._panel.appendChild(this._renderPager());
    }

    if (focusKey) {
      const target = this._panel.querySelector(`[data-focus-key="${focusKey}"]`);
      if (target && !target.disabled) target.focus();
    }
  }

  _renderHead() {
    const vm = this.viewModel;
    const head = el('header', 'q-notif__head');

    const titleRow = el('div', 'q-notif__title-row');
    titleRow.appendChild(el('h2', 'q-notif__title', 'Notificaciones'));
    if (vm.hasUnread) {
      titleRow.appendChild(el('span', 'q-notif__count', `${vm.unreadCount} sin leer`));
    }

    const markAll = el('button', 'q-notif__mark-all');
    markAll.type = 'button';
    markAll.dataset.focusKey = 'mark-all';
    markAll.disabled = !vm.hasUnread || vm.isMarkingAll;
    markAll.append(
      createIcon('checkAll', 'q-notif__mark-all-icon'),
      el('span', '', vm.isMarkingAll ? 'Marcando…' : 'Marcar todas como leídas')
    );
    markAll.addEventListener('click', () => void vm.markAllAsRead());

    head.append(titleRow, markAll);
    return head;
  }

  _renderTabs() {
    const vm = this.viewModel;
    const tabs = el('div', 'q-notif__tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Filtrar notificaciones');

    [
      ['all', 'Todas'],
      ['unread', 'No leídas'],
    ].forEach(([filter, label]) => {
      const tab = el('button', 'q-notif__tab', label);
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.dataset.filter = filter;
      tab.dataset.focusKey = `tab-${filter}`;
      tab.setAttribute('aria-selected', String(vm.filter === filter));
      tab.addEventListener('click', () => void vm.setFilter(filter));
      tabs.appendChild(tab);
    });

    return tabs;
  }

  _renderBody() {
    const vm = this.viewModel;
    const body = el('div', 'q-notif__body');
    body.setAttribute('aria-live', 'polite');
    body.setAttribute('aria-busy', String(vm.status === 'loading'));

    if (vm.status === 'loading' && vm.items.length === 0) {
      for (let i = 0; i < 3; i += 1) body.appendChild(el('div', 'q-notif__skeleton'));
      return body;
    }

    if (vm.status === 'error') {
      const state = el('div', 'q-notif__state q-notif__state--error');
      state.append(
        createIcon('cancel', 'q-notif__state-icon'),
        el('p', 'q-notif__state-title', vm.errorMessage)
      );
      const retry = el('button', 'q-notif__retry', 'Reintentar');
      retry.type = 'button';
      retry.dataset.focusKey = 'retry';
      retry.addEventListener('click', () => void vm.retry());
      state.appendChild(retry);
      body.appendChild(state);
      return body;
    }

    if (vm.items.length === 0) {
      const state = el('div', 'q-notif__state');
      const unread = vm.filter === 'unread';
      state.append(
        createIcon('inbox', 'q-notif__state-icon'),
        el(
          'p',
          'q-notif__state-title',
          unread ? 'Estás al día' : 'Todavía no tienes notificaciones'
        ),
        el(
          'p',
          'q-notif__state-text',
          unread
            ? 'No tienes notificaciones sin leer.'
            : 'Aquí verás tus pedidos, mensajes y novedades de tu cuenta.'
        )
      );
      body.appendChild(state);
      return body;
    }

    const list = el('ul', 'q-notif__list');
    vm.items.forEach((notification) => list.appendChild(this._renderItem(notification)));
    body.appendChild(list);
    if (vm.errorMessage) body.appendChild(el('p', 'q-notif__inline-error', vm.errorMessage));
    return body;
  }

  _renderItem(notification) {
    const unread = !notification.read_at;
    const visual = getNotificationVisual(notification);
    const item = el('li', 'q-notif__entry');

    const button = el('button', `q-notif__item${unread ? ' q-notif__item--unread' : ''}`);
    button.type = 'button';
    button.dataset.notificationId = notification.id;

    const icon = el('span', `q-notif__icon q-notif__icon--${visual.tone}`);
    icon.appendChild(createIcon(visual.icon, 'q-notif__icon-svg'));

    const content = el('span', 'q-notif__content');
    const meta = el('span', 'q-notif__meta');
    meta.appendChild(el('span', 'q-notif__kind', visual.label));
    const time = el('time', 'q-notif__time', formatRelativeTime(notification.created_at));
    time.dateTime = notification.created_at || '';
    time.title = formatFullDateTime(notification.created_at);
    meta.appendChild(time);

    content.append(meta, el('span', 'q-notif__item-title', notification.title || 'Notificación'));
    if (notification.body) content.appendChild(el('span', 'q-notif__item-body', notification.body));

    button.append(icon, content);
    if (unread) {
      const dot = el('span', 'q-notif__dot');
      dot.setAttribute('aria-hidden', 'true');
      button.appendChild(dot);
    }

    const state = unread ? 'Sin leer' : 'Leída';
    const action = notification.action_url ? 'Abrir' : 'Marcar como leída';
    button.setAttribute(
      'aria-label',
      `${state}. ${notification.title}. ${notification.body || ''} ${time.title}. ${action}.`
    );
    button.addEventListener('click', () => void this.viewModel.openNotification(notification));

    item.appendChild(button);
    return item;
  }

  _renderPager() {
    const vm = this.viewModel;
    const pager = el('nav', 'q-notif__pager');
    pager.setAttribute('aria-label', 'Paginación de notificaciones');

    const prev = el('button', 'q-notif__page-btn');
    prev.type = 'button';
    prev.dataset.focusKey = 'page-prev';
    prev.disabled = !vm.canGoBack;
    prev.setAttribute('aria-label', 'Página anterior');
    prev.append(createIcon('chevronLeft', 'q-notif__page-icon'), el('span', '', 'Anterior'));
    prev.addEventListener('click', () => void vm.previousPage());

    const status = el('span', 'q-notif__page-status', `Página ${vm.page} de ${vm.totalPages}`);

    const next = el('button', 'q-notif__page-btn');
    next.type = 'button';
    next.dataset.focusKey = 'page-next';
    next.disabled = !vm.canGoForward;
    next.setAttribute('aria-label', 'Página siguiente');
    next.append(el('span', '', 'Siguiente'), createIcon('chevronRight', 'q-notif__page-icon'));
    next.addEventListener('click', () => void vm.nextPage());

    pager.append(prev, status, next);
    return pager;
  }

  _handleDocumentClick(event) {
    if (this.viewModel.isOpen && this.element && !this.element.contains(event.target)) {
      this.viewModel.close();
    }
  }

  _handleKeydown(event) {
    if (event.key === 'Escape' && this.viewModel.isOpen) {
      this.viewModel.close();
      this._bell?.focus();
    }
  }
}
