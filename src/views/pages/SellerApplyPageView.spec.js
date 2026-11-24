import {
  BUSINESS_DESC_MAX,
  BUSINESS_NAME_MAX,
} from '../../models/validation/sellerApplicationValidation.js';
import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import {
  SELLER_PHONE_COUNTRIES,
  SellerApplyViewModel,
} from '../../viewmodels/pages/SellerApplyViewModel.js';
import { SellerApplyPageView } from './SellerApplyPageView.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SellerApplyPageView', () => {
  let container;
  let api;
  let viewModel;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    api = {
      getMyApplication: jasmine.createSpy('getMyApplication').and.resolveTo(null),
      apply: jasmine.createSpy('apply').and.resolveTo({ data: { status: 'pending' } }),
    };
    viewModel = new SellerApplyViewModel({
      sellerApplicationsApi: api,
      authStore: {
        hasRole: () => false,
        getUser: () => ({ id: 'user-1', email: 'buyer@example.com' }),
        getProfile: () => ({ locale: 'es-PE' }),
      },
    });
    view = new SellerApplyPageView({ viewModel });
  });

  afterEach(() => {
    view.destroy();
    container.remove();
  });

  function renderView() {
    container.appendChild(view.render());
    view._unsubscribe = viewModel.subscribe(() => view._update());
  }

  it('renders account email and toggles the required alternate email input', () => {
    renderView();

    const countryNames = Array.from(
      container.querySelectorAll('[name="country_region"] option'),
      (option) => option.textContent.split(' (')[0]
    );
    const accountOption = container.querySelector('[name="email_option"][value="account"]');
    const accountEmail = container.querySelector('#q-apply-account-email');
    const customOption = container.querySelector('[name="email_option"][value="custom"]');
    const customEmail = container.querySelector('[name="custom_contact_email"]');

    expect(accountOption.checked).toBe(true);
    expect(accountEmail.value).toBe('buyer@example.com');
    expect(accountEmail.readOnly).toBe(true);
    expect(customEmail.required).toBe(false);
    expect(customEmail.closest('[data-role="custom-email-field"]').hidden).toBe(true);
    expect(container.querySelectorAll('.q-seller-apply-required').length).toBe(2);
    expect(countryNames).toEqual(
      [...SELLER_PHONE_COUNTRIES]
        .sort((left, right) => left.name.localeCompare(right.name, 'es'))
        .map((country) => `${country.name}`)
    );

    customOption.checked = true;
    customOption.dispatchEvent(new Event('change', { bubbles: true }));
    expect(customEmail.required).toBe(true);
    expect(customEmail.closest('[data-role="custom-email-field"]').hidden).toBe(false);
  });

  it('submits the selected email and separate country and phone fields', async () => {
    renderView();

    const fields = {
      business_name: 'Textiles Cusco',
      business_description: 'Tejidos tradicionales elaborados en lana de alpaca.',
      custom_contact_email: 'contacto@textiles.pe',
    };
    Object.entries(fields).forEach(([name, value]) => {
      const input = container.querySelector(`[name="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const country = container.querySelector('[name="country_region"]');
    country.value = 'PE';
    country.dispatchEvent(new Event('change', { bubbles: true }));

    const phone = container.querySelector('[name="phone_number"]');
    phone.value = '987-654-321';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(phone.value).toBe('987654321');

    const customOption = container.querySelector('[name="email_option"][value="custom"]');
    customOption.checked = true;
    customOption.dispatchEvent(new Event('change', { bubbles: true }));

    container
      .querySelector('.q-seller-apply-form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();

    expect(api.apply).toHaveBeenCalledWith(
      jasmine.objectContaining({
        country_code: '+51',
        phone_number: '987654321',
        contact_email: 'contacto@textiles.pe',
      })
    );
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

  const GATE_TEXT = 'Debes iniciar sesión para postularte como vendedor.';

  function createMockVM(overrides = {}) {
    const vm = {
      isLoading: false,
      isSubmitting: false,
      isAlreadySeller: false,
      application: null,
      formData: {
        business_name: '',
        business_description: '',
        contact_email: '',
        contact_phone: '',
      },
      fieldErrors: {},
      errorMessage: '',
      successMessage: '',
      _listeners: new Set(),
      subscribe(listener) {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
      },
      notify() {
        for (const listener of this._listeners) listener(this);
      },
      loadStatus: jasmine.createSpy('loadStatus').and.resolveTo(),
      setField: jasmine.createSpy('setField').and.callFake((field, value) => {
        vm.formData[field] = value;
        if (vm.fieldErrors[field]) {
          const nextErrors = { ...vm.fieldErrors };
          delete nextErrors[field];
          vm.fieldErrors = nextErrors;
        }
        vm.notify();
      }),
      submit: jasmine.createSpy('submit').and.resolveTo(),
      ...overrides,
    };
    return vm;
  }

  describe('SellerApplyPageView (recovered 1)', () => {
    let container;
    let vm;
    let view;
    let onNavigate;

    const el = (selector) => container.querySelector(selector);

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
      spyOn(authStore, 'isAuthenticated').and.returnValue(true);
      vm = createMockVM();
      onNavigate = jasmine.createSpy('onNavigate');
      view = new SellerApplyPageView({ viewModel: vm, onNavigate });
    });

    afterEach(() => {
      view?.destroy();
      view = null;
      window.sessionStorage.clear();
      window.localStorage.clear();
      container.remove();
    });

    it('renders the accessible shell, both alerts and the form, and loads status once', () => {
      view.mount(container);

      const section = el('.q-seller-apply-page');
      expect(section).not.toBeNull();
      expect(section.getAttribute('aria-labelledby')).toBe('q-seller-apply-heading');
      expect(el('.q-seller-apply-container').classList.contains('q-section-container')).toBe(true);
      expect(el('.q-seller-apply-eyebrow').textContent).toBe('Vende en Q’atu');
      expect(el('#q-seller-apply-heading').tagName.toLowerCase()).toBe('h1');
      expect(el('#q-seller-apply-heading').textContent).toBe('Postularme como vendedor');
      expect(el('.q-seller-apply-subtitle').textContent).toBe(
        'Completa los datos de tu tienda o emprendimiento para que nuestro equipo revise tu solicitud.'
      );
      expect(el('[data-role="status-region"]')).not.toBeNull();
      expect(el('[data-role="form-card"]')).not.toBeNull();

      const form = el('form.q-seller-apply-form');
      expect(form).not.toBeNull();
      expect(form.noValidate).toBe(true);

      const errorAlert = el('.q-seller-apply-alert--error');
      expect(errorAlert.getAttribute('role')).toBe('alert');
      expect(errorAlert.hasAttribute('hidden')).toBe(true);
      expect(errorAlert.textContent).toBe('');

      const successAlert = el('.q-seller-apply-alert--success');
      expect(successAlert.getAttribute('role')).toBe('status');
      expect(successAlert.getAttribute('aria-live')).toBe('polite');
      expect(successAlert.hasAttribute('hidden')).toBe(true);
      expect(successAlert.textContent).toBe('');

      expect(vm.loadStatus).toHaveBeenCalledTimes(1);
      expect(vm._listeners.size).toBe(1);
    });

    it('exposes exact field metadata, submit text and the initial description counter', () => {
      view.mount(container);

      for (const field of [
        {
          selector: '#q-apply-business-name',
          name: 'business_name',
          tag: 'input',
          maxLength: BUSINESS_NAME_MAX,
          required: true,
        },
      ]) {
        const input = el(field.selector);
        expect(input.tagName.toLowerCase()).toBe(field.tag);
        expect(input.name).toBe(field.name);
        expect(input.maxLength).toBe(field.maxLength);
        expect(input.required).toBe(field.required);
        expect(input.getAttribute('aria-describedby')).toBe(`q-apply-error-${field.name}`);
        const errorEl = el(`[data-error-for="${field.name}"]`);
        expect(errorEl.id).toBe(`q-apply-error-${field.name}`);
        expect(errorEl.hasAttribute('hidden')).toBe(true);
      }

      const country = el('#q-apply-country-code');
      expect(country.tagName.toLowerCase()).toBe('select');
      expect(country.name).toBe('country_region');
      expect(country.getAttribute('aria-label')).toBe('País y código de país');
      expect(el('[data-error-for="country_code"]').id).toBe('q-apply-error-country_code');

      const phone = el('#q-apply-phone-number');
      expect(phone.tagName.toLowerCase()).toBe('input');
      expect(phone.name).toBe('phone_number');
      expect(phone.maxLength).toBe(15);
      expect(phone.getAttribute('aria-label')).toBe('Número de teléfono, solo dígitos');
      expect(el('[data-error-for="phone_number"]').id).toBe('q-apply-error-phone_number');

      expect(el('#q-apply-account-email').readOnly).toBe(true);
      const customEmail = el('#q-apply-custom-email');
      expect(customEmail.name).toBe('custom_contact_email');
      expect(customEmail.maxLength).toBe(255);

      const description = el('#q-apply-business-description');
      expect(description.tagName.toLowerCase()).toBe('textarea');
      expect(description.name).toBe('business_description');
      expect(description.rows).toBe(5);
      expect(description.required).toBe(true);
      expect(description.maxLength).toBe(BUSINESS_DESC_MAX);
      expect(description.getAttribute('aria-describedby')).toBe(
        'q-apply-error-business_description'
      );
      const descError = el('[data-error-for="business_description"]');
      expect(descError.id).toBe('q-apply-error-business_description');
      expect(descError.hasAttribute('hidden')).toBe(true);

      const submit = el('.q-seller-apply-submit-btn');
      expect(submit.type).toBe('submit');
      expect(submit.textContent).toBe('Enviar solicitud');
      expect(el('[data-role="desc-counter"]').textContent).toBe(`0 / ${BUSINESS_DESC_MAX}`);
    });

    it('calls setField with exact field/value pairs on input and updates the trimmed counter', () => {
      view.mount(container);

      for (const [selector, field, value] of [
        ['#q-apply-business-name', 'business_name', 'Cerámica Andina'],
        ['#q-apply-custom-email', 'custom_contact_email', 'contacto@mitienda.com'],
        ['#q-apply-phone-number', 'phone_number', '999888777'],
      ]) {
        vm.setField.calls.reset();
        const input = el(selector);
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(vm.setField).toHaveBeenCalledTimes(1);
        expect(vm.setField).toHaveBeenCalledWith(field, value);
      }

      vm.setField.calls.reset();
      const description = '  Textiles Cusco  ';
      const desc = el('#q-apply-business-description');
      desc.value = description;
      desc.dispatchEvent(new Event('input', { bubbles: true }));
      expect(vm.setField).toHaveBeenCalledTimes(1);
      expect(vm.setField).toHaveBeenCalledWith('business_description', description);
      expect(el('[data-role="desc-counter"]').textContent).toBe(
        `${description.trim().length} / ${BUSINESS_DESC_MAX}`
      );

      vm.setField.calls.reset();
      const phone = el('#q-apply-phone-number');
      phone.value = '+51 999';
      phone.dispatchEvent(new Event('input', { bubbles: true }));
      expect(phone.value).toBe('51999');
      expect(vm.setField).toHaveBeenCalledWith('phone_number', '51999');
    });

    it('prevents the native submit and delegates exactly once to the view model', async () => {
      view.mount(container);
      const event = new Event('submit', { bubbles: true, cancelable: true });

      el('form.q-seller-apply-form').dispatchEvent(event);
      await tick();

      expect(event.defaultPrevented).toBe(true);
      expect(vm.submit).toHaveBeenCalledTimes(1);
      expect(vm.submit.calls.mostRecent().args).toEqual([]);
    });

    it('follows the view model messages and clears both alerts', () => {
      view.mount(container);
      const errorAlert = el('.q-seller-apply-alert--error');
      const successAlert = el('.q-seller-apply-alert--success');

      vm.errorMessage = 'Fallo de red';
      vm.successMessage = 'Solicitud enviada correctamente.';
      vm.notify();
      expect(errorAlert.textContent).toBe('Fallo de red');
      expect(errorAlert.hasAttribute('hidden')).toBe(false);
      expect(successAlert.textContent).toBe('Solicitud enviada correctamente.');
      expect(successAlert.hasAttribute('hidden')).toBe(false);

      vm.errorMessage = '';
      vm.successMessage = '';
      vm.notify();
      expect(errorAlert.textContent).toBe('');
      expect(errorAlert.hasAttribute('hidden')).toBe(true);
      expect(successAlert.textContent).toBe('');
      expect(successAlert.hasAttribute('hidden')).toBe(true);
    });

    it('replaces the status region with the loading message and hides the form', () => {
      view.mount(container);
      const statusRegion = el('[data-role="status-region"]');
      const formCard = el('[data-role="form-card"]');

      vm.isLoading = true;
      vm.notify();

      expect(statusRegion.children.length).toBe(1);
      expect(statusRegion.querySelector('.q-seller-apply-loading').textContent).toBe(
        'Verificando estado de tu solicitud…'
      );
      expect(formCard.hasAttribute('hidden')).toBe(true);

      vm.isLoading = false;
      vm.notify();
      expect(statusRegion.children.length).toBe(0);
      expect(formCard.hasAttribute('hidden')).toBe(false);
    });

    it('shows the English already-seller card, navigates and hides the form', () => {
      view.mount(container);

      vm.isAlreadySeller = true;
      vm.notify();

      const card = el('[data-role="status-region"] .q-seller-apply-status-card');
      expect(card.querySelector('.q-seller-apply-status-title').textContent).toBe(
        'You are already a seller'
      );
      expect(card.querySelector('.q-seller-apply-status-text').textContent).toBe(
        'Tu cuenta ya tiene habilitado el rol de vendedor. Puedes gestionar tus productos y ventas desde tu panel.'
      );
      const link = card.querySelector('a');
      expect(link.getAttribute('href')).toBe('/seller/products');
      expect(link.getAttribute('data-route')).toBe('');
      expect(link.textContent).toBe('Ir a Mis Productos');
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(true);

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('/seller/products');
    });

    it('does not throw when an already-seller link is clicked without onNavigate', () => {
      view.onNavigate = null;
      view.mount(container);
      vm.isAlreadySeller = true;
      vm.notify();
      const link = el('[data-role="status-region"] a');
      const guard = (event) => event.preventDefault();
      link.addEventListener('click', guard);

      expect(() =>
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      ).not.toThrow();

      link.removeEventListener('click', guard);
    });

    it('renders the pending card with its badge, English title and business fallback', () => {
      view.mount(container);

      vm.application = { status: 'pending', business_name: 'Textiles Cusco' };
      vm.notify();
      let card = el('[data-role="status-region"] .q-seller-apply-status-card');
      expect(card.querySelector('.q-seller-app-badge').className).toBe(
        'q-seller-app-badge q-seller-app-badge--pending'
      );
      expect(card.querySelector('.q-seller-app-badge').textContent).toBe('Estado: pending');
      expect(card.querySelector('.q-seller-apply-status-title').textContent).toBe(
        'You already have a pending application'
      );
      expect(card.querySelector('.q-seller-apply-status-business').textContent).toBe(
        'Negocio: Textiles Cusco'
      );
      expect(card.querySelector('.q-seller-apply-status-text').textContent).toBe(
        'Tu solicitud se encuentra en revisión por un administrador. Te notificaremos en cuanto sea evaluada.'
      );
      expect(card.querySelector('a')).toBeNull();
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(true);

      vm.application = { status: 'pending' };
      vm.notify();
      card = el('[data-role="status-region"] .q-seller-apply-status-card');
      expect(card.querySelector('.q-seller-apply-status-business').textContent).toBe('Negocio: ');
    });

    it('renders the approved description exactly and reuses the products navigation', () => {
      view.mount(container);

      vm.application = { status: 'approved', business_name: 'Cerámica Andina' };
      vm.notify();

      const card = el('[data-role="status-region"] .q-seller-apply-status-card');
      expect(card.querySelector('.q-seller-app-badge').textContent).toBe('Estado: approved');
      expect(card.querySelector('.q-seller-apply-status-title').textContent).toBe(
        '¡Tu solicitud fue aprobada!'
      );
      expect(card.querySelector('.q-seller-apply-status-text').textContent).toBe(
        'La tienda "Cerámica Andina" ha sido aprobada. Ya puedes comenzar a publicar productos.'
      );
      const link = card.querySelector('a');
      expect(link.getAttribute('href')).toBe('/seller/products');
      expect(link.getAttribute('data-route')).toBe('');
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(true);

      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(onNavigate).toHaveBeenCalledTimes(1);
      expect(onNavigate).toHaveBeenCalledWith('/seller/products');
    });

    it('shows the rejection warning and reason without hiding the form', () => {
      view.mount(container);

      vm.application = { status: 'rejected', rejection_reason: 'Datos incompletos' };
      vm.notify();

      const warning = el('[data-role="status-region"] .q-seller-apply-alert--warning');
      expect(warning.querySelector('strong').textContent).toBe(
        'Tu solicitud anterior fue rechazada.'
      );
      expect(warning.querySelector('.q-seller-apply-rejection-reason').textContent).toBe(
        'Motivo: Datos incompletos'
      );
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(false);

      vm.application = { status: 'rejected' };
      vm.notify();
      expect(el('.q-seller-apply-rejection-reason').textContent).toBe(
        'Puedes corregir tus datos y enviar una nueva solicitud.'
      );
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(false);
    });

    it('marks invalid fields and clears each error when that field receives input', () => {
      view.mount(container);

      vm.fieldErrors = {
        business_name: 'El nombre del negocio es obligatorio.',
        phone_number: 'El teléfono debe contener solo números y no superar los 15 dígitos.',
      };
      vm.notify();

      const nameInput = el('#q-apply-business-name');
      const phoneInput = el('#q-apply-phone-number');
      const nameError = el('[data-error-for="business_name"]');
      const phoneError = el('[data-error-for="phone_number"]');
      expect(nameError.textContent).toBe('El nombre del negocio es obligatorio.');
      expect(nameError.hasAttribute('hidden')).toBe(false);
      expect(nameInput.classList.contains('is-invalid')).toBe(true);
      expect(nameInput.getAttribute('aria-invalid')).toBe('true');
      expect(phoneError.textContent).toBe(
        'El teléfono debe contener solo números y no superar los 15 dígitos.'
      );
      expect(phoneError.hasAttribute('hidden')).toBe(false);
      expect(phoneInput.classList.contains('is-invalid')).toBe(true);

      nameInput.value = 'Cerámica Andina';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(vm.fieldErrors).toEqual({
        phone_number: 'El teléfono debe contener solo números y no superar los 15 dígitos.',
      });
      expect(nameError.textContent).toBe('');
      expect(nameError.hasAttribute('hidden')).toBe(true);
      expect(nameInput.classList.contains('is-invalid')).toBe(false);
      expect(nameInput.hasAttribute('aria-invalid')).toBe(false);
      expect(phoneError.hasAttribute('hidden')).toBe(false);

      phoneInput.value = '999';
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      expect(vm.fieldErrors).toEqual({});
      expect(phoneError.hasAttribute('hidden')).toBe(true);
      expect(phoneInput.hasAttribute('aria-invalid')).toBe(false);
    });

    it('syncs input values from formData and tolerates nullish values', () => {
      view.mount(container);

      vm.formData = {
        business_name: 'Cerámica Andina',
        business_description: 'Tejidos tradicionales de lana de alpaca.',
        country_code: '+591',
        country_region: 'BO',
        phone_number: '71234567',
        email_option: 'custom',
        contact_email: 'contacto@mitienda.com',
        custom_contact_email: 'contacto@mitienda.com',
      };
      vm.notify();

      for (const [selector, value] of [
        ['#q-apply-business-name', 'Cerámica Andina'],
        ['#q-apply-business-description', 'Tejidos tradicionales de lana de alpaca.'],
        ['#q-apply-country-code', 'BO'],
        ['#q-apply-phone-number', '71234567'],
        ['#q-apply-custom-email', 'contacto@mitienda.com'],
      ]) {
        expect(el(selector).value).toBe(value);
      }
      expect(el('[data-role="desc-counter"]').textContent).toBe(
        `${vm.formData.business_description.trim().length} / ${BUSINESS_DESC_MAX}`
      );

      vm.formData.phone_number = null;
      vm.notify();
      expect(el('#q-apply-phone-number').value).toBe('');
    });

    it('disables and relabels the submit button for submitting and loading', () => {
      view.mount(container);
      const submit = el('.q-seller-apply-submit-btn');

      vm.isSubmitting = true;
      vm.notify();
      expect(submit.textContent).toBe('Enviando solicitud…');
      expect(submit.disabled).toBe(true);

      vm.isSubmitting = false;
      vm.isLoading = true;
      vm.notify();
      expect(submit.textContent).toBe('Enviar solicitud');
      expect(submit.disabled).toBe(true);

      vm.isLoading = false;
      vm.notify();
      expect(submit.disabled).toBe(false);
    });

    it('shows the exact unauthenticated gate, records the return path and navigates safely', () => {
      authStore.isAuthenticated.and.returnValue(false);
      spyOn(authRedirectStore, 'setReturnTo');
      view.mount(container);

      expect(vm.loadStatus).not.toHaveBeenCalled();
      const statusRegion = el('[data-role="status-region"]');
      expect(statusRegion.querySelector('p').textContent).toBe(GATE_TEXT);
      const button = statusRegion.querySelector('button');
      expect(button.type).toBe('button');
      expect(button.className).toBe('q-btn q-btn--primary');
      expect(button.textContent).toBe('Iniciar sesión');
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(true);

      button.click();
      expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith('/seller/apply');
      expect(onNavigate).toHaveBeenCalledWith('/login');

      const callsAfterLogin = onNavigate.calls.count();
      view.onNavigate = null;
      expect(() => button.click()).not.toThrow();
      expect(onNavigate.calls.count()).toBe(callsAfterLogin);
    });

    it('uses the global authStore for the gate, not the view model authStore', () => {
      vm.authStore = { isAuthenticated: () => true };
      authStore.isAuthenticated.and.returnValue(false);
      view.mount(container);
      expect(container.textContent).toContain(GATE_TEXT);
      expect(vm.loadStatus).not.toHaveBeenCalled();

      view.destroy();
      container.replaceChildren();
      vm.authStore = { isAuthenticated: () => false };
      authStore.isAuthenticated.and.returnValue(true);
      view = new SellerApplyPageView({ viewModel: vm, onNavigate });
      view.mount(container);
      expect(container.textContent).not.toContain(GATE_TEXT);
      expect(vm.loadStatus).toHaveBeenCalledTimes(1);
    });

    it('loses the unauthenticated gate when the view model notifies afterwards', () => {
      authStore.isAuthenticated.and.returnValue(false);
      view.mount(container);
      expect(container.textContent).toContain(GATE_TEXT);
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(true);

      vm.notify();

      expect(container.textContent).not.toContain(GATE_TEXT);
      expect(el('[data-role="form-card"]').hasAttribute('hidden')).toBe(false);
    });

    it('unsubscribes, removes the DOM, ignores later updates and is safe to destroy twice', () => {
      const mounted = view.mount(container);
      expect(vm._listeners.size).toBe(1);

      view.destroy();

      expect(vm._listeners.size).toBe(0);
      expect(document.body.contains(mounted)).toBe(false);
      expect(container.querySelector('.q-seller-apply-page')).toBeNull();
      expect(view.element).toBeNull();
      expect(() => view.destroy()).not.toThrow();

      const before = mounted.textContent;
      vm.errorMessage = 'No debería aparecer';
      vm.isLoading = true;
      vm.notify();
      expect(mounted.textContent).toBe(before);
    });

    it('returns the same element from render() before and after mount without extra subscriptions', () => {
      const first = view.render();
      expect(view.render()).toBe(first);
      expect(vm._listeners.size).toBe(0);
      expect(view.mount(container)).toBe(first);
      expect(vm._listeners.size).toBe(1);
      expect(view.render()).toBe(first);
    });
  });
})();
