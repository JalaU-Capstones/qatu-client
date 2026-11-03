import {
  COUNTRIES,
  PAYMENT_METHODS,
  SHIPPING_LIMITS,
} from '../../models/validation/shippingForm.js';
import { CheckoutViewModel } from '../../viewmodels/pages/CheckoutViewModel.js';

const FORM_ID = 'q-checkout-form';

const ARROW_ICON = `
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
`;

const CARD_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="3"></rect>
    <line x1="2" y1="10" x2="22" y2="10"></line>
  </svg>
`;

// Typing never re-renders (the ViewModel stores values silently), so inputs keep focus.
export class CheckoutView {
  constructor({ viewModel = new CheckoutViewModel(), onOrderPlaced = null, onLogin = null } = {}) {
    this.viewModel = viewModel;
    this.onOrderPlaced = onOrderPlaced;
    this.onLogin = onLogin;
    this.element = null;
    this._unsubscribe = null;
  }

  render() {
    if (this.element) return this.element;

    const section = document.createElement('section');
    section.className = 'q-checkout';
    section.setAttribute('aria-label', 'Finalizar compra');
    this.element = section;
    this._renderContent();
    return section;
  }

  mount(container) {
    const el = this.render();
    container.appendChild(el);

    this._unsubscribe = this.viewModel.subscribe(() => this._renderContent());
    void this.viewModel.load();

    return el;
  }

  destroy() {
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.viewModel.destroy();
    this.element?.remove();
    this.element = null;
  }

  _renderContent() {
    if (!this.element) return;
    const vm = this.viewModel;
    this.element.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'q-section-container';
    container.appendChild(this._renderHeader());

    if (vm.isPlaced) {
      container.appendChild(
        this._renderMessage({
          title: '¡Pedido realizado!',
          message: 'Estamos preparando tu confirmación…',
        })
      );
    } else if (vm.requiresAuth) {
      container.appendChild(this._renderAuthPrompt());
    } else if (vm.isLoading && vm.isEmpty) {
      container.appendChild(this._renderMessage({ title: 'Cargando tu pedido…' }));
    } else if (vm.isEmpty) {
      container.appendChild(this._renderEmpty());
    } else {
      container.appendChild(this._renderLayout());
    }

    this.element.appendChild(container);
    this._applyFocus();
  }

  _applyFocus() {
    const field = this.viewModel.focusField;
    if (!field) return;
    this.viewModel.focusField = null;
    this.element.querySelector(`#q-checkout-${field}`)?.focus();
  }

  _renderHeader() {
    const header = document.createElement('div');
    header.className = 'q-checkout__header';

    const heading = document.createElement('div');

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-checkout__eyebrow';
    eyebrow.textContent = 'Envío y pago';

    const title = document.createElement('h1');
    title.className = 'q-checkout__title';
    title.textContent = 'Finalizar compra';

    heading.append(eyebrow, title);

    const back = document.createElement('a');
    back.className = 'q-checkout__back';
    back.href = '/cart';
    back.dataset.route = '';
    back.innerHTML = `<span>Volver al carrito</span>${ARROW_ICON}`;

    header.append(heading, back);
    return header;
  }

  _renderMessage({ title, message }) {
    const box = document.createElement('div');
    box.className = 'q-cart__empty';
    box.setAttribute('role', 'status');

    const heading = document.createElement('h2');
    heading.className = 'q-cart__empty-title';
    heading.textContent = title;
    box.appendChild(heading);

    if (message) {
      const text = document.createElement('p');
      text.className = 'q-cart__empty-message';
      text.textContent = message;
      box.appendChild(text);
    }
    return box;
  }

  _renderAuthPrompt() {
    const box = this._renderMessage({
      title: 'Inicia sesión para continuar',
      message: 'Necesitas una cuenta para finalizar tu compra. Tu carrito se guarda en tu cuenta.',
    });

    const login = document.createElement('button');
    login.type = 'button';
    login.className = 'q-btn q-btn--primary q-btn--block';
    login.textContent = 'Iniciar sesión';
    login.addEventListener('click', () => this.onLogin?.());
    box.appendChild(login);
    return box;
  }

  _renderEmpty() {
    const box = this._renderMessage({
      title: 'Tu carrito está vacío',
      message: 'Añade productos a tu carrito para poder finalizar tu compra.',
    });

    const link = document.createElement('a');
    link.className = 'q-btn q-btn--primary q-btn--block';
    link.href = '/products';
    link.dataset.route = '';
    link.textContent = 'Explorar productos';
    box.appendChild(link);
    return box;
  }

  _renderLayout() {
    const layout = document.createElement('div');
    layout.className = 'q-checkout__layout';
    layout.append(this._renderForm(), this._renderSummary());
    return layout;
  }

  // One form wraps both cards; the confirm button lives in the summary (`form` attribute).
  _renderForm() {
    const form = document.createElement('form');
    form.id = FORM_ID;
    form.className = 'q-checkout__main';
    form.noValidate = true;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this._submit();
    });

    form.append(this._renderShippingPanel(), this._renderPaymentPanel());
    return form;
  }

  _renderShippingPanel() {
    const section = this._panel('Datos de envío', 'q-checkout-shipping-title');

    const grid = document.createElement('div');
    grid.className = 'q-checkout__grid';
    grid.append(
      this._field({
        name: 'fullName',
        label: 'Nombre completo',
        placeholder: 'Nombre y apellido',
        autocomplete: 'name',
        maxLength: SHIPPING_LIMITS.fullName.max,
      }),
      this._field({
        name: 'phone',
        label: 'Teléfono',
        type: 'tel',
        placeholder: '71234567',
        autocomplete: 'tel',
        maxLength: SHIPPING_LIMITS.phone.max,
      }),
      this._field({
        name: 'street',
        label: 'Dirección',
        placeholder: 'Av. Arce #123',
        autocomplete: 'address-line1',
        maxLength: SHIPPING_LIMITS.street.max,
      }),
      this._field({
        name: 'city',
        label: 'Ciudad',
        placeholder: 'La Paz',
        autocomplete: 'address-level2',
        maxLength: SHIPPING_LIMITS.city.max,
      }),
      this._countryField(),
      this._field({
        name: 'state',
        label: 'Departamento / Estado / Provincia',
        placeholder: 'La Paz',
        autocomplete: 'address-level1',
        maxLength: SHIPPING_LIMITS.state.max,
        wide: true,
      })
    );

    section.appendChild(grid);
    return section;
  }

  _renderPaymentPanel() {
    const vm = this.viewModel;
    const section = this._panel('Forma de pago', 'q-checkout-payment-title');

    const group = document.createElement('div');
    group.className = 'q-checkout__payments';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', 'q-checkout-payment-title');

    PAYMENT_METHODS.forEach(({ value, label, hint }) => {
      const row = document.createElement('label');
      row.className = 'q-checkout__payment';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'paymentMethod';
      radio.value = value;
      radio.checked = vm.form.paymentMethod === value;
      radio.addEventListener('change', () => vm.setField('paymentMethod', value));

      const text = document.createElement('span');
      text.className = 'q-checkout__payment-label';
      text.textContent = label;

      row.appendChild(radio);
      if (value === 'simulated') {
        const icon = document.createElement('span');
        icon.className = 'q-checkout__payment-icon';
        icon.innerHTML = CARD_ICON;
        row.appendChild(icon);
      }
      row.appendChild(text);
      if (hint) {
        const badge = document.createElement('span');
        badge.className = 'q-checkout__payment-hint';
        badge.textContent = hint;
        row.appendChild(badge);
      }
      group.appendChild(row);
    });

    const note = document.createElement('p');
    note.className = 'q-checkout__note';
    note.textContent = 'No se realizará ningún cobro real en esta demostración.';

    section.append(group, note);
    return section;
  }

  _panel(titleText, titleId) {
    const section = document.createElement('section');
    section.className = 'q-checkout__panel q-glass-panel';
    section.setAttribute('aria-labelledby', titleId);

    const title = document.createElement('h2');
    title.id = titleId;
    title.className = 'q-checkout__panel-title';
    title.textContent = titleText;

    section.appendChild(title);
    return section;
  }

  _field({
    name,
    label,
    type = 'text',
    placeholder = '',
    autocomplete = 'off',
    maxLength,
    wide = false,
  }) {
    const vm = this.viewModel;
    const id = `q-checkout-${name}`;
    const error = vm.errors[name];

    const wrapper = document.createElement('div');
    wrapper.className = `q-checkout__field${wide ? ' q-checkout__field--wide' : ''}`;

    const labelEl = document.createElement('label');
    labelEl.className = 'q-checkout__label';
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.id = id;
    input.name = name;
    input.type = type;
    input.className = `q-checkout__input${error ? ' is-invalid' : ''}`;
    input.value = vm.form[name] ?? '';
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.maxLength = maxLength;
    if (error) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${id}-error`);
    }
    input.addEventListener('input', () => {
      vm.setField(name, input.value);
      this._clearFieldError(input);
    });

    wrapper.append(labelEl, input);
    if (error) wrapper.appendChild(this._fieldError(id, error));
    return wrapper;
  }

  _countryField() {
    const vm = this.viewModel;
    const id = 'q-checkout-country';
    const error = vm.errors.country;

    const wrapper = document.createElement('div');
    wrapper.className = 'q-checkout__field q-checkout__field--wide';

    const labelEl = document.createElement('label');
    labelEl.className = 'q-checkout__label';
    labelEl.htmlFor = id;
    labelEl.textContent = 'País';

    const select = document.createElement('select');
    select.id = id;
    select.name = 'country';
    select.className = `q-checkout__input${error ? ' is-invalid' : ''}`;
    select.autocomplete = 'country';
    if (error) {
      select.setAttribute('aria-invalid', 'true');
      select.setAttribute('aria-describedby', `${id}-error`);
    }

    [{ code: '', name: 'Selecciona un país' }, ...COUNTRIES].forEach(({ code, name }) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      option.selected = vm.form.country === code;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      vm.setField('country', select.value);
      this._clearFieldError(select);
    });

    wrapper.append(labelEl, select);
    if (error) wrapper.appendChild(this._fieldError(id, error));
    return wrapper;
  }

  // Patches the DOM in place: a re-render would drop focus while the user types.
  _clearFieldError(control) {
    if (!control.classList.contains('is-invalid')) return;
    control.classList.remove('is-invalid');
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
    control.parentElement?.querySelector('.q-checkout__error')?.remove();
  }

  _fieldError(id, message) {
    const error = document.createElement('p');
    error.id = `${id}-error`;
    error.className = 'q-checkout__error';
    error.textContent = message;
    return error;
  }

  _renderSummary() {
    const vm = this.viewModel;

    const aside = document.createElement('aside');
    aside.className = 'q-checkout__summary q-glass-panel';
    aside.setAttribute('aria-labelledby', 'q-checkout-summary-title');

    const title = document.createElement('h2');
    title.id = 'q-checkout-summary-title';
    title.className = 'q-checkout__panel-title';
    title.textContent = 'Resumen';

    const list = document.createElement('ul');
    list.className = 'q-checkout__items';
    vm.items.forEach((item) => list.appendChild(this._renderItem(item)));

    const rows = document.createElement('div');
    rows.className = 'q-checkout__rows';
    rows.appendChild(this._row('Subtotal', vm.getSubtotalLabel()));
    const shippingRow = this._row('Envío estándar', vm.getShippingLabel());
    if (vm.shipping === 0) shippingRow.lastChild.classList.add('is-free');
    rows.appendChild(shippingRow);

    const totalRow = this._row('Total', vm.getTotalLabel());
    totalRow.classList.add('q-checkout__row--total');
    rows.appendChild(totalRow);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.setAttribute('form', FORM_ID);
    submit.className = 'q-btn q-btn--primary q-btn--block q-checkout__submit';
    submit.disabled = vm.isSubmitting;
    submit.textContent = vm.isSubmitting ? 'Procesando…' : 'Confirmar pedido';
    submit.setAttribute('aria-busy', String(vm.isSubmitting));

    aside.append(title, list, rows);
    if (vm.loadError) aside.appendChild(this._renderAlert(vm.loadError));
    if (vm.submitError) aside.appendChild(this._renderSubmitError());
    aside.appendChild(submit);
    return aside;
  }

  _renderItem(item) {
    const vm = this.viewModel;
    const li = document.createElement('li');
    li.className = `q-checkout__item${item.productId === vm.problemProductId ? ' is-problem' : ''}`;
    li.dataset.productId = item.productId;

    const name = document.createElement('span');
    name.className = 'q-checkout__item-name';
    name.textContent = item.name;

    const quantity = document.createElement('span');
    quantity.className = 'q-checkout__item-qty';
    quantity.textContent = `× ${item.quantity}`;

    const subtotal = document.createElement('span');
    subtotal.className = 'q-checkout__item-subtotal';
    subtotal.textContent = item.subtotalLabel;

    li.append(this._renderThumb(item), name, quantity, subtotal);
    return li;
  }

  _renderThumb(item) {
    const thumb = document.createElement('div');
    thumb.className = 'q-checkout__thumb';

    const showPlaceholder = () => {
      thumb.innerHTML = '';
      const mark = document.createElement('img');
      mark.src = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url).href;
      mark.alt = '';
      mark.width = 18;
      mark.height = 18;
      thumb.appendChild(mark);
    };

    if (!item.imageUrl) {
      showPlaceholder();
      return thumb;
    }

    const photo = document.createElement('img');
    photo.src = item.imageUrl;
    photo.alt = '';
    photo.loading = 'lazy';
    photo.addEventListener('error', showPlaceholder);
    thumb.appendChild(photo);
    return thumb;
  }

  _row(label, value) {
    const row = document.createElement('div');
    row.className = 'q-checkout__row';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.className = 'q-checkout__row-value';
    valueEl.textContent = value;
    row.append(labelEl, valueEl);
    return row;
  }

  _renderSubmitError() {
    const vm = this.viewModel;
    const alert = this._renderAlert(vm.submitError);

    if (vm.errorAction === 'cart') {
      const link = document.createElement('a');
      link.className = 'q-checkout__alert-link';
      link.href = '/cart';
      link.dataset.route = '';
      link.textContent = 'Revisar carrito';
      alert.appendChild(link);
    }
    return alert;
  }

  _renderAlert(message) {
    const alert = document.createElement('div');
    alert.className = 'q-checkout__alert';
    alert.setAttribute('role', 'alert');
    alert.dataset.testid = 'checkout-error';

    const text = document.createElement('span');
    text.textContent = message;
    alert.appendChild(text);
    return alert;
  }

  async _submit() {
    const result = await this.viewModel.submit();
    if (result.status === 'success') this.onOrderPlaced?.(result.order);
  }
}
