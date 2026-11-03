import { OrdersApi } from '../../models/api/OrdersApi.js';
import {
  SHIPPING_FIELDS,
  apiFieldToFormField,
  createEmptyShippingForm,
  toCreateOrderInput,
  validateShippingForm,
} from '../../models/validation/shippingForm.js';
import { cartService as defaultCartService } from '../../services/CartService.js';
import { authStore as defaultAuthStore } from '../../store/authStore.js';
import { cartStore as defaultCartStore } from '../../store/cartStore.js';
import { formatPrice } from '../../utils/formatCurrency.js';

const GENERIC_ERROR = 'No pudimos procesar tu pedido. Inténtalo de nuevo en unos minutos.';

// Failures never clear the cart; the totals shown here follow the same rule as the API.
export class CheckoutViewModel {
  constructor({
    ordersApi = new OrdersApi(),
    cartService = defaultCartService,
    cartStore = defaultCartStore,
    authStore = defaultAuthStore,
  } = {}) {
    this.ordersApi = ordersApi;
    this.cartService = cartService;
    this.cartStore = cartStore;
    this.authStore = authStore;

    this.items = [];
    this.subtotal = 0;
    this.shipping = 0;
    this.total = 0;
    this.itemCount = 0;
    this.isEmpty = true;

    this.form = createEmptyShippingForm({ fullName: this._profileName() });
    this.errors = {};
    this.submitError = '';
    // 'cart' tells the view to offer a link back to the cart.
    this.errorAction = null;
    this.problemProductId = null;
    // First invalid field; the view focuses it once and clears it.
    this.focusField = null;

    this.isLoading = false;
    this.isSubmitting = false;
    this.requiresAuth = false;
    this.loadError = '';
    this.order = null;

    this._listeners = new Set();
    this._storeUnsubscribe = this.cartStore.subscribe?.(() => this.refresh()) ?? null;
    // On a cold start the session only resolves after GET /auth/me.
    this._authUnsubscribe =
      this.authStore.subscribe?.(() => {
        if (this.requiresAuth && this.authStore.isAuthenticated()) void this.load();
      }) ?? null;

    this.refresh({ notify: false });
  }

  get isPlaced() {
    return this.order !== null;
  }

  async load() {
    this.isLoading = true;
    this._notify();

    const result = await this.cartService.loadCart();

    this.requiresAuth = result.status === 'auth-required';
    this.loadError =
      result.status === 'error' ? 'No pudimos cargar tu carrito. Inténtalo de nuevo.' : '';
    if (!this.form.fullName) this.form.fullName = this._profileName();
    this.isLoading = false;
    this.refresh({ notify: false });
    this._notify();
  }

  refresh({ notify = true } = {}) {
    this.items = this.cartStore.getItems().map((item) => {
      const subtotal = Math.round(Number(item.price) * item.quantity * 100) / 100;
      return {
        ...item,
        priceLabel: formatPrice(item.price, item.currency),
        subtotal,
        subtotalLabel: formatPrice(subtotal, item.currency),
      };
    });
    this.subtotal = this.cartStore.getSubtotal();
    this.shipping = this.cartStore.getShipping();
    this.total = this.cartStore.getTotal();
    this.itemCount = this.cartStore.getCount();
    this.isEmpty = this.items.length === 0;

    if (notify) this._notify();
  }

  // Does not notify: re-rendering on every keystroke would steal the input focus.
  setField(name, value) {
    if (!Object.hasOwn(this.form, name)) return;
    this.form[name] = value;
    if (this.errors[name]) delete this.errors[name];
  }

  async submit() {
    if (this.isSubmitting) return { status: 'busy' };

    this.submitError = '';
    this.errorAction = null;
    this.problemProductId = null;

    if (this.isEmpty) {
      this._notify();
      return { status: 'empty' };
    }

    const { isValid, errors } = validateShippingForm(this.form);
    this.errors = errors;
    if (!isValid) {
      this.focusField = SHIPPING_FIELDS.find((field) => Object.hasOwn(errors, field)) ?? null;
      this._notify();
      return { status: 'invalid' };
    }

    this.isSubmitting = true;
    this._notify();

    try {
      const response = await this.ordersApi.createOrder(toCreateOrderInput(this.form));
      this.order = response.data;
      this.isSubmitting = false;
      // The API already emptied the cart; mirror it locally (header badge → 0).
      this.cartStore.clear();
      this.refresh({ notify: false });
      this._notify();
      return { status: 'success', order: this.order };
    } catch (error) {
      this.isSubmitting = false;
      const result = this._handleFailure(error);
      this.refresh({ notify: false });
      this._notify();
      return result;
    }
  }

