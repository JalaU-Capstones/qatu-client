import {
  BUSINESS_DESC_MAX,
  BUSINESS_NAME_MAX,
} from '../../models/validation/sellerApplicationValidation.js';
import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { SellerApplyViewModel } from '../../viewmodels/pages/SellerApplyViewModel.js';

export class SellerApplyPageView {
  /**
   * @param {Object} [options]
   * @param {SellerApplyViewModel} [options.viewModel]
   * @param {Function|null} [options.onNavigate]
   */
  constructor({ viewModel = new SellerApplyViewModel(), onNavigate = null } = {}) {
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
      this._renderUnauthenticatedGate();
      return this.element;
    }

    void this.viewModel.loadStatus();
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
    section.className = 'q-seller-apply-page';
    section.setAttribute('aria-labelledby', 'q-seller-apply-heading');

    const container = document.createElement('div');
    container.className = 'q-section-container q-seller-apply-container';

    const header = document.createElement('header');
    header.className = 'q-seller-apply-header';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'q-seller-apply-eyebrow';
    eyebrow.textContent = 'Vende en Q’atu';

    const title = document.createElement('h1');
    title.id = 'q-seller-apply-heading';
    title.className = 'q-seller-apply-title';
    title.textContent = 'Postularme como vendedor';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-seller-apply-subtitle';
    subtitle.textContent =
      'Completa los datos de tu tienda o emprendimiento para que nuestro equipo revise tu solicitud.';

    header.append(eyebrow, title, subtitle);

    const statusRegion = document.createElement('div');
    statusRegion.dataset.role = 'status-region';

    const errorAlert = document.createElement('div');
    errorAlert.className = 'q-seller-apply-alert q-seller-apply-alert--error';
    errorAlert.setAttribute('role', 'alert');
    errorAlert.setAttribute('hidden', '');

    const successAlert = document.createElement('div');
    successAlert.className = 'q-seller-apply-alert q-seller-apply-alert--success';
    successAlert.setAttribute('role', 'status');
    successAlert.setAttribute('aria-live', 'polite');
    successAlert.setAttribute('hidden', '');

    const formCard = document.createElement('div');
    formCard.className = 'q-seller-apply-card';
    formCard.dataset.role = 'form-card';
    formCard.appendChild(this._buildForm());

