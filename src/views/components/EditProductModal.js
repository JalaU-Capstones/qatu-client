import { EditProductViewModel } from '../../viewmodels/components/EditProductViewModel.js';
import { ModalView } from './ModalView.js';

const CURRENCIES = ['USD', 'EUR', 'BOB', 'PEN', 'ARS', 'COP', 'MXN', 'BRL'];

export class EditProductModal {
  /**
   * @param {Object} options
   * @param {string} options.productId
   * @param {ProductsApi} options.productsApi
   * @param {CategoriesApi|Object} [options.categoriesApi=null]
   * @param {Function} [options.onSaved] Called with the updated DTO on save success
   * @param {'sm'|'md'|'lg'} [options.size='md']
   */
  constructor({ productId, productsApi, categoriesApi = null, onSaved = null, size = 'md' } = {}) {
    this.productId = productId;
    this.productsApi = productsApi;
    this.categoriesApi = categoriesApi;
    this.onSaved = onSaved;
    this.size = size;

    this.viewModel = new EditProductViewModel({
      productsApi: this.productsApi,
      categoriesApi: this.categoriesApi,
    });

    this._modal = null;
    this._bodyContainer = null;
    this._footerContainer = null;
    this._unsubscribe = null;
    this._onKeydown = null;

    this._saved = false;
    this._savedProduct = null;
    this._showDiscardPrompt = false;
  }

