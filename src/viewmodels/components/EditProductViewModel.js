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
    this.categoryErrorMessage = '';
    this.images = [];
    this.imageErrorMessage = '';
    this.uploadErrors = [];
    this.uploadingCount = 0;
    this.deletingImageId = null;
    this.imageErrors = {};
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
      if (!this.categoriesApi) return { categories: [], error: '' };
      try {
        if (typeof this.categoriesApi.getAll === 'function') {
          const res = await this.categoriesApi.getAll();
          return {
            categories: Array.isArray(res) ? res : res?.data || [],
            error: '',
          };
        }
        if (typeof this.categoriesApi.getCategories === 'function') {
          const res = await this.categoriesApi.getCategories();
          return {
            categories: Array.isArray(res) ? res : res?.data || [],
            error: '',
          };
        }
        return { categories: [], error: '' };
      } catch (error) {
        return {
          categories: [],
          error: error.message || 'No pudimos cargar las categorías.',
        };
      }
    };

    const fetchImages = async () => {
      if (typeof this.productsApi.listProductImages !== 'function') {
        return { images: [], error: 'No pudimos cargar las imágenes del producto.' };
      }
      try {
        const res = await this.productsApi.listProductImages(productId);
        const images = Array.isArray(res) ? res : res?.data || [];
        return {
          images: [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
          error: '',
        };
      } catch (error) {
        return {
          images: [],
          error: error.message || 'No pudimos cargar las imágenes del producto.',
        };
      }
    };

    try {
      const [product, categoryResult, imageResult] = await Promise.all([
        this.productsApi.getProductById(productId),
        fetchCategories(),
        fetchImages(),
      ]);

      this.loadedProduct = product;
      this._populateFormFromProduct(product);

      this.categories = (categoryResult.categories || []).map((c) => ({
        id: c.id,
        name: c.name,
      }));
      this.categoryErrorMessage = categoryResult.error;
      this.images = imageResult.images;
      this.imageErrorMessage = imageResult.error;

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
    if (trimmedName.length < 3 || trimmedName.length > 200) {
      const err = new Error('El nombre debe tener entre 3 y 200 caracteres.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    // 2. description
    const trimmedDesc = (this.form.description ?? '').trim();
    if (trimmedDesc.length > 5000) {
      const err = new Error('La descripción no puede exceder 5,000 caracteres.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const loadedDesc = (loaded.description ?? '').trim();
    if (trimmedDesc !== loadedDesc) {
      payload.description = trimmedDesc;
    }

    // 3. price
    const numPrice = Number(this.form.price);
    if (this.form.price === '' || Number.isNaN(numPrice) || numPrice < 0.01) {
      const err = new Error('El precio debe ser mayor a 0.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (numPrice !== Number(loaded.price)) {
      payload.price = numPrice;
    }

    // 4. stock
    const numStock = Number(this.form.stock);
    if (
      this.form.stock === '' ||
      Number.isNaN(numStock) ||
      numStock < 0 ||
      !Number.isInteger(numStock)
    ) {
      const err = new Error('El stock debe ser un número entero igual o mayor a 0.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (numStock !== Number(loaded.stock)) {
      payload.stock = numStock;
    }

    // 5. currency
    if (
      loaded.state !== 'published' &&
      this.form.currency &&
      this.form.currency !== loaded.currency
    ) {
      payload.currency = this.form.currency;
    }

    // 6. category_id
    const currentCategoryId = this.form.categoryId || '';
    const loadedCategoryId = loaded.category_id || '';
    if (!currentCategoryId) {
      const err = new Error('Selecciona una categoría.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (
      this.categories.length > 0 &&
      !this.categories.some((category) => String(category.id) === String(currentCategoryId))
    ) {
      const err = new Error('Selecciona una categoría válida.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
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

  async addImages(files, altText = '') {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024;
    this.uploadErrors = [];

    for (const file of Array.from(files || [])) {
      if (this.images.length + this.uploadingCount >= 5) {
        this.uploadErrors.push({
          filename: file.name,
          message: 'A cada producto se le permiten hasta 5 imágenes.',
        });
        this._notify();
        continue;
      }

      if (file.size > maxSizeBytes) {
        this.uploadErrors.push({
          filename: file.name,
          message: 'La imagen excede el límite de 5 MB.',
        });
        this._notify();
        continue;
      }

      if (!validMimes.includes(file.type)) {
        this.uploadErrors.push({
          filename: file.name,
          message: 'Solo se aceptan imágenes JPEG, PNG o WebP.',
        });
        this._notify();
        continue;
      }

      this.uploadingCount += 1;
      this._notify();
      try {
        const res = await this.productsApi.uploadProductImage(this.loadedProduct.id, file, {
          alt_text: altText.trim() || file.name,
          position: this.images.reduce((max, image) => Math.max(max, image.position ?? -1), -1) + 1,
        });
        if (res?.data) {
          this.images.push(res.data);
          this.images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          this.imageErrorMessage = '';
        }
      } catch (error) {
        this.uploadErrors.push({
          filename: file.name,
          message: error.message || 'No pudimos subir la imagen.',
        });
      } finally {
        this.uploadingCount -= 1;
        this._notify();
      }
    }
  }

  async deleteImage(imageId) {
    if (this.deletingImageId) return { status: 'busy' };
    this.deletingImageId = imageId;
    delete this.imageErrors[imageId];
    this._notify();

    try {
      await this.productsApi.deleteProductImage(this.loadedProduct.id, imageId);
      this.images = this.images.filter((image) => image.id !== imageId);
      this.images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return { status: 'success' };
    } catch (error) {
      this.imageErrors[imageId] = error.message || 'No pudimos eliminar la imagen.';
      return { status: 'error', error };
    } finally {
      this.deletingImageId = null;
      this._notify();
    }
  }
}