  getCurrency() {
    return this.items[0]?.currency || 'USD';
  }

  getSubtotalLabel() {
    return formatPrice(this.subtotal, this.getCurrency());
  }

  getShippingLabel() {
    return this.shipping === 0 ? 'Gratis' : formatPrice(this.shipping, this.getCurrency());
  }

  getTotalLabel() {
    return formatPrice(this.total, this.getCurrency());
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  destroy() {
    if (typeof this._storeUnsubscribe === 'function') this._storeUnsubscribe();
    if (typeof this._authUnsubscribe === 'function') this._authUnsubscribe();
    this._storeUnsubscribe = null;
    this._authUnsubscribe = null;
    this._listeners.clear();
  }

  _profileName() {
    return this.authStore.getProfile?.()?.full_name ?? '';
  }

  _handleFailure(error) {
    const code = error?.code;

    // client.js already cleared the session and fired `qatu:auth-expired`.
    if (code === 'SESSION_EXPIRED') return { status: 'auth-expired' };

    if (code === 'EMPTY_CART') {
      this.cartStore.clear();
      return { status: 'empty' };
    }

    if (code === 'INSUFFICIENT_STOCK') {
      const name = this._productNameFromError(error);
      this.submitError = `No hay stock suficiente de "${name}". Revisa tu carrito para ajustar la cantidad o quitarlo.`;
      this.errorAction = 'cart';
      return { status: 'error' };
    }

    if (code === 'PRODUCT_UNAVAILABLE') {
      const name = this._productNameFromError(error);
      this.submitError = `"${name}" ya no está disponible. Quítalo de tu carrito para continuar.`;
      this.errorAction = 'cart';
      return { status: 'error' };
    }

    if (code === 'MIXED_CURRENCIES') {
      this.submitError =
        'Tu carrito mezcla productos con monedas distintas. Compra cada moneda por separado.';
      this.errorAction = 'cart';
      return { status: 'error' };
    }

    if (error?.statusCode === 400 && Array.isArray(error.details) && error.details.length > 0) {
      const fieldErrors = {};
      for (const detail of error.details) {
        const field = apiFieldToFormField(detail.field);
        if (field && !fieldErrors[field]) fieldErrors[field] = detail.message;
      }
      if (Object.keys(fieldErrors).length > 0) {
        this.errors = fieldErrors;
        this.focusField = SHIPPING_FIELDS.find((field) => Object.hasOwn(fieldErrors, field));
        return { status: 'invalid' };
      }
    }

    if (code === 'INVALID_CSRF_TOKEN') {
      this.submitError = 'No pudimos validar tu sesión. Recarga la página e inténtalo de nuevo.';
      return { status: 'error' };
    }

    // Generic on purpose: never leak server internals to the buyer.
    this.submitError = GENERIC_ERROR;
    return { status: 'error' };
  }

  // The API sends `items.<productId>` in details; the message is the fallback.
  _productNameFromError(error) {
    const field = error?.details?.[0]?.field ?? '';
    const productId = field.startsWith('items.') ? field.slice('items.'.length) : null;
    if (productId) {
      this.problemProductId = productId;
      const item = this.cartStore.getItem?.(productId);
      if (item?.name) return item.name;
    }
    const message = error?.message ?? '';
    const noStock = /^Insufficient stock for (.+)$/.exec(message);
    if (noStock) return noStock[1];
    const unavailable = /^(.+) is no longer available$/.exec(message);
    if (unavailable) return unavailable[1];
    return 'un producto de tu carrito';
  }

  _notify() {
    [...this._listeners].forEach((listener) => listener(this));
  }
}
