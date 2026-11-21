import { SellerProductFormViewModel } from '../../viewmodels/pages/SellerProductFormViewModel.js';
import { createImageWithFallback } from '../components/ImageWithFallback.js';

const CURRENCIES = ['USD', 'EUR', 'BOB', 'PEN', 'ARS', 'COP', 'MXN', 'BRL'];

export class SellerProductFormView {
  /**
   * @param {Object} [options]
   * @param {SellerProductFormViewModel} [options.viewModel]
   * @param {Array<Object>} [options.categories]
   * @param {Function} [options.onNavigate]
   */
  constructor({
    viewModel = new SellerProductFormViewModel(),
    categories = [],
    onNavigate = null,
  } = {}) {
    this.viewModel = viewModel;
    this.categories = categories.length > 0 ? categories : viewModel.categories || [];
    this.onNavigate = onNavigate;
    this.element = null;
    this._unsubscribe = null;
    this._onBeforeUnload = null;
    this._bodyEl = null;
    this._didNavigateAfterPublish = false;
  }

  mount(container) {
    this.element = this._buildShell();
    container.appendChild(this.element);

    this._onBeforeUnload = (event) => {
      if (this.viewModel.productId && !this.viewModel.publishedSuccess) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', this._onBeforeUnload);
    this._unsubscribe = this.viewModel.subscribe(() => this._render());
    this._render();
  }

  destroy() {
    if (typeof this._onBeforeUnload === 'function') {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
      this._onBeforeUnload = null;
    }
    if (typeof this._unsubscribe === 'function') {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.element?.remove();
    this.element = null;
    this._bodyEl = null;
  }

  _buildShell() {
    const section = document.createElement('section');
    section.className = 'q-seller-product-form q-section-container';

    const header = document.createElement('header');
    header.className = 'q-seller-product-form__header';

    const breadcrumb = document.createElement('nav');
    breadcrumb.className = 'q-seller-product-form__breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Navegación de ruta');
    const crumbs = [
      { label: 'Inicio', href: '/' },
      { label: 'Productos', href: '/seller/products' },
      { label: 'Nuevo producto', current: true },
    ];
    for (const [index, crumb] of crumbs.entries()) {
      if (index > 0) {
        const separator = document.createElement('span');
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = '/';
        breadcrumb.appendChild(separator);
      }
      if (crumb.current) {
        const current = document.createElement('span');
        current.setAttribute('aria-current', 'page');
        current.textContent = crumb.label;
        breadcrumb.appendChild(current);
      } else {
        const link = document.createElement('a');
        link.href = crumb.href;
        link.dataset.route = '';
        link.textContent = crumb.label;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          this._navigate('/seller/products');
        });
        breadcrumb.appendChild(link);
      }
    }

    const heading = document.createElement('div');
    heading.className = 'q-seller-product-form__heading';
    const headingCopy = document.createElement('div');
    headingCopy.className = 'q-seller-product-form__heading-copy';
    const title = document.createElement('h1');
    title.className = 'q-seller-product-form__title';
    title.textContent = 'Nuevo producto';
    const subtitle = document.createElement('p');
    subtitle.className = 'q-seller-product-form__subtitle';
    subtitle.textContent = 'Completa la información para agregar un producto a tu tienda.';
    headingCopy.append(title, subtitle);