  /**
   * Opens the modal. Loads the product, renders the form.
   * Resolves with { saved: boolean, product?: DTO } when the modal closes.
   * @returns {Promise<{ saved: boolean, product?: Object }>}
   */
  async open() {
    this._bodyContainer = document.createElement('div');
    this._bodyContainer.className = 'q-edit-product-modal__body-wrap';

    this._footerContainer = document.createElement('div');
    this._footerContainer.className = 'q-edit-product-modal__footer-wrap';

    this._modal = new ModalView({
      title: 'Editar producto',
      body: this._bodyContainer,
      footer: this._footerContainer,
      size: this.size,
      closeOnBackdropClick: false,
      closeOnEsc: false,
    });

    this._unsubscribe = this.viewModel.subscribe(() => {
      this._render();
    });

    this._onKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this._showDiscardPrompt) {
          this._showDiscardPrompt = false;
          this._render();
        } else if (this.viewModel.isDirty) {
          this._showDiscardPrompt = true;
          this._render();
        } else {
          this._modal.close();
        }
      }
    };
    document.addEventListener('keydown', this._onKeydown);

    this._render();

    const modalPromise = this._modal.open();
    const loadPromise = this.viewModel.load(this.productId);

    await Promise.all([modalPromise, loadPromise]);

    this.destroy();

    return {
      saved: this._saved,
      product: this._savedProduct,
    };
  }

  /**
   * Cleans up listeners and DOM elements.
   */
  destroy() {
    if (this._onKeydown) {
      document.removeEventListener('keydown', this._onKeydown);
      this._onKeydown = null;
    }
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._modal) {
      this._modal.destroy();
      this._modal = null;
    }
  }

  /**
   * Re-renders the contents of body and footer containers based on ViewModel state.
   * @private
   */
  _render() {
    if (!this._bodyContainer || !this._footerContainer) return;

    this._renderBody();
    this._renderFooter();
  }

  /**
   * @private
   */
  _renderBody() {
    this._bodyContainer.replaceChildren();

    const vm = this.viewModel;

    if (vm.isLoading && !vm.loadedProduct) {
      const loading = document.createElement('div');
      loading.className = 'q-edit-product-modal__loading';
      loading.setAttribute('role', 'status');
      loading.textContent = 'Cargando producto…';
      this._bodyContainer.appendChild(loading);
      return;
    }

    if (vm.errorMessage && !vm.loadedProduct) {
      const errorBox = document.createElement('div');
      errorBox.className = 'q-edit-product-modal__error';
      errorBox.setAttribute('role', 'alert');
      errorBox.textContent = vm.errorMessage;
      this._bodyContainer.appendChild(errorBox);
      return;
    }

    const form = document.createElement('form');
    form.className = 'q-edit-product-modal__form';
    form.noValidate = true;

    // 1. Name
    const nameWrap = document.createElement('div');
    nameWrap.className = 'q-form-field';
    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'edit-field-name';
    nameLabel.className = 'q-form-label';
    nameLabel.textContent = 'Nombre del producto';
    const nameInput = document.createElement('input');
    nameInput.id = 'edit-field-name';
    nameInput.name = 'name';
    nameInput.type = 'text';
    nameInput.required = true;
    nameInput.className = 'q-form-input';
    nameInput.value = vm.form.name;
    nameInput.addEventListener('input', () => {
      vm.setField('name', nameInput.value);
      this._updateSaveButtonState();
    });
    nameWrap.append(nameLabel, nameInput);
    form.appendChild(nameWrap);

    // 2. Price and Stock row
    const numberRow = document.createElement('div');
    numberRow.className = 'q-form-row';

    const priceWrap = document.createElement('div');
    priceWrap.className = 'q-form-field';
    const priceLabel = document.createElement('label');
    priceLabel.htmlFor = 'edit-field-price';
    priceLabel.className = 'q-form-label';
    priceLabel.textContent = 'Precio';
    const priceInput = document.createElement('input');
    priceInput.id = 'edit-field-price';
    priceInput.name = 'price';
    priceInput.type = 'number';
    priceInput.min = '0.01';
    priceInput.step = '0.01';
    priceInput.required = true;
    priceInput.className = 'q-form-input';
    priceInput.value = vm.form.price;
    priceInput.addEventListener('input', () => {
      vm.setField('price', priceInput.value);
      this._updateSaveButtonState();
    });
    priceWrap.append(priceLabel, priceInput);

    const stockWrap = document.createElement('div');
    stockWrap.className = 'q-form-field';
    const stockLabel = document.createElement('label');
    stockLabel.htmlFor = 'edit-field-stock';
    stockLabel.className = 'q-form-label';
    stockLabel.textContent = 'Stock';
    const stockInput = document.createElement('input');
    stockInput.id = 'edit-field-stock';
    stockInput.name = 'stock';
    stockInput.type = 'number';
    stockInput.min = '0';
    stockInput.step = '1';
    stockInput.className = 'q-form-input';
    stockInput.value = vm.form.stock;
    stockInput.addEventListener('input', () => {
      vm.setField('stock', stockInput.value);
      this._updateSaveButtonState();
    });
    stockWrap.append(stockLabel, stockInput);

    numberRow.append(priceWrap, stockWrap);
    form.appendChild(numberRow);

    // 3. Currency and Category row
    const selectRow = document.createElement('div');
    selectRow.className = 'q-form-row';

    const currencyWrap = document.createElement('div');
    currencyWrap.className = 'q-form-field';
    const currencyLabel = document.createElement('label');
    currencyLabel.htmlFor = 'edit-field-currency';
    currencyLabel.className = 'q-form-label';
    currencyLabel.textContent = 'Moneda';
    const currencySelect = document.createElement('select');
    currencySelect.id = 'edit-field-currency';
    currencySelect.name = 'currency';
    currencySelect.className = 'q-form-select';

    for (const c of CURRENCIES) {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === vm.form.currency) opt.selected = true;
      currencySelect.appendChild(opt);
    }

    const isPublished = vm.loadedProduct?.state === 'published';
    if (isPublished) {
      currencySelect.disabled = true;
    }

    currencySelect.addEventListener('change', () => {
      vm.setField('currency', currencySelect.value);
      this._updateSaveButtonState();
    });
    currencyWrap.append(currencyLabel, currencySelect);

    if (isPublished) {
      const currencyHint = document.createElement('small');
      currencyHint.className = 'q-form-hint q-form-hint--warning';
      currencyHint.textContent =
        'No puedes cambiar la moneda de un producto publicado. Despublícalo primero.';
      currencyWrap.appendChild(currencyHint);
    }

    const categoryWrap = document.createElement('div');
    categoryWrap.className = 'q-form-field';
    const categoryLabel = document.createElement('label');
    categoryLabel.htmlFor = 'edit-field-category';
    categoryLabel.className = 'q-form-label';
    categoryLabel.textContent = 'Categoría';

    if (vm.categories && vm.categories.length > 0) {
      const categorySelect = document.createElement('select');
      categorySelect.id = 'edit-field-category';
      categorySelect.name = 'categoryId';
      categorySelect.className = 'q-form-select';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Selecciona una categoría';
      categorySelect.appendChild(defaultOpt);

      for (const cat of vm.categories) {
        const opt = document.createElement('option');
        opt.value = String(cat.id);
        opt.textContent = cat.name;
        if (String(cat.id) === String(vm.form.categoryId)) {
          opt.selected = true;
        }
        categorySelect.appendChild(opt);
      }

      categorySelect.addEventListener('change', () => {
        vm.setField('categoryId', categorySelect.value);
        this._updateSaveButtonState();
      });
      categoryWrap.append(categoryLabel, categorySelect);
    } else {
      // Fallback text input when categories list is empty
      const categoryInput = document.createElement('input');
      categoryInput.id = 'edit-field-category';
      categoryInput.name = 'categoryId';
      categoryInput.type = 'text';
      categoryInput.className = 'q-form-input';
      categoryInput.value = vm.form.categoryId;
      categoryInput.addEventListener('input', () => {
        vm.setField('categoryId', categoryInput.value);
        this._updateSaveButtonState();
      });
      categoryWrap.append(categoryLabel, categoryInput);
    }

    selectRow.append(currencyWrap, categoryWrap);
    form.appendChild(selectRow);

    // 4. Description
    const descWrap = document.createElement('div');
    descWrap.className = 'q-form-field';
    const descLabel = document.createElement('label');
    descLabel.htmlFor = 'edit-field-description';
    descLabel.className = 'q-form-label';
    descLabel.textContent = 'Descripción (opcional)';
    const descTextarea = document.createElement('textarea');
    descTextarea.id = 'edit-field-description';
    descTextarea.name = 'description';
    descTextarea.rows = 3;
    descTextarea.className = 'q-form-textarea';
    descTextarea.value = vm.form.description;
    descTextarea.addEventListener('input', () => {
      vm.setField('description', descTextarea.value);
      this._updateSaveButtonState();
    });
    descWrap.append(descLabel, descTextarea);
    form.appendChild(descWrap);

    // 5. Attributes (JSON)
    const attrsWrap = document.createElement('div');
    attrsWrap.className = 'q-form-field';
    const attrsLabel = document.createElement('label');
    attrsLabel.htmlFor = 'edit-field-attributes';
    attrsLabel.className = 'q-form-label';
    attrsLabel.textContent = 'Atributos (JSON opcional)';
    const attrsTextarea = document.createElement('textarea');
    attrsTextarea.id = 'edit-field-attributes';
    attrsTextarea.name = 'attributesText';
    attrsTextarea.rows = 4;
    attrsTextarea.className = 'q-form-textarea q-form-textarea--code';
    attrsTextarea.placeholder = '{"color":"red","size":"M"}';
    attrsTextarea.value = vm.form.attributesText;
    attrsTextarea.addEventListener('input', () => {
      vm.setField('attributesText', attrsTextarea.value);
      this._updateSaveButtonState();
    });
    attrsWrap.append(attrsLabel, attrsTextarea);
    form.appendChild(attrsWrap);

    // Messages below form
    if (vm.errorMessage) {
      const errEl = document.createElement('div');
      errEl.className = 'q-edit-product-modal__error';
      errEl.setAttribute('role', 'alert');
      errEl.textContent = vm.errorMessage;
      form.appendChild(errEl);
    }

    if (vm.infoMessage) {
      const infoEl = document.createElement('div');
      infoEl.className = 'q-edit-product-modal__info';
      infoEl.setAttribute('role', 'status');
      infoEl.textContent = vm.infoMessage;
      form.appendChild(infoEl);
    }

    this._bodyContainer.appendChild(form);
  }

  /**
   * @private
   */
  _renderFooter() {
    this._footerContainer.replaceChildren();

    const vm = this.viewModel;

    if (this._showDiscardPrompt) {
      const promptWrap = document.createElement('div');
      promptWrap.className = 'q-edit-product-modal__discard-prompt';

      const promptMsg = document.createElement('span');
      promptMsg.className = 'q-edit-product-modal__discard-msg';
      promptMsg.textContent = 'Tienes cambios sin guardar. ¿Descartar?';

      const discardBtn = document.createElement('button');
      discardBtn.type = 'button';
      discardBtn.className = 'q-btn q-btn--outline q-btn--sm q-edit-product-modal__discard-btn';
      discardBtn.textContent = 'Descartar';
      discardBtn.addEventListener('click', () => {
        this._saved = false;
        this._modal.close();
      });

      const keepBtn = document.createElement('button');
      keepBtn.type = 'button';
      keepBtn.className = 'q-btn q-btn--primary q-btn--sm q-edit-product-modal__keep-btn';
      keepBtn.textContent = 'Seguir editando';
      keepBtn.addEventListener('click', () => {
        this._showDiscardPrompt = false;
        this._render();
      });

      promptWrap.append(promptMsg, discardBtn, keepBtn);
      this._footerContainer.appendChild(promptWrap);
      return;
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'q-btn q-btn--outline q-edit-product-modal__cancel-btn';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.disabled = vm.isSaving;
    cancelBtn.addEventListener('click', () => {
      if (vm.isDirty) {
        this._showDiscardPrompt = true;
        this._render();
      } else {
        this._saved = false;
        this._modal.close();
      }
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'q-btn q-btn--primary q-edit-product-modal__save-btn';
    saveBtn.dataset.action = 'save';
    saveBtn.textContent = vm.isSaving ? 'Guardando…' : 'Guardar';
    saveBtn.toggleAttribute('disabled', !vm.isDirty || vm.isSaving || vm.isLoading);
    saveBtn.addEventListener('click', async () => {
      const res = await vm.save();
      if (res && res.status === 'success') {
        this._saved = true;
        this._savedProduct = res.product;
        if (typeof this.onSaved === 'function') {
          this.onSaved(res.product);
        }
        this._modal.close();
      }
    });

    this._footerContainer.append(cancelBtn, saveBtn);
  }

  _updateSaveButtonState() {
    const saveBtn = this._footerContainer?.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.disabled = !this.viewModel.isDirty || this.viewModel.isSaving;
    }
  }
}