    container.append(header, errorAlert, successAlert, statusRegion, formCard);
    section.appendChild(container);
    this.element = section;
    this._update();
    return section;
  }

  _buildForm() {
    const form = document.createElement('form');
    form.className = 'q-seller-apply-form';
    form.noValidate = true;

    // Business Name
    const nameField = this._createInputField({
      id: 'q-apply-business-name',
      name: 'business_name',
      label: 'Nombre del negocio o tienda *',
      type: 'text',
      placeholder: 'Ej. Cerámica Andina',
      maxLength: BUSINESS_NAME_MAX,
      required: true,
    });

    const descField = document.createElement('div');
    descField.className = 'q-seller-apply-field';

    const descLabelRow = document.createElement('div');
    descLabelRow.className = 'q-seller-apply-label-row';

    const descLabel = document.createElement('label');
    descLabel.className = 'q-seller-apply-label';
    descLabel.htmlFor = 'q-apply-business-description';
    descLabel.textContent = 'Descripción del negocio *';

    const descCounter = document.createElement('span');
    descCounter.className = 'q-seller-apply-counter';
    descCounter.dataset.role = 'desc-counter';
    descCounter.textContent = `0 / ${BUSINESS_DESC_MAX}`;

    descLabelRow.append(descLabel, descCounter);

    const descInput = document.createElement('textarea');
    descInput.id = 'q-apply-business-description';
    descInput.name = 'business_description';
    descInput.className = 'q-seller-apply-textarea';
    descInput.rows = 5;
    descInput.required = true;
    descInput.placeholder =
      'Cuéntanos qué productos deseas ofrecer, su origen y tu experiencia vendiendo (mínimo 20 caracteres).';
    descInput.setAttribute('aria-describedby', 'q-apply-error-business_description');
    descInput.addEventListener('input', (e) => {
      this.viewModel.setField('business_description', e.target.value);
    });

    const descError = document.createElement('p');
    descError.id = 'q-apply-error-business_description';
    descError.className = 'q-seller-apply-field-error';
    descError.dataset.errorFor = 'business_description';
    descError.setAttribute('hidden', '');

    descField.append(descLabelRow, descInput, descError);

    const emailField = this._createInputField({
      id: 'q-apply-contact-email',
      name: 'contact_email',
      label: 'Correo de contacto (opcional)',
      type: 'email',
      placeholder: 'contacto@mitienda.com',
      maxLength: 255,
      required: false,
    });

    const phoneField = this._createInputField({
      id: 'q-apply-contact-phone',
      name: 'contact_phone',
      label: 'Teléfono de contacto (opcional)',
      type: 'tel',
      placeholder: '+51 999 888 777',
      maxLength: 40,
      required: false,
    });

    const actions = document.createElement('div');
    actions.className = 'q-seller-apply-actions';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'q-btn q-btn--primary q-seller-apply-submit-btn';
    submitBtn.textContent = 'Enviar solicitud';

    actions.appendChild(submitBtn);

    form.append(nameField, descField, emailField, phoneField, actions);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.viewModel.submit();
    });

    return form;
  }

  _createInputField({ id, name, label, type, placeholder, maxLength, required }) {
    const field = document.createElement('div');
    field.className = 'q-seller-apply-field';

    const labelEl = document.createElement('label');
    labelEl.className = 'q-seller-apply-label';
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.id = id;
    input.name = name;
    input.type = type;
    input.className = 'q-seller-apply-input';
    input.placeholder = placeholder;
    if (maxLength) input.maxLength = maxLength;
    if (required) input.required = true;
    input.setAttribute('aria-describedby', `q-apply-error-${name}`);
    input.addEventListener('input', (e) => {
      this.viewModel.setField(name, e.target.value);
    });

    const errorEl = document.createElement('p');
    errorEl.id = `q-apply-error-${name}`;
    errorEl.className = 'q-seller-apply-field-error';
    errorEl.dataset.errorFor = name;
    errorEl.setAttribute('hidden', '');

    field.append(labelEl, input, errorEl);
    return field;
  }

  _update() {
    if (!this.element) return;
    const vm = this.viewModel;

    const errorAlert = this.element.querySelector('.q-seller-apply-alert--error');
    const successAlert = this.element.querySelector('.q-seller-apply-alert--success');
    const statusRegion = this.element.querySelector('[data-role="status-region"]');
    const formCard = this.element.querySelector('[data-role="form-card"]');

    if (errorAlert) {
      if (vm.errorMessage) {
        errorAlert.textContent = vm.errorMessage;
        errorAlert.removeAttribute('hidden');
      } else {
        errorAlert.textContent = '';
        errorAlert.setAttribute('hidden', '');
      }
    }

    if (successAlert) {
      if (vm.successMessage) {
        successAlert.textContent = vm.successMessage;
        successAlert.removeAttribute('hidden');
      } else {
        successAlert.textContent = '';
        successAlert.setAttribute('hidden', '');
      }
    }

    if (statusRegion) {
      statusRegion.replaceChildren();
      if (vm.isLoading) {
        const loading = document.createElement('p');
        loading.className = 'q-seller-apply-loading';
        loading.textContent = 'Verificando estado de tu solicitud…';
        statusRegion.appendChild(loading);
      } else if (vm.isAlreadySeller) {
        statusRegion.appendChild(this._buildAlreadySellerCard());
      } else if (vm.application?.status === 'pending') {
        statusRegion.appendChild(this._buildPendingCard(vm.application));
      } else if (vm.application?.status === 'approved') {
        statusRegion.appendChild(this._buildApprovedCard(vm.application));
      } else if (vm.application?.status === 'rejected') {
        statusRegion.appendChild(this._buildRejectedNotice(vm.application));
      }
    }

    const shouldShowForm =
      !vm.isLoading &&
      !vm.isAlreadySeller &&
      vm.application?.status !== 'pending' &&
      vm.application?.status !== 'approved';

    if (formCard) {
      if (shouldShowForm) {
        formCard.removeAttribute('hidden');
      } else {
        formCard.setAttribute('hidden', '');
      }
    }

    for (const fieldName of [
      'business_name',
      'business_description',
      'contact_email',
      'contact_phone',
    ]) {
      const input = this.element.querySelector(`[name="${fieldName}"]`);
      if (input && input.value !== (vm.formData[fieldName] ?? '')) {
        input.value = vm.formData[fieldName] ?? '';
      }
      const errEl = this.element.querySelector(`[data-error-for="${fieldName}"]`);
      const errMsg = vm.fieldErrors[fieldName];
      if (errEl) {
        if (errMsg) {
          errEl.textContent = errMsg;
          errEl.removeAttribute('hidden');
        } else {
          errEl.textContent = '';
          errEl.setAttribute('hidden', '');
        }
      }
      if (input) {
        input.classList.toggle('is-invalid', Boolean(errMsg));
        if (errMsg) {
          input.setAttribute('aria-invalid', 'true');
        } else {
          input.removeAttribute('aria-invalid');
        }
      }
    }

    const descCounter = this.element.querySelector('[data-role="desc-counter"]');
    if (descCounter) {
      const len = (vm.formData.business_description || '').trim().length;
      descCounter.textContent = `${len} / ${BUSINESS_DESC_MAX}`;
    }

    const submitBtn = this.element.querySelector('.q-seller-apply-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = vm.isSubmitting || vm.isLoading;
      submitBtn.textContent = vm.isSubmitting ? 'Enviando solicitud…' : 'Enviar solicitud';
    }
  }

  _buildAlreadySellerCard() {
    const card = document.createElement('div');
    card.className = 'q-seller-apply-card q-seller-apply-status-card';

    const title = document.createElement('h2');
    title.className = 'q-seller-apply-status-title';
    title.textContent = 'You are already a seller';

    const desc = document.createElement('p');
    desc.className = 'q-seller-apply-status-text';
    desc.textContent =
      'Tu cuenta ya tiene habilitado el rol de vendedor. Puedes gestionar tus productos y ventas desde tu panel.';

    const link = document.createElement('a');
    link.href = '/seller/products';
    link.dataset.route = '';
    link.className = 'q-btn q-btn--primary';
    link.textContent = 'Ir a Mis Productos';
    link.addEventListener('click', (e) => {
      if (typeof this.onNavigate === 'function') {
        e.preventDefault();
        this.onNavigate('/seller/products');
      }
    });

    card.append(title, desc, link);
    return card;
  }

  _buildPendingCard(application) {
    const card = document.createElement('div');
    card.className = 'q-seller-apply-card q-seller-apply-status-card';

    const badge = document.createElement('span');
    badge.className = 'q-seller-app-badge q-seller-app-badge--pending';
    badge.textContent = 'Estado: pending';

    const title = document.createElement('h2');
    title.className = 'q-seller-apply-status-title';
    title.textContent = 'You already have a pending application';

    const business = document.createElement('p');
    business.className = 'q-seller-apply-status-business';
    business.textContent = `Negocio: ${application.business_name || ''}`;

    const desc = document.createElement('p');
    desc.className = 'q-seller-apply-status-text';
    desc.textContent =
      'Tu solicitud se encuentra en revisión por un administrador. Te notificaremos en cuanto sea evaluada.';

    card.append(badge, title, business, desc);
    return card;
  }

  _buildApprovedCard(application) {
    const card = document.createElement('div');
    card.className = 'q-seller-apply-card q-seller-apply-status-card';

    const badge = document.createElement('span');
    badge.className = 'q-seller-app-badge q-seller-app-badge--approved';
    badge.textContent = 'Estado: approved';

    const title = document.createElement('h2');
    title.className = 'q-seller-apply-status-title';
    title.textContent = '¡Tu solicitud fue aprobada!';

    const desc = document.createElement('p');
    desc.className = 'q-seller-apply-status-text';
    desc.textContent = `La tienda "${application.business_name || ''}" ha sido aprobada. Ya puedes comenzar a publicar productos.`;

    const link = document.createElement('a');
    link.href = '/seller/products';
    link.dataset.route = '';
    link.className = 'q-btn q-btn--primary';
    link.textContent = 'Ir a Mis Productos';
    link.addEventListener('click', (e) => {
      if (typeof this.onNavigate === 'function') {
        e.preventDefault();
        this.onNavigate('/seller/products');
      }
    });

    card.append(badge, title, desc, link);
    return card;
  }

  _buildRejectedNotice(application) {
    const box = document.createElement('div');
    box.className = 'q-seller-apply-alert q-seller-apply-alert--warning';

    const heading = document.createElement('strong');
    heading.textContent = 'Tu solicitud anterior fue rechazada.';

    const reason = document.createElement('p');
    reason.className = 'q-seller-apply-rejection-reason';
    reason.textContent = application.rejection_reason
      ? `Motivo: ${application.rejection_reason}`
      : 'Puedes corregir tus datos y enviar una nueva solicitud.';

    box.append(heading, reason);
    return box;
  }

  _renderUnauthenticatedGate() {
    const statusRegion = this.element?.querySelector('[data-role="status-region"]');
    const formCard = this.element?.querySelector('[data-role="form-card"]');
    if (formCard) formCard.setAttribute('hidden', '');
    if (!statusRegion) return;

    statusRegion.replaceChildren();
    const card = document.createElement('div');
    card.className = 'q-seller-apply-card q-seller-apply-status-card';

    const p = document.createElement('p');
    p.textContent = 'Debes iniciar sesión para postularte como vendedor.';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'q-btn q-btn--primary';
    btn.textContent = 'Iniciar sesión';
    btn.addEventListener('click', () => {
      authRedirectStore.setReturnTo('/seller/apply');
      if (typeof this.onNavigate === 'function') this.onNavigate('/login');
    });

    card.append(p, btn);
    statusRegion.appendChild(card);
  }
}
