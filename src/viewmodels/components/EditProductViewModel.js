export class EditProductViewModel {
  /**
   * @param {Object} [options]
   * @param {ProductsApi} options.productsApi
   * @param {CategoriesApi|Object} [options.categoriesApi=null]
   * @param {Function} [options.onChange=null]
   */
  constructor({ productsApi, categoriesApi = null, onChange = null } = {}) {
    this.productsApi = productsApi;
    this.categoriesApi = categoriesApi;
    this.onChange = onChange;
    this._listeners = new Set();
    if (this.onChange) this._listeners.add(this.onChange);

    this.isLoading = false;
    this.isSaving = false;
    this.errorMessage = '';
    this.infoMessage = '';
    this.loadedProduct = null;
    this.form = {
      name: '',
      description: '',
      price: '',
      stock: '',
      currency: 'USD',
      categoryId: '',
      attributesText: '',
    };
    this.categories = [];
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of this._listeners) {
      listener(this);
    }
  }

  /**
   * Fetches the product + categories, populates the form.
   * Resets errorMessage and infoMessage.
   * @param {string} productId
   * @returns {Promise<{ status: 'success' | 'error', error?: Error }>}
   */
  async load(productId) {
    this.isLoading = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this._notify();

    const fetchCategories = async () => {
      if (!this.categoriesApi) return [];
      try {
        if (typeof this.categoriesApi.getAll === 'function') {
          const res = await this.categoriesApi.getAll();
          return Array.isArray(res) ? res : res?.data || [];
        }
        if (typeof this.categoriesApi.getCategories === 'function') {
          const res = await this.categoriesApi.getCategories();
          return Array.isArray(res) ? res : res?.data || [];
        }
        return [];
      } catch {
        return [];
      }
    };

    try {
      const [product, rawCategories] = await Promise.all([
        this.productsApi.getProductById(productId),
        fetchCategories(),
      ]);

      this.loadedProduct = product;
      this._populateFormFromProduct(product);

      this.categories = (rawCategories || []).map((c) => ({
        id: c.id,
        name: c.name,
      }));

      return { status: 'success' };
    } catch (error) {
      this.errorMessage = error.message || 'No pudimos cargar el producto.';
      return { status: 'error', error };
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  /**
   * @param {Object} product
   * @private
   */
  _populateFormFromProduct(product) {
    if (!product) return;
    this.form = {
      name: product.name || '',
      description: product.description || '',
      price: product.price !== undefined && product.price !== null ? String(product.price) : '',
      stock: product.stock !== undefined && product.stock !== null ? String(product.stock) : '',
      currency: product.currency || 'USD',
      categoryId: product.category_id || '',
      attributesText:
        product.attributes &&
        typeof product.attributes === 'object' &&
        Object.keys(product.attributes).length > 0
          ? JSON.stringify(product.attributes, null, 2)
          : '',
    };
  }

  /**
   * Sets a form field. Any subsequent dirty-check will reflect it.
   * @param {string} field
   * @param {any} value
   */
  setField(field, value) {
    if (Object.prototype.hasOwnProperty.call(this.form, field)) {
      this.form[field] = value;
      this.infoMessage = '';
      this.errorMessage = '';
      this._notify();
    }
  }

  /**
   * Builds the PATCH payload from current form + loadedProduct. Returns
   * only changed fields. Returns null when nothing changed.
   * @returns {Object|null}
   */
  buildUpdatePayload() {
    if (!this.loadedProduct) return null;

    const payload = {};
    const loaded = this.loadedProduct;

    // 1. name
    const trimmedName = (this.form.name || '').trim();
    if (trimmedName !== (loaded.name || '').trim()) {
      payload.name = trimmedName;
    }

    // 2. description
    const trimmedDesc = (this.form.description ?? '').trim();
    const loadedDesc = (loaded.description ?? '').trim();
    if (trimmedDesc !== loadedDesc) {
      payload.description = trimmedDesc;
    }

    // 3. price
    if (this.form.price !== '' && this.form.price !== null && this.form.price !== undefined) {
      const numPrice = Number(this.form.price);
      if (Number.isNaN(numPrice) || numPrice < 0) {
        const err = new Error('Price must be a valid number');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      if (numPrice !== Number(loaded.price)) {
        payload.price = numPrice;
      }
    }

    // 4. stock
    if (this.form.stock !== '' && this.form.stock !== null && this.form.stock !== undefined) {
      const numStock = Number(this.form.stock);
      if (Number.isNaN(numStock) || numStock < 0) {
        const err = new Error('Stock must be a valid number');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      if (numStock !== Number(loaded.stock)) {
        payload.stock = numStock;
      }
    }

    // 5. currency
    if (this.form.currency && this.form.currency !== loaded.currency) {
      payload.currency = this.form.currency;
    }

    // 6. category_id
    const currentCategoryId = this.form.categoryId || '';
    const loadedCategoryId = loaded.category_id || '';
    if (currentCategoryId !== loadedCategoryId) {
      payload.category_id = currentCategoryId;
    }

    // 7. attributes
    const rawAttrsText = (this.form.attributesText || '').trim();
    const loadedAttrs = loaded.attributes || {};

    if (rawAttrsText === '') {
      // Empty text = "don't touch" (preserve existing attributes)
    } else {
      let parsed;
      try {
        parsed = JSON.parse(rawAttrsText);
      } catch {
        const err = new Error('attributes must be valid JSON');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        const err = new Error('attributes must be a JSON object');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      const parsedJson = JSON.stringify(parsed);
      const loadedJson = JSON.stringify(loadedAttrs);

      if (parsedJson !== loadedJson) {
        payload.attributes = parsed;
      }
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  /**
   * @returns {boolean}
   */
  get isDirty() {
    try {
      const payload = this.buildUpdatePayload();
      return payload !== null && Object.keys(payload).length > 0;
    } catch {
      return true;
    }
  }

  /**
   * Saves via ProductsApi.updateProduct. On success, updates
   * loadedProduct with the new DTO. Idempotent while in-flight.
   * @returns {Promise<{ status: 'success' | 'error' | 'no-changes', error?: Error, product?: Object }>}
   */
  async save() {
    if (this.isSaving) {
      return { status: 'no-changes' };
    }

    let payload;
    try {
      payload = this.buildUpdatePayload();
    } catch (err) {
      this.errorMessage = err.message;
      this._notify();
      return { status: 'error', error: err };
    }

    if (payload === null) {
      this.infoMessage = 'No hay cambios para guardar.';
      this._notify();
      return { status: 'no-changes' };
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.infoMessage = '';
    this._notify();

    try {
      const res = await this.productsApi.updateProduct(this.loadedProduct.id, payload);
      this.loadedProduct = res.data;
      this._populateFormFromProduct(res.data);
      return { status: 'success', product: res.data };
    } catch (err) {
      this.errorMessage = err.message || 'No pudimos guardar.';
      return { status: 'error', error: err };
    } finally {
      this.isSaving = false;
      this._notify();
    }
  }
}
