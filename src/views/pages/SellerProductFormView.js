import { formatPrice } from '../../utils/formatCurrency.js';
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
    this._stepperEl = null;
  }

  mount(container) {
    this.element = this._buildShell();
    container.appendChild(this.element);

    this._onBeforeUnload = (e) => {
      if (this.viewModel.productId && !this.viewModel.publishedSuccess) {
        e.preventDefault();
        e.returnValue = '';
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
    if (this.element?.parentElement) {
      this.element.remove();
    }
    this.element = null;
    this._bodyEl = null;
    this._stepperEl = null;
  }

  _buildShell() {
    const section = document.createElement('section');
    section.className = 'q-seller-product-form q-section-container';

    const header = document.createElement('header');
    header.className = 'q-seller-product-form__header';

    const back = document.createElement('a');
    back.href = '/seller/products';
    back.dataset.route = '';
    back.className = 'q-seller-product-form__back';
    back.textContent = '← Volver';
    back.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof this.onNavigate === 'function') {
        this.onNavigate('/seller/products');
      }
    });

    const title = document.createElement('h1');
    title.className = 'q-seller-product-form__title';
    title.textContent = 'Nuevo producto';

    this._stepperEl = document.createElement('nav');
    this._stepperEl.className = 'q-seller-product-form__stepper';
    this._stepperEl.setAttribute('aria-label', 'Pasos de creación');

    header.append(back, title, this._stepperEl);

    this._bodyEl = document.createElement('div');
    this._bodyEl.className = 'q-seller-product-form__body';

    section.append(header, this._bodyEl);
    return section;
  }

  _render() {
    if (!this.element) return;

    if (this.viewModel.publishedSuccess) {
      if (typeof this._onBeforeUnload === 'function') {
        window.removeEventListener('beforeunload', this._onBeforeUnload);
      }
      if (typeof this.onNavigate === 'function') {
        this.onNavigate('/seller/products');
      }
      return;
    }

    this._updateStepper();
    this._renderBody();
  }

  _updateStepper() {
    if (!this._stepperEl) return;
    this._stepperEl.replaceChildren();

    const steps = [
      { num: 1, label: '1. Datos' },
      { num: 2, label: '2. Imágenes' },
      { num: 3, label: '3. Publicar' },
    ];

    for (const s of steps) {
      const span = document.createElement('span');
      span.className = 'q-seller-product-form__step';
      if (this.viewModel.step === s.num) {
        span.classList.add('is-active');
      } else if (this.viewModel.step > s.num) {
        span.classList.add('is-complete');
      }
      span.textContent = s.label;
      this._stepperEl.appendChild(span);
    }
  }

  _renderBody() {
    if (!this._bodyEl) return;
    this._bodyEl.replaceChildren();

    if (this.viewModel.step === 1) {
      this._bodyEl.appendChild(this._renderStepForm());
    } else if (this.viewModel.step === 2) {
      this._bodyEl.appendChild(this._renderStepUpload());
    } else if (this.viewModel.step === 3) {
      this._bodyEl.appendChild(this._renderStepPublish());
    }
  }

  _renderStepForm() {
    const panel = document.createElement('div');
    panel.className = 'q-seller-product-form__panel q-glass-panel';

    if (this.viewModel.generalError) {
      const banner = document.createElement('div');
      banner.className = 'q-seller-product-form__error-banner';
      banner.setAttribute('role', 'alert');
      banner.textContent = this.viewModel.generalError;
      panel.appendChild(banner);
    }

    const form = document.createElement('form');
    form.className = 'q-seller-product-form__form';
    form.noValidate = true;

    // 1. Name
    form.appendChild(
      this._createField({
        name: 'name',
        label: 'Nombre del producto',
        type: 'text',
        required: true,
        maxlength: 200,
        value: this.viewModel.form.name,
        error: this.viewModel.fieldErrors.name,
      })
    );

    // 2. Price & Currency row
    const priceRow = document.createElement('div');
    priceRow.className = 'q-seller-product-form__row';

    priceRow.appendChild(
      this._createField({
        name: 'price',
        label: 'Precio',
        type: 'number',
        required: true,
        min: '0.01',
        step: '0.01',
        value: this.viewModel.form.price,
        error: this.viewModel.fieldErrors.price,
      })
    );

    const currencyField = this._createSelectField({
      name: 'currency',
      label: 'Moneda',
      options: CURRENCIES.map((c) => ({ value: c, label: c })),
      value: this.viewModel.form.currency || 'USD',
      error: this.viewModel.fieldErrors.currency,
    });
    priceRow.appendChild(currencyField);
    form.appendChild(priceRow);

    // 3. Category
    const categoryOptions = [
      { value: '', label: 'Selecciona una categoría' },
      ...this.categories.map((c) => ({ value: String(c.id), label: c.name })),
    ];
    form.appendChild(
      this._createSelectField({
        name: 'categoryId',
        label: 'Categoría',
        options: categoryOptions,
        value: this.viewModel.form.categoryId,
        error: this.viewModel.fieldErrors.categoryId,
      })
    );

    // 4. Description
    form.appendChild(
      this._createTextareaField({
        name: 'description',
        label: 'Descripción (opcional)',
        maxlength: 5000,
        rows: 4,
        value: this.viewModel.form.description,
        error: this.viewModel.fieldErrors.description,
      })
    );

    // 5. Stock
    form.appendChild(
      this._createField({
        name: 'stock',
        label: 'Stock inicial',
        type: 'number',
        min: '0',
        step: '1',
        value: this.viewModel.form.stock ?? '0',
        error: this.viewModel.fieldErrors.stock,
      })
    );

    // 6. Attributes JSON
    form.appendChild(
      this._createTextareaField({
        name: 'attributesText',
        label: 'Atributos (JSON opcional)',
        rows: 3,
        value: this.viewModel.form.attributesText,
        error: this.viewModel.fieldErrors.attributesText,
        hint: 'Ej: {"color": "negro", "talla": "M"}',
      })
    );

    // Footer actions
    const footer = document.createElement('div');
    footer.className = 'q-seller-product-form__footer';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'q-btn q-btn--primary q-seller-product-form__submit-btn';
    submitBtn.textContent = this.viewModel.isCreating
      ? 'Creando borrador…'
      : 'Crear borrador y continuar';
    submitBtn.toggleAttribute('disabled', !this.viewModel.canSubmitForm());

    footer.appendChild(submitBtn);
    form.appendChild(footer);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.viewModel.submitForm();
    });

    panel.appendChild(form);
    return panel;
  }

  _renderStepUpload() {
    const panel = document.createElement('div');
    panel.className = 'q-seller-product-form__panel q-glass-panel';

    const heading = document.createElement('h2');
    heading.className = 'q-seller-product-form__subtitle';
    heading.textContent = 'Sube al menos una imagen';

    const description = document.createElement('p');
    description.className = 'q-seller-product-form__desc';
    description.textContent = 'Máximo 5 imágenes, 5 MB cada una. Formatos: JPEG, PNG, WebP.';

    panel.append(heading, description);

    // Upload grid showing current images
    const grid = document.createElement('div');
    grid.className = 'q-seller-product-form__upload-grid';

    for (const img of this.viewModel.images) {
      const thumb = this._makeImageThumbWithDelete(img);
      grid.appendChild(thumb);
    }
    panel.appendChild(grid);

    // Dropzone / File picker
    const dropzone = document.createElement('div');
    dropzone.className = 'q-seller-product-form__dropzone';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.className = 'q-seller-product-form__file-input';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.multiple = true;
    fileInput.style.display = 'none';

    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'q-btn q-btn--outline q-seller-product-form__select-files-btn';
    selectBtn.textContent = 'Seleccionar imágenes';

    if (this.viewModel.uploadLimitReached) {
      fileInput.disabled = true;
      selectBtn.disabled = true;
      const limitMsg = document.createElement('p');
      limitMsg.className = 'q-seller-product-form__limit-msg';
      limitMsg.textContent = 'Has alcanzado el límite máximo de 5 imágenes.';
      dropzone.appendChild(limitMsg);
    } else {
      selectBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        if (fileInput.files?.length) {
          this.viewModel.addFiles(fileInput.files);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('is-dragover');
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
        if (e.dataTransfer?.files?.length) {
          this.viewModel.addFiles(e.dataTransfer.files);
        }
      });
    }

    dropzone.append(selectBtn, fileInput);
    panel.appendChild(dropzone);

    // Uploading progress
    if (this.viewModel.uploadingCount > 0) {
      const progress = document.createElement('div');
      progress.className = 'q-seller-product-form__uploading';
      progress.textContent = `Subiendo ${this.viewModel.uploadingCount} imagen(es)…`;
      panel.appendChild(progress);
    }

    // Upload errors
    if (this.viewModel.uploadErrors.length > 0) {
      const errList = document.createElement('ul');
      errList.className = 'q-seller-product-form__upload-errors';
      for (const err of this.viewModel.uploadErrors) {
        const li = document.createElement('li');
        li.textContent = `${err.filename}: ${err.message}`;
        errList.appendChild(li);
      }
      panel.appendChild(errList);
    }

    // Footer actions
    const footer = document.createElement('div');
    footer.className = 'q-seller-product-form__footer';

    const draftBtn = document.createElement('button');
    draftBtn.type = 'button';
    draftBtn.className = 'q-btn q-btn--outline q-seller-product-form__draft-btn';
    draftBtn.textContent = 'Guardar como borrador';
    draftBtn.addEventListener('click', () => {
      if (typeof this.onNavigate === 'function') {
        this.onNavigate('/seller/products');
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'q-btn q-btn--primary q-seller-product-form__next-btn';
    nextBtn.textContent = 'Siguiente';
    nextBtn.disabled = !this.viewModel.canAdvanceToStep3();
    nextBtn.addEventListener('click', () => {
      this.viewModel.setStep(3);
    });

    footer.append(draftBtn, nextBtn);
    panel.appendChild(footer);

    return panel;
  }

  _renderStepPublish() {
    const panel = document.createElement('div');
    panel.className = 'q-seller-product-form__panel q-glass-panel';

    if (this.viewModel.generalError) {
      const banner = document.createElement('div');
      banner.className = 'q-seller-product-form__error-banner';
      banner.setAttribute('role', 'alert');
      banner.textContent = this.viewModel.generalError;
      panel.appendChild(banner);
    }

    // Review content
    const review = document.createElement('div');
    review.className = 'q-seller-product-form__review';

    const nameEl = document.createElement('h2');
    nameEl.className = 'q-seller-product-form__review-name';
    nameEl.textContent = this.viewModel.form.name;

    const metaRow = document.createElement('div');
    metaRow.className = 'q-seller-product-form__review-meta';

    const priceEl = document.createElement('span');
    priceEl.className = 'q-seller-product-form__review-price';
    priceEl.textContent = formatPrice(
      Number(this.viewModel.form.price),
      this.viewModel.form.currency
    );

    const categoryObj = this.categories.find(
      (c) => String(c.id) === String(this.viewModel.form.categoryId)
    );
    const categoryEl = document.createElement('span');
    categoryEl.className = 'q-seller-product-form__review-category';
    categoryEl.textContent = categoryObj ? categoryObj.name : '';

    metaRow.append(priceEl, categoryEl);

    const descEl = document.createElement('p');
    descEl.className = 'q-seller-product-form__review-description';
    descEl.textContent = this.viewModel.form.description || 'Sin descripción';

    const imagesTitle = document.createElement('h3');
    imagesTitle.className = 'q-seller-product-form__review-images-count';
    imagesTitle.textContent = `${this.viewModel.images.length} imágenes`;

    const imagesGrid = document.createElement('div');
    imagesGrid.className = 'q-seller-product-form__upload-grid';

    for (const img of this.viewModel.images) {
      const thumb = this._makeImageThumbWithDelete(img);
      imagesGrid.appendChild(thumb);
    }

    review.append(nameEl, metaRow, descEl, imagesTitle, imagesGrid);
    panel.appendChild(review);

    // Warning if no images
    if (this.viewModel.images.length === 0) {
      const warnBox = document.createElement('div');
      warnBox.className = 'q-seller-product-form__warning';
      const warnText = document.createElement('p');
      warnText.textContent = 'Necesitas al menos 1 imagen para publicar';
      const backImgBtn = document.createElement('button');
      backImgBtn.type = 'button';
      backImgBtn.className = 'q-btn q-btn--outline q-btn--sm';
      backImgBtn.textContent = 'Volver a imágenes';
      backImgBtn.addEventListener('click', () => this.viewModel.setStep(2));
      warnBox.append(warnText, backImgBtn);
      panel.appendChild(warnBox);
    }

    // Footer actions
    const footer = document.createElement('div');
    footer.className = 'q-seller-product-form__footer';

    const draftBtn = document.createElement('button');
    draftBtn.type = 'button';
    draftBtn.className = 'q-btn q-btn--outline q-seller-product-form__draft-btn';
    draftBtn.textContent = 'Guardar como borrador';
    draftBtn.addEventListener('click', () => {
      if (typeof this.onNavigate === 'function') {
        this.onNavigate('/seller/products');
      }
    });

    const publishBtn = document.createElement('button');
    publishBtn.type = 'button';
    publishBtn.className = 'q-btn q-btn--primary q-btn--lg q-seller-product-form__publish-btn';
    publishBtn.textContent = this.viewModel.isPublishing ? 'Publicando…' : 'Publicar producto';
    publishBtn.disabled = this.viewModel.isPublishing || this.viewModel.images.length === 0;
    publishBtn.addEventListener('click', () => {
      this.viewModel.publish();
    });

    footer.append(draftBtn, publishBtn);
    panel.appendChild(footer);

    return panel;
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
  }) {
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-product-form__field';

    const labelEl = document.createElement('label');
    labelEl.className = 'q-seller-product-form__label';
    labelEl.htmlFor = `field-${name}`;
    labelEl.textContent = label;
    wrap.appendChild(labelEl);

    const input = document.createElement('input');
    input.id = `field-${name}`;
    input.name = name;
    input.type = type;
    input.className = 'q-seller-product-form__input';
    if (required) input.required = true;
    if (min !== undefined) input.min = min;
    if (step !== undefined) input.step = step;
    if (maxlength !== undefined) input.maxLength = maxlength;
    input.value = value;

    input.addEventListener('input', () => {
      this.viewModel.setField(name, input.value);
      this._updateSubmitButtonState();
    });

    wrap.appendChild(input);

    if (error) {
      input.classList.add('is-invalid');
      const errEl = document.createElement('span');
      errEl.className = 'q-seller-product-form__error';
      errEl.textContent = error;
      wrap.appendChild(errEl);
    }

    return wrap;
  }

  _createSelectField({ name, label, options = [], value = '', error }) {
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-product-form__field';

    const labelEl = document.createElement('label');
    labelEl.className = 'q-seller-product-form__label';
    labelEl.htmlFor = `field-${name}`;
    labelEl.textContent = label;
    wrap.appendChild(labelEl);

    const select = document.createElement('select');
    select.id = `field-${name}`;
    select.name = name;
    select.className = 'q-seller-product-form__select';

    for (const opt of options) {
      const optEl = document.createElement('option');
      optEl.value = opt.value;
      optEl.textContent = opt.label;
      if (String(opt.value) === String(value)) {
        optEl.selected = true;
      }
      select.appendChild(optEl);
    }

    select.addEventListener('change', () => {
      this.viewModel.setField(name, select.value);
      this._updateSubmitButtonState();
    });

    wrap.appendChild(select);

    if (error) {
      select.classList.add('is-invalid');
      const errEl = document.createElement('span');
      errEl.className = 'q-seller-product-form__error';
      errEl.textContent = error;
      wrap.appendChild(errEl);
    }

    return wrap;
  }

  _createTextareaField({ name, label, rows = 3, maxlength, value = '', error, hint }) {
    const wrap = document.createElement('div');
    wrap.className = 'q-seller-product-form__field';

    const labelEl = document.createElement('label');
    labelEl.className = 'q-seller-product-form__label';
    labelEl.htmlFor = `field-${name}`;
    labelEl.textContent = label;
    wrap.appendChild(labelEl);

    if (hint) {
      const hintEl = document.createElement('span');
      hintEl.className = 'q-seller-product-form__hint';
      hintEl.textContent = hint;
      wrap.appendChild(hintEl);
    }

    const textarea = document.createElement('textarea');
    textarea.id = `field-${name}`;
    textarea.name = name;
    textarea.rows = rows;
    textarea.className = 'q-seller-product-form__textarea';
    if (maxlength !== undefined) textarea.maxLength = maxlength;
    textarea.value = value;

    textarea.addEventListener('input', () => {
      this.viewModel.setField(name, textarea.value);
      this._updateSubmitButtonState();
    });

    wrap.appendChild(textarea);

    if (error) {
      textarea.classList.add('is-invalid');
      const errEl = document.createElement('span');
      errEl.className = 'q-seller-product-form__error';
      errEl.textContent = error;
      wrap.appendChild(errEl);
    }

    return wrap;
  }

  _updateSubmitButtonState() {
    const submitBtn = this._bodyEl?.querySelector('.q-seller-product-form__submit-btn');
    if (submitBtn) {
      submitBtn.disabled = !this.viewModel.canSubmitForm();
    }
  }

  /**
   * Builds a thumbnail container with the image preview and an inline
   * "¿Eliminar?" confirm affordance (no modal-on-modal).
   *
   * State machine for each thumb:
   *   idle        → shows "×" button
   *   confirming  → shows inline "¿Eliminar? [Sí] [No]"
   *   deleting    → shows "Eliminando…" (buttons disabled)
   *   error       → idle view restored + error text below
   *
   * @param {{ id: string, path: string, alt_text?: string }} img
   * @returns {HTMLElement}
   * @private
   */
  _makeImageThumbWithDelete(img) {
    const thumb = document.createElement('div');
    thumb.className = 'q-seller-product-form__thumb';

    thumb.appendChild(
      createImageWithFallback({
        src: img.path,
        alt: img.alt_text || 'Imagen de producto',
        size: 24,
        placeholderClassName: 'q-seller-product-form__thumb-placeholder',
        label: '',
      })
    );

    // Error text (shown below thumb when imageErrors[id] is set)
    if (this.viewModel.imageErrors && this.viewModel.imageErrors[img.id]) {
      const errEl = document.createElement('p');
      errEl.className = 'q-seller-product-form__image-error';
      errEl.textContent = this.viewModel.imageErrors[img.id];
      thumb.appendChild(errEl);
    }

    // While this exact image is being deleted, show spinner text only
    if (this.viewModel.deletingImageId === img.id) {
      const spinner = document.createElement('span');
      spinner.className = 'q-seller-product-form__image-deleting';
      spinner.textContent = 'Eliminando…';
      thumb.appendChild(spinner);
      return thumb;
    }

    // "×" delete button (idle state)
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'q-seller-product-form__image-remove';
    removeBtn.setAttribute('aria-label', 'Eliminar imagen');
    removeBtn.textContent = '×';
    // Disable if any other deletion is in flight
    removeBtn.disabled = Boolean(this.viewModel.deletingImageId);

    // Inline confirm container (hidden until "×" is clicked)
    const confirmEl = document.createElement('div');
    confirmEl.className = 'q-seller-product-form__image-confirm';
    confirmEl.style.display = 'none';

    const confirmLabel = document.createElement('span');
    confirmLabel.textContent = '¿Eliminar?';

    const yesBtn = document.createElement('button');
    yesBtn.type = 'button';
    yesBtn.textContent = 'Sí';

    const noBtn = document.createElement('button');
    noBtn.type = 'button';
    noBtn.textContent = 'No';

    confirmEl.append(confirmLabel, yesBtn, noBtn);

    // "×" click → show confirm, hide "×"
    removeBtn.addEventListener('click', () => {
      removeBtn.style.display = 'none';
      confirmEl.style.display = '';
    });

    // "No" → hide confirm, show "×"
    noBtn.addEventListener('click', () => {
      confirmEl.style.display = 'none';
      removeBtn.style.display = '';
    });

    // "Sí" → start deletion
    yesBtn.addEventListener('click', async () => {
      yesBtn.disabled = true;
      noBtn.disabled = true;
      confirmLabel.textContent = 'Eliminando…';
      await this.viewModel.deleteImage(img.id);
      // VM notifies → view re-renders; nothing else needed here
    });

    thumb.append(removeBtn, confirmEl);
    return thumb;
  }
}