    const status = document.createElement('span');
    status.className = 'q-seller-product-form__status';
    status.textContent = 'Borrador';
    heading.append(headingCopy, status);
    header.append(breadcrumb, heading);

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'q-seller-product-form__body';
    section.append(header, this._bodyEl);
    return section;
  }

  _navigate(path) {
    if (typeof this.onNavigate === 'function') this.onNavigate(path);
  }

  _render() {
    if (!this.element) return;
    if (this.viewModel.publishedSuccess) {
      if (this._didNavigateAfterPublish) return;
      this._didNavigateAfterPublish = true;
      if (typeof this._onBeforeUnload === 'function') {
        window.removeEventListener('beforeunload', this._onBeforeUnload);
        this._onBeforeUnload = null;
      }
      this._navigate('/seller/products');
      return;
    }

    this._bodyEl.replaceChildren();
    if (this.viewModel.generalError) {
      const banner = document.createElement('div');
      banner.className = 'q-seller-product-form__error-banner';
      banner.setAttribute('role', 'alert');
      banner.textContent = this.viewModel.generalError;
      this._bodyEl.appendChild(banner);
    }
    this._bodyEl.appendChild(this._renderFormPanel());
    if (this.viewModel.productId) {
      this._bodyEl.append(this._renderImagePanel(), this._renderDraftFooter());
    }
  }

  _renderFormPanel() {
    const locked = Boolean(this.viewModel.productId);
    const panel = document.createElement('section');
    panel.className = 'q-seller-product-form__panel q-glass-panel';

    const form = document.createElement('form');
    form.className = 'q-seller-product-form__form';
    form.noValidate = true;

    const basicSection = document.createElement('section');
    basicSection.className = 'q-seller-product-form__form-section';
    const basicTitle = document.createElement('h2');
    basicTitle.className = 'q-seller-product-form__section-title';
    basicTitle.textContent = 'Información básica';
    basicSection.appendChild(basicTitle);

    basicSection.appendChild(
      this._createField({
        name: 'name',
        label: 'Nombre del producto *',
        required: true,
        maxlength: 200,
        value: this.viewModel.form.name,
        error: this.viewModel.fieldErrors.name,
        disabled: locked,
        hint: 'Entre 3 y 200 caracteres.',
      })
    );

    const slugField = this._createField({
      name: 'slug',
      label: 'URL Slug',
      value: this.viewModel.form.slug,
      error: this.viewModel.fieldErrors.slug,
      disabled: locked,
      hint: 'Vista previa editable; usa minúsculas y guiones.',
    });
    basicSection.appendChild(slugField);

    const categoryOptions = [
      { value: '', label: 'Selecciona una categoría' },
      ...this.categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ];
    basicSection.appendChild(
      this._createSelectField({
        name: 'categoryId',
        label: 'Categoría *',
        required: true,
        options: categoryOptions,
        value: this.viewModel.form.categoryId,
        error: this.viewModel.fieldErrors.categoryId,
        disabled: locked,
      })
    );

    const priceRow = document.createElement('div');
    priceRow.className = 'q-seller-product-form__row';
    priceRow.append(
      this._createField({
        name: 'price',
        label: 'Precio *',
        type: 'number',
        required: true,
        min: '0.01',
        step: '0.01',
        value: this.viewModel.form.price,
        error: this.viewModel.fieldErrors.price,
        disabled: locked,
      }),
      this._createSelectField({
        name: 'currency',
        label: 'Moneda',
        options: CURRENCIES.map((currency) => ({ value: currency, label: currency })),
        value: this.viewModel.form.currency || 'USD',
        error: this.viewModel.fieldErrors.currency,
        disabled: locked,
      }),
      this._createField({
        name: 'stock',
        label: 'Stock inicial',
        type: 'number',
        min: '0',
        step: '1',
        value: this.viewModel.form.stock ?? '0',
        error: this.viewModel.fieldErrors.stock,
        disabled: locked,
      })
    );
    basicSection.appendChild(priceRow);
    form.appendChild(basicSection);

    const descriptionSection = document.createElement('section');
    descriptionSection.className = 'q-seller-product-form__form-section';
    const descriptionTitle = document.createElement('h2');
    descriptionTitle.className = 'q-seller-product-form__section-title';
    descriptionTitle.textContent = 'Descripción';
    descriptionSection.appendChild(descriptionTitle);
    descriptionSection.append(
      this._createTextareaField({
        name: 'description',
        label: 'Descripción',
        maxlength: 5000,
        rows: 5,
        value: this.viewModel.form.description,
        error: this.viewModel.fieldErrors.description,
        disabled: locked,
      }),
      this._createTextareaField({
        name: 'attributesText',
        label: 'Atributos (JSON opcional)',
        rows: 4,
        value: this.viewModel.form.attributesText,
        error: this.viewModel.fieldErrors.attributesText,
        disabled: locked,
        hint: 'Ej: {"color": "negro", "talla": "M"}',
      })
    );
    form.appendChild(descriptionSection);

    if (locked) {
      const notice = document.createElement('p');
      notice.className = 'q-seller-product-form__locked-notice';
      notice.textContent =
        'La información del producto está bloqueada. Podrás editarla más tarde desde el modal de edición en tu lista de productos.';
      panel.append(form, notice);
    } else {
      const footer = document.createElement('div');
      footer.className = 'q-seller-product-form__footer';

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'q-btn q-btn--outline q-seller-product-form__cancel-btn';
      cancelButton.textContent = 'Cancelar';
      cancelButton.addEventListener('click', () => this._navigate('/seller/products'));

      const submitButton = document.createElement('button');
      submitButton.type = 'submit';
      submitButton.className = 'q-btn q-btn--primary q-seller-product-form__submit-btn';
      submitButton.textContent = this.viewModel.isCreating ? 'Creando borrador…' : 'Crear borrador';
      submitButton.disabled = !this.viewModel.canSubmitForm();
      footer.append(cancelButton, submitButton);
      form.appendChild(footer);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        void this.viewModel.submitForm();
      });
      panel.appendChild(form);
    }
    return panel;
  }

  _renderImagePanel() {
    const panel = document.createElement('section');
    panel.className =
      'q-seller-product-form__panel q-glass-panel q-seller-product-form__images-panel';

    const header = document.createElement('div');
    header.className = 'q-seller-product-form__images-header';
    const heading = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'q-seller-product-form__section-title';
    title.textContent = 'Imágenes del producto';
    const description = document.createElement('p');
    description.className = 'q-seller-product-form__desc';
    description.textContent = 'JPEG, PNG, WebP · Máx 5 MB · Hasta 5 imágenes';
    heading.append(title, description);
    const count = document.createElement('span');
    count.className = 'q-seller-product-form__image-count';
    count.textContent = `${this.viewModel.images.length} / 5 imágenes`;
    header.append(heading, count);
    panel.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'q-seller-product-form__upload-grid';
    for (const [index, image] of this.viewModel.images.entries()) {
      grid.appendChild(this._makeImageThumb(image, index === 0));
    }
    panel.appendChild(grid);

    const dropzone = document.createElement('div');
    dropzone.className = 'q-seller-product-form__dropzone';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'q-seller-product-form__file-input';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.multiple = true;
    fileInput.setAttribute('aria-label', 'Seleccionar imágenes del producto');

    const dropzoneText = document.createElement('p');
    dropzoneText.textContent = 'Arrastra tus imágenes aquí o selecciónalas desde tu dispositivo.';
    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'q-btn q-btn--outline q-seller-product-form__select-files-btn';
    selectButton.textContent = 'Seleccionar imágenes';

    const limitReached = this.viewModel.uploadLimitReached;
    fileInput.disabled = limitReached;
    selectButton.disabled = limitReached;
    if (limitReached) {
      const limitMessage = document.createElement('p');
      limitMessage.className = 'q-seller-product-form__limit-msg';
      limitMessage.textContent = 'Has alcanzado el límite máximo de 5 imágenes.';
      dropzone.appendChild(limitMessage);
    } else {
      selectButton.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) void this.viewModel.addFiles(fileInput.files);
      });
      dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('is-dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
      dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('is-dragover');
        if (event.dataTransfer?.files?.length)
          void this.viewModel.addFiles(event.dataTransfer.files);
      });
    }
    dropzone.append(dropzoneText, selectButton, fileInput);
    panel.appendChild(dropzone);

    if (this.viewModel.uploadingCount > 0) {
      const progressWrap = document.createElement('div');
      progressWrap.className = 'q-seller-product-form__uploading';
      const progressText = document.createElement('span');
      progressText.textContent = `Subiendo ${this.viewModel.uploadingCount} imagen(es)…`;
      const progress = document.createElement('progress');
      progress.max = 5;
      progress.value = Math.min(this.viewModel.images.length + this.viewModel.uploadingCount, 5);
      progress.setAttribute('aria-label', 'Progreso de carga de imágenes');
      progressWrap.append(progressText, progress);
      panel.appendChild(progressWrap);
    }

    if (this.viewModel.uploadErrors.length > 0) {
      const errorList = document.createElement('ul');
      errorList.className = 'q-seller-product-form__upload-errors';
      errorList.setAttribute('role', 'alert');
      for (const error of this.viewModel.uploadErrors) {
        const item = document.createElement('li');
        item.textContent = `${error.filename}: ${error.message}`;
        errorList.appendChild(item);
      }
      panel.appendChild(errorList);
    }
    return panel;
  }

  _renderDraftFooter() {
    const footer = document.createElement('div');
    footer.className = 'q-seller-product-form__footer q-seller-product-form__draft-footer';

    const draftButton = document.createElement('button');
    draftButton.type = 'button';
    draftButton.className = 'q-btn q-btn--outline q-seller-product-form__draft-btn';
    draftButton.textContent = 'Guardar como borrador';
    draftButton.addEventListener('click', () => this._navigate('/seller/products'));

    const publishButton = document.createElement('button');
    publishButton.type = 'button';
    publishButton.className = 'q-btn q-btn--primary q-seller-product-form__publish-btn';
    publishButton.textContent = this.viewModel.isPublishing ? 'Publicando…' : 'Publicar producto';
    publishButton.disabled = !this.viewModel.canPublish || this.viewModel.uploadingCount > 0;
    publishButton.addEventListener('click', () => void this.viewModel.publish());

    footer.append(draftButton, publishButton);
    return footer;
  }

  _createField({
    name,
    label,
    type = 'text',
    required = false,
    min,
    step,
    maxlength,
    value = '',
    error,
    disabled = false,
    hint,
  }) {
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-product-form__field';
    wrap.dataset.field = name;

    const labelElement = document.createElement('label');
    labelElement.className = 'q-seller-product-form__label';
    labelElement.htmlFor = `field-${name}`;
    labelElement.textContent = label;
    wrap.appendChild(labelElement);

    const input = document.createElement('input');
    input.id = `field-${name}`;
    input.name = name;
    input.type = type;
    input.className = 'q-seller-product-form__input';
    input.required = required;
    input.disabled = disabled;
    if (min !== undefined) input.min = min;
    if (step !== undefined) input.step = step;
    if (maxlength !== undefined) input.maxLength = maxlength;
    input.value = value;
    if (error) input.classList.add('is-invalid');
    input.addEventListener('input', () => {
      this.viewModel.setField(name, input.value);
      if (name === 'name' && !this.viewModel.slugEdited) {
        const slugInput = this._bodyEl.querySelector('#field-slug');
        if (slugInput) slugInput.value = this.viewModel.form.slug;
      }
      this._updateSubmitButtonState();
    });
    wrap.appendChild(input);

    if (hint) {
      const hintElement = document.createElement('span');
      hintElement.className = 'q-seller-product-form__hint';
      hintElement.textContent = hint;
      wrap.appendChild(hintElement);
    }
    if (error) this._appendFieldError(wrap, error);
    return wrap;
  }

  _createSelectField({
    name,
    label,
    options = [],
    value = '',
    error,
    disabled = false,
    required = false,
  }) {
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-product-form__field';
    wrap.dataset.field = name;

    const labelElement = document.createElement('label');
    labelElement.className = 'q-seller-product-form__label';
    labelElement.htmlFor = `field-${name}`;
    labelElement.textContent = label;
    wrap.appendChild(labelElement);

    const select = document.createElement('select');
    select.id = `field-${name}`;
    select.name = name;
    select.className = 'q-seller-product-form__select';
    select.disabled = disabled;
    select.required = required;
    for (const option of options) {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      optionElement.selected = String(option.value) === String(value);
      select.appendChild(optionElement);
    }
    select.addEventListener('change', () => {
      this.viewModel.setField(name, select.value);
      this._updateSubmitButtonState();
    });
    wrap.appendChild(select);
    if (error) {
      select.classList.add('is-invalid');
      this._appendFieldError(wrap, error);
    }
    return wrap;
  }

  _createTextareaField({
    name,
    label,
    rows = 3,
    maxlength,
    value = '',
    error,
    hint,
    disabled = false,
  }) {
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-product-form__field';
    wrap.dataset.field = name;

    const labelElement = document.createElement('label');
    labelElement.className = 'q-seller-product-form__label';
    labelElement.htmlFor = `field-${name}`;
    labelElement.textContent = label;
    wrap.appendChild(labelElement);
    if (hint) {
      const hintElement = document.createElement('span');
      hintElement.className = 'q-seller-product-form__hint';
      hintElement.textContent = hint;
      wrap.appendChild(hintElement);
    }

    const textarea = document.createElement('textarea');
    textarea.id = `field-${name}`;
    textarea.name = name;
    textarea.rows = rows;
    textarea.className = 'q-seller-product-form__textarea';
    textarea.disabled = disabled;
    if (maxlength !== undefined) textarea.maxLength = maxlength;
    textarea.value = value;
    if (error) textarea.classList.add('is-invalid');
    textarea.addEventListener('input', () => {
      this.viewModel.setField(name, textarea.value);
      if (name === 'description') {
        const counter = wrap.querySelector('.q-seller-product-form__character-count');
        if (counter) counter.textContent = `${textarea.value.length} / 5,000`;
      }
      this._updateSubmitButtonState();
    });
    wrap.appendChild(textarea);

    if (name === 'description') {
      const counter = document.createElement('span');
      counter.className = 'q-seller-product-form__character-count';
      counter.setAttribute('aria-live', 'polite');
      counter.textContent = `${textarea.value.length} / 5,000`;
      wrap.appendChild(counter);
    }
    if (error) this._appendFieldError(wrap, error);
    return wrap;
  }

  _appendFieldError(wrap, message) {
    const error = document.createElement('span');
    error.className = 'q-seller-product-form__error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    wrap.appendChild(error);
  }

  _updateSubmitButtonState() {
    const submitButton = this._bodyEl?.querySelector('.q-seller-product-form__submit-btn');
    if (submitButton) submitButton.disabled = !this.viewModel.canSubmitForm();
  }

  _makeImageThumb(image, isPrimary) {
    const item = document.createElement('div');
    item.className = 'q-seller-product-form__thumb-item';

    const thumb = document.createElement('div');
    thumb.className = 'q-seller-product-form__thumb';
    thumb.appendChild(
      createImageWithFallback({
        src: image.path,
        alt: image.alt_text || 'Imagen de producto',
        size: 24,
        placeholderClassName: 'q-seller-product-form__thumb-placeholder',
        label: '',
      })
    );

    if (isPrimary) {
      const badge = document.createElement('span');
      badge.className = 'q-seller-product-form__primary-badge';
      badge.textContent = 'Principal';
      thumb.appendChild(badge);
    }

    const deleting = this.viewModel.deletingImageId === image.id;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'q-seller-product-form__image-remove';
    removeButton.setAttribute('aria-label', 'Eliminar imagen');
    removeButton.textContent = '×';
    removeButton.disabled = Boolean(this.viewModel.deletingImageId);
    removeButton.hidden = deleting;

    const confirmation = document.createElement('div');
    confirmation.className = 'q-seller-product-form__image-confirm';
    confirmation.hidden = true;
    confirmation.setAttribute('role', 'group');
    confirmation.setAttribute('aria-label', 'Confirmar eliminación de imagen');
    const confirmationText = document.createElement('span');
    confirmationText.textContent = '¿Eliminar?';
    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.textContent = 'Sí';
    confirmButton.setAttribute('aria-label', 'Sí, eliminar imagen');
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'No';
    cancelButton.setAttribute('aria-label', 'No, conservar imagen');
    removeButton.addEventListener('click', () => {
      confirmation.hidden = false;
      removeButton.hidden = true;
      confirmButton.focus();
    });
    cancelButton.addEventListener('click', () => {
      confirmation.hidden = true;
      removeButton.hidden = false;
      removeButton.focus();
    });
    confirmButton.addEventListener('click', async () => {
      confirmButton.disabled = true;
      cancelButton.disabled = true;
      confirmationText.textContent = 'Eliminando…';
      await this.viewModel.deleteImage(image.id);
    });
    confirmation.append(confirmationText, confirmButton, cancelButton);
    thumb.append(removeButton, confirmation);

    if (deleting) {
      const progress = document.createElement('span');
      progress.className = 'q-seller-product-form__image-deleting';
      progress.textContent = 'Eliminando…';
      thumb.appendChild(progress);
    }
    item.appendChild(thumb);

    const imageError = this.viewModel.imageErrors?.[image.id];
    if (imageError) {
      const error = document.createElement('p');
      error.className = 'q-seller-product-form__image-error';
      error.setAttribute('role', 'alert');
      error.textContent = imageError;
      item.appendChild(error);
    }
    return item;
  }
}
