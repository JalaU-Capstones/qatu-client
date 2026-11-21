import { EditProductViewModel } from '../../viewmodels/components/EditProductViewModel.js';
import { createImageWithFallback } from '../components/ImageWithFallback.js';

const CURRENCIES = ['USD', 'EUR', 'BOB', 'PEN', 'ARS', 'COP', 'MXN', 'BRL'];
const ICONS = {
  alert: [
    ['path', { d: 'm10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z' }],
    ['path', { d: 'M12 9v4m0 4h.01' }],
  ],
  arrowLeft: [['path', { d: 'm15 18-6-6 6-6M9 12h12' }]],
  check: [['path', { d: 'm5 12 4 4L19 6' }]],
  image: [
    ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '3' }],
    ['circle', { cx: '8.5', cy: '8.5', r: '1.5' }],
    ['path', { d: 'm21 15-5-5L5 21' }],
  ],
  trash: [['path', { d: 'M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6' }]],
  upload: [
    ['path', { d: 'M12 16V4m-5 5 5-5 5 5' }],
    ['path', { d: 'M20 16.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-3' }],
  ],
};

function createIcon(name, className = '') {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '1.8');
  icon.setAttribute('stroke-linecap', 'round');
  icon.setAttribute('stroke-linejoin', 'round');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  if (className) icon.setAttribute('class', className);

  for (const [tagName, attributes] of ICONS[name] || []) {
    const shape = document.createElementNS(namespace, tagName);
    for (const [attribute, value] of Object.entries(attributes)) {
      shape.setAttribute(attribute, value);
    }
    icon.appendChild(shape);
  }
  return icon;
}

export class EditProductView {
  /**
   * @param {Object} options
   * @param {string} options.productId
   * @param {ProductsApi} options.productsApi
   * @param {CategoriesApi|Object} [options.categoriesApi]
   * @param {EditProductViewModel} [options.viewModel]
   * @param {Function} [options.onNavigate]
   * @param {Function} [options.onDeleteProduct]
   * @param {Function} [options.onSaved]
   */
  constructor({
    productId,
    productsApi,
    categoriesApi = null,
    viewModel = null,
    onNavigate = null,
    onDeleteProduct = null,
    onSaved = null,
  } = {}) {
    this.productId = productId;
    this.productsApi = productsApi;
    this.categoriesApi = categoriesApi;
    this.viewModel = viewModel || new EditProductViewModel({ productsApi, categoriesApi });
    this.onNavigate = onNavigate;
    this.onDeleteProduct = onDeleteProduct;
    this.onSaved = onSaved;
    this.element = null;
    this._unsubscribe = null;
    this._onKeydown = null;
    this._onBeforeUnload = null;
    this._bodyEl = null;
    this._footerEl = null;
    this._showDiscardPrompt = false;
    this._imageAltText = '';
  }

  mount(container) {
    this.element = this._buildShell();
    container.appendChild(this.element);
    this._unsubscribe = this.viewModel.subscribe(() => this._render());
    this._onKeydown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (this._showDiscardPrompt) {
        this._showDiscardPrompt = false;
        this._renderFooter();
      } else if (this.viewModel.isDirty) {
        this._showDiscardPrompt = true;
        this._renderFooter();
      } else {
        this._navigate('/seller/products');
      }
    };
    this._onBeforeUnload = (event) => {
      if (this.viewModel.isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    document.addEventListener('keydown', this._onKeydown);
    window.addEventListener('beforeunload', this._onBeforeUnload);
    this._render();
    void this.viewModel.load(this.productId);
  }

  destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._onKeydown) {
      document.removeEventListener('keydown', this._onKeydown);
      this._onKeydown = null;
    }
    if (this._onBeforeUnload) {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
      this._onBeforeUnload = null;
    }
    this.element?.remove();
    this.element = null;
    this._bodyEl = null;
    this._footerEl = null;
  }

  _buildShell() {
    const section = document.createElement('section');
    section.className = 'q-edit-product';
    section.setAttribute('aria-label', 'Editar producto');

    const header = document.createElement('header');
    header.className = 'q-edit-product__header';
    const breadcrumb = document.createElement('nav');
    breadcrumb.className = 'q-edit-product__breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Migas de pan');
    const crumbs = [
      { label: 'Inicio', href: '/' },
      { label: 'Mis productos', href: '/seller/products' },
      { label: 'Editar producto', current: true },
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
        breadcrumb.appendChild(link);
      }
    }

    const heading = document.createElement('div');
    heading.className = 'q-edit-product__heading';
    const headingCopy = document.createElement('div');
    headingCopy.className = 'q-edit-product__heading-copy';
    const title = document.createElement('h1');
    title.className = 'q-edit-product__title';
    title.textContent = 'Editar producto';
    const subtitle = document.createElement('p');
    subtitle.className = 'q-edit-product__subtitle';
    subtitle.textContent = 'Actualiza la información de tu producto.';
    headingCopy.append(title, subtitle);

    this._statusEl = document.createElement('span');
    this._statusEl.className = 'q-edit-product__status';
    this._statusEl.hidden = true;
    heading.append(headingCopy, this._statusEl);
    header.append(breadcrumb, heading);

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'q-edit-product__body';
    this._footerEl = document.createElement('footer');
    this._footerEl.className = 'q-edit-product__footer';
    section.append(header, this._bodyEl, this._footerEl);
    return section;
  }

  _navigate(path) {
    if (typeof this.onNavigate === 'function') this.onNavigate(path);
  }

  _render() {
    if (!this.element) return;
    this._renderHeader();
    this._renderBody();
    this._renderFooter();
  }

  _renderHeader() {
    const product = this.viewModel.loadedProduct;
    if (!product) {
      this._statusEl.hidden = true;
      return;
    }
    const statuses = {
      published: 'Publicado',
      draft: 'Borrador',
      unpublished: 'No publicado',
    };
    const state = statuses[product.state] || 'Borrador';
    this._statusEl.hidden = false;
    this._statusEl.className = `q-edit-product__status q-edit-product__status--${product.state}`;
    this._statusEl.textContent = state;
  }

  _renderBody() {
    this._bodyEl.replaceChildren();
    const vm = this.viewModel;

    if (vm.isLoading && !vm.loadedProduct) {
      const loading = document.createElement('div');
      loading.className = 'q-edit-product__state';
      loading.setAttribute('role', 'status');
      loading.textContent = 'Cargando producto…';
      this._bodyEl.appendChild(loading);
      return;
    }

    if (vm.errorMessage && !vm.loadedProduct) {
      this._appendAlert(this._bodyEl, vm.errorMessage);
      return;
    }

    if (!vm.loadedProduct) return;

    const form = document.createElement('form');
    form.id = 'edit-product-form';
    form.className = 'q-edit-product__form';
    form.noValidate = true;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this._save();
    });

    form.append(
      this._renderBasicInformation(),
      this._renderDescription(),
      this._renderAttributes(),
      this._renderImages()
    );
    if (vm.errorMessage) this._appendAlert(form, vm.errorMessage);
    if (vm.infoMessage) {
      const info = document.createElement('p');
      info.className = 'q-edit-product__info';
      info.setAttribute('role', 'status');
      info.textContent = vm.infoMessage;
      form.appendChild(info);
    }
    this._bodyEl.appendChild(form);
  }

  _renderBasicInformation() {
    const panel = this._createPanel('Información básica');
    const fields = document.createElement('div');
    fields.className = 'q-edit-product__fields';
    fields.append(
      this._createField({
        name: 'name',
        label: 'Nombre del producto *',
        value: this.viewModel.form.name,
        required: true,
        maxLength: 200,
        hint: 'Entre 3 y 200 caracteres.',
      })
    );

    const categoryOptions = [
      { value: '', label: 'Selecciona una categoría' },
      ...this.viewModel.categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ];
    if (
      this.viewModel.form.categoryId &&
      !this.viewModel.categories.some(
        (category) => String(category.id) === String(this.viewModel.form.categoryId)
      )
    ) {
      categoryOptions.push({
        value: String(this.viewModel.form.categoryId),
        label: 'Categoría actual',
      });
    }
    fields.append(
      this._createSelect({
        name: 'categoryId',
        label: 'Categoría *',
        value: this.viewModel.form.categoryId,
        options: categoryOptions,
        required: true,
      })
    );

    const priceFields = document.createElement('div');
    priceFields.className = 'q-edit-product__fields q-edit-product__fields--numbers';
    priceFields.append(
      this._createField({
        name: 'price',
        label: 'Precio *',
        type: 'number',
        value: this.viewModel.form.price,
        required: true,
        min: '0.01',
        step: '0.01',
      }),
      this._createSelect({
        name: 'currency',
        label: 'Moneda',
        value: this.viewModel.form.currency,
        options: CURRENCIES.map((currency) => ({ value: currency, label: currency })),
        disabled: this.viewModel.loadedProduct.state === 'published',
      }),
      this._createField({
        name: 'stock',
        label: 'Stock',
        type: 'number',
        value: this.viewModel.form.stock,
        min: '0',
        step: '1',
      })
    );
    fields.appendChild(priceFields);

    if (this.viewModel.loadedProduct.state === 'published') {
      const hint = document.createElement('p');
      hint.className = 'q-edit-product__hint q-edit-product__hint--notice';
      hint.textContent = 'La moneda no se puede cambiar mientras el producto esté publicado.';
      fields.appendChild(hint);
    }
    if (this.viewModel.categoryErrorMessage) {
      this._appendAlert(fields, this.viewModel.categoryErrorMessage);
    }
    panel.appendChild(fields);
    return panel;
  }

  _renderDescription() {
    const panel = this._createPanel('Descripción');
    const field = document.createElement('div');
    field.className = 'q-edit-product__field';
    const label = document.createElement('label');
    label.className = 'q-edit-product__label';
    label.htmlFor = 'edit-field-description';
    label.textContent = 'Descripción';
    const textarea = document.createElement('textarea');
    textarea.id = 'edit-field-description';
    textarea.name = 'description';
    textarea.rows = 6;
    textarea.maxLength = 5000;
    textarea.className = 'q-edit-product__textarea';
    textarea.value = this.viewModel.form.description;
    textarea.addEventListener('input', () => {
      this.viewModel.setField('description', textarea.value);
      const counter = field.querySelector('.q-edit-product__character-count');
      counter.textContent = `${textarea.value.length.toLocaleString('es')} / 5,000`;
      this._updateSaveState();
    });
    const counter = document.createElement('span');
    counter.className = 'q-edit-product__character-count';
    counter.setAttribute('aria-live', 'polite');
    counter.textContent = `${textarea.value.length.toLocaleString('es')} / 5,000`;
    field.append(label, textarea, counter);
    panel.appendChild(field);
    return panel;
  }

  _renderAttributes() {
    const panel = this._createPanel('Atributos (JSON opcional)');
    const field = document.createElement('div');
    field.className = 'q-edit-product__field';
    const label = document.createElement('label');
    label.className = 'q-edit-product__label';
    label.htmlFor = 'edit-field-attributes';
    label.textContent = 'Atributos (JSON opcional)';
    const textarea = document.createElement('textarea');
    textarea.id = 'edit-field-attributes';
    textarea.name = 'attributesText';
    textarea.rows = 4;
    textarea.className = 'q-edit-product__textarea q-edit-product__textarea--code';
    textarea.placeholder = '{"color":"rojo","talla":"M"}';
    textarea.value = this.viewModel.form.attributesText;
    textarea.addEventListener('input', () => {
      this.viewModel.setField('attributesText', textarea.value);
      this._updateSaveState();
    });
    const hint = document.createElement('span');
    hint.className = 'q-edit-product__hint';
    hint.textContent = 'Usa un objeto JSON para agregar detalles específicos del producto.';
    field.append(label, textarea, hint);
    panel.appendChild(field);
    return panel;
  }

  _renderImages() {
    const panel = this._createPanel('Imágenes del producto');
    panel.classList.add('q-edit-product__images-panel');

    const header = document.createElement('div');
    header.className = 'q-edit-product__images-header';
    const description = document.createElement('p');
    description.className = 'q-edit-product__hint';
    description.textContent = 'JPEG, PNG o WebP · Máx. 5 MB por imagen';
    const count = document.createElement('span');
    count.className = 'q-edit-product__image-count';
    count.textContent = `${this.viewModel.images.length} / 5 imágenes`;
    header.append(description, count);
    panel.appendChild(header);

    if (this.viewModel.imageErrorMessage) {
      this._appendAlert(panel, this.viewModel.imageErrorMessage);
    } else if (this.viewModel.images.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'q-edit-product__empty-images';
      empty.textContent = 'Aún no hay imágenes para este producto.';
      panel.appendChild(empty);
    }

    if (this.viewModel.images.length > 0) {
      const grid = document.createElement('div');
      grid.className = 'q-edit-product__image-grid';
      for (const [index, image] of this.viewModel.images.entries()) {
        grid.appendChild(this._renderImage(image, index === 0));
      }
      panel.appendChild(grid);
    }

    const dropzone = document.createElement('div');
    dropzone.className = 'q-edit-product__dropzone';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.multiple = true;
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Seleccionar imágenes del producto');
    const altInput = document.createElement('input');
    altInput.type = 'text';
    altInput.maxLength = 200;
    altInput.className = 'q-edit-product__input q-edit-product__alt-input';
    altInput.placeholder = 'Texto alternativo (opcional)';
    altInput.setAttribute('aria-label', 'Texto alternativo para las imágenes');
    altInput.value = this._imageAltText;
    altInput.addEventListener('input', () => {
      this._imageAltText = altInput.value;
    });
    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'q-btn q-btn--outline q-edit-product__upload-btn';
    uploadButton.append(createIcon('upload'), document.createTextNode('Seleccionar imágenes'));
    uploadButton.disabled =
      this.viewModel.images.length >= 5 ||
      this.viewModel.uploadingCount > 0 ||
      Boolean(this.viewModel.imageErrorMessage);
    uploadButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.length) {
        void this.viewModel.addImages(fileInput.files, this._imageAltText);
        fileInput.value = '';
      }
    });
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (event.dataTransfer?.files?.length) {
        void this.viewModel.addImages(event.dataTransfer.files, this._imageAltText);
      }
    });
    const uploadText = document.createElement('p');
    uploadText.textContent = 'Arrastra las imágenes aquí o selecciónalas desde tu dispositivo.';
    dropzone.append(uploadText, altInput, uploadButton, fileInput);
    panel.appendChild(dropzone);

    if (this.viewModel.uploadingCount > 0) {
      const progress = document.createElement('p');
      progress.className = 'q-edit-product__uploading';
      progress.setAttribute('role', 'status');
      progress.textContent = `Subiendo ${this.viewModel.uploadingCount} imagen(es)…`;
      panel.appendChild(progress);
    }
    if (this.viewModel.uploadErrors.length > 0) {
      const errors = document.createElement('ul');
      errors.className = 'q-edit-product__upload-errors';
      errors.setAttribute('role', 'alert');
      for (const error of this.viewModel.uploadErrors) {
        const item = document.createElement('li');
        item.textContent = `${error.filename}: ${error.message}`;
        errors.appendChild(item);
      }
      panel.appendChild(errors);
    }
    return panel;
  }

  _renderImage(image, isPrimary) {
    const item = document.createElement('div');
    item.className = 'q-edit-product__image-item';
    const frame = document.createElement('div');
    frame.className = 'q-edit-product__image-frame';
    frame.appendChild(
      createImageWithFallback({
        src: image.path,
        alt: image.alt_text || 'Imagen del producto',
        size: 32,
        placeholderClassName: 'q-edit-product__image-placeholder',
        label: '',
      })
    );
    if (isPrimary) {
      const badge = document.createElement('span');
      badge.className = 'q-edit-product__primary-badge';
      badge.textContent = 'Principal';
      frame.appendChild(badge);
    }
    item.appendChild(frame);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'q-edit-product__image-remove';
    removeButton.setAttribute('aria-label', `Eliminar imagen ${image.alt_text || ''}`.trim());
    removeButton.appendChild(createIcon('trash'));
    removeButton.disabled = Boolean(this.viewModel.deletingImageId);
    removeButton.addEventListener('click', () => {
      confirmation.hidden = false;
      removeButton.hidden = true;
      confirmButton.focus();
    });
    item.appendChild(removeButton);

    const confirmation = document.createElement('div');
    confirmation.className = 'q-edit-product__image-confirm';
    confirmation.hidden = true;
    confirmation.setAttribute('role', 'group');
    confirmation.setAttribute('aria-label', 'Confirmar eliminación de imagen');
    const message = document.createElement('span');
    message.textContent = '¿Eliminar esta imagen?';
    const controls = document.createElement('div');
    controls.className = 'q-edit-product__image-confirm-actions';
    const confirmButton = document.createElement('button');
    confirmButton.type = 'button';
    confirmButton.className = 'q-btn q-btn--danger q-btn--sm';
    confirmButton.append(createIcon('trash'), document.createTextNode('Eliminar'));
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'q-btn q-btn--outline q-btn--sm';
    cancelButton.textContent = 'Cancelar';
    cancelButton.addEventListener('click', () => {
      confirmation.hidden = true;
      removeButton.hidden = false;
      removeButton.focus();
    });
    confirmButton.addEventListener('click', () => {
      void this.viewModel.deleteImage(image.id);
    });
    controls.append(confirmButton, cancelButton);
    confirmation.append(message, controls);
    item.appendChild(confirmation);

    const imageError = this.viewModel.imageErrors[image.id];
    if (imageError) {
      const error = document.createElement('p');
      error.className = 'q-edit-product__image-error';
      error.setAttribute('role', 'alert');
      error.textContent = imageError;
      item.appendChild(error);
    }
    if (this.viewModel.deletingImageId === image.id) {
      const deleting = document.createElement('span');
      deleting.className = 'q-edit-product__image-deleting';
      deleting.textContent = 'Eliminando…';
      deleting.setAttribute('role', 'status');
      item.appendChild(deleting);
    }
    return item;
  }

  _createPanel(title) {
    const panel = document.createElement('section');
    panel.className = 'q-edit-product__panel q-glass-panel';
    const heading = document.createElement('h2');
    heading.className = 'q-edit-product__section-title';
    heading.textContent = title;
    panel.appendChild(heading);
    return panel;
  }

  _createField({
    name,
    label,
    type = 'text',
    value = '',
    required = false,
    min,
    step,
    maxLength,
    hint,
  }) {
    const field = document.createElement('div');
    field.className = 'q-edit-product__field';
    const labelEl = document.createElement('label');
    labelEl.className = 'q-edit-product__label';
    labelEl.htmlFor = `edit-field-${name}`;
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.id = `edit-field-${name}`;
    input.name = name;
    input.type = type;
    input.value = value;
    input.required = required;
    input.className = 'q-edit-product__input';
    if (min !== undefined) input.min = min;
    if (step !== undefined) input.step = step;
    if (maxLength !== undefined) input.maxLength = maxLength;
    input.addEventListener('input', () => {
      this.viewModel.setField(name, input.value);
      this._updateSaveState();
    });
    field.append(labelEl, input);
    if (hint) {
      const hintEl = document.createElement('span');
      hintEl.className = 'q-edit-product__hint';
      hintEl.textContent = hint;
      field.appendChild(hintEl);
    }
    return field;
  }

  _createSelect({ name, label, value = '', options, disabled = false, required = false }) {
    const field = document.createElement('div');
    field.className = 'q-edit-product__field';
    const labelEl = document.createElement('label');
    labelEl.className = 'q-edit-product__label';
    labelEl.htmlFor = `edit-field-${name}`;
    labelEl.textContent = label;
    const select = document.createElement('select');
    select.id = `edit-field-${name}`;
    select.name = name;
    select.className = 'q-edit-product__select';
    select.disabled = disabled;
    select.required = required;
    for (const option of options) {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      optionEl.selected = String(option.value) === String(value);
      select.appendChild(optionEl);
    }
    select.addEventListener('change', () => {
      this.viewModel.setField(name, select.value);
      this._updateSaveState();
    });
    field.append(labelEl, select);
    return field;
  }

  _appendAlert(container, message) {
    const alert = document.createElement('p');
    alert.className = 'q-edit-product__error';
    alert.setAttribute('role', 'alert');
    alert.append(createIcon('alert'), document.createTextNode(message));
    container.appendChild(alert);
  }

  _renderFooter() {
    this._footerEl.replaceChildren();
    if (this._showDiscardPrompt) {
      const discard = document.createElement('div');
      discard.className = 'q-edit-product__discard';
      const message = document.createElement('p');
      message.textContent = 'Tienes cambios sin guardar. ¿Quieres descartarlos?';
      const keep = document.createElement('button');
      keep.type = 'button';
      keep.className = 'q-btn q-btn--outline';
      keep.textContent = 'Seguir editando';
      keep.addEventListener('click', () => {
        this._showDiscardPrompt = false;
        this._renderFooter();
      });
      const confirm = document.createElement('button');
      confirm.type = 'button';
      confirm.className = 'q-btn q-btn--danger';
      confirm.textContent = 'Descartar cambios';
      confirm.addEventListener('click', () => this._navigate('/seller/products'));
      discard.append(message, keep, confirm);
      this._footerEl.appendChild(discard);
      return;
    }

    const actions = document.createElement('div');
    actions.className = 'q-edit-product__actions';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'q-btn q-btn--outline q-edit-product__delete-btn';
    deleteButton.append(createIcon('trash'), document.createTextNode('Eliminar producto'));
    deleteButton.disabled = !this.viewModel.loadedProduct || this.viewModel.isSaving;
    deleteButton.addEventListener('click', () => {
      if (typeof this.onDeleteProduct === 'function') {
        this.onDeleteProduct(this.viewModel.loadedProduct);
      }
    });

    const actionGroup = document.createElement('div');
    actionGroup.className = 'q-edit-product__action-group';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'q-btn q-btn--outline q-edit-product__cancel-btn';
    cancel.textContent = 'Cancelar';
    cancel.addEventListener('click', () => {
      if (this.viewModel.isDirty) {
        this._showDiscardPrompt = true;
        this._renderFooter();
      } else {
        this._navigate('/seller/products');
      }
    });
    const save = document.createElement('button');
    save.type = 'submit';
    save.setAttribute('form', 'edit-product-form');
    save.dataset.action = 'save';
    save.className = 'q-btn q-btn--primary q-edit-product__save-btn';
    save.append(
      createIcon('check'),
      document.createTextNode(this.viewModel.isSaving ? 'Actualizando…' : 'Actualizar producto')
    );
    save.disabled =
      !this.viewModel.isDirty ||
      this.viewModel.isSaving ||
      this.viewModel.isLoading ||
      this.viewModel.uploadingCount > 0;
    actionGroup.append(cancel, save);
    actions.append(deleteButton, actionGroup);
    this._footerEl.appendChild(actions);
  }

  _updateSaveState() {
    const save = this._footerEl?.querySelector('[data-action="save"]');
    if (save) {
      save.disabled =
        !this.viewModel.isDirty ||
        this.viewModel.isSaving ||
        this.viewModel.isLoading ||
        this.viewModel.uploadingCount > 0;
    }
  }

  async _save() {
    const result = await this.viewModel.save();
    if (result.status !== 'success') return;
    this._showDiscardPrompt = false;
    if (typeof this.onSaved === 'function') this.onSaved(result.product);
    this._navigate('/seller/products');
  }
}
