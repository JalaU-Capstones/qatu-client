import { ProductsApi } from '../../models/api/ProductsApi.js';

export class SellerProductFormViewModel {
  /**
   * @param {Object} [options]
   * @param {ProductsApi} [options.productsApi]
   * @param {Array<Object>} [options.categories]
   * @param {Function} [options.onChange]
   */
  constructor({ productsApi = new ProductsApi(), categories = [], onChange = null } = {}) {
    this.productsApi = productsApi;
    this.categories = categories;
    this.onChange = onChange;
    this._listeners = new Set();
    if (this.onChange) this._listeners.add(this.onChange);

    this.productId = null; // set after successful POST /products
    this.productSlug = null;
    this.slugEdited = false;
    this.form = {
      name: '',
      slug: '',
      price: '',
      categoryId: '',
      description: '',
      currency: 'USD',
      stock: '0',
      attributesText: '',
    };
    this.fieldErrors = {}; // { [fieldName]: string }
    this.generalError = ''; // banner for non-field errors (409, etc.)
    this.images = []; // array of { id, path, alt_text, position } from backend
    this.uploadingCount = 0; // # of in-flight uploads
    this.uploadErrors = []; // array of { filename, message }
    this.isCreating = false;
    this.isPublishing = false;
    this.publishedSuccess = false;
    // Delete-image state
    this.deletingImageId = null; // id of the image currently being deleted (in-flight guard)
    this.imageErrors = {}; // { [imageId]: string } — per-image error messages
    this.publishBlockedReason = ''; // non-empty when publishing is blocked (e.g. no images)
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

  setField(name, value) {
    this.form[name] = value;
    if (name === 'slug') {
      this.slugEdited = true;
    } else if (name === 'name' && !this.slugEdited) {
      this.form.slug = this._slugify(value);
    }
    delete this.fieldErrors[name];
  }

  _slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  canSubmitForm() {
    return Boolean(
      !this.productId &&
      this.form.name &&
      this.form.name.trim() !== '' &&
      this.form.price &&
      String(this.form.price).trim() !== '' &&
      this.form.categoryId &&
      String(this.form.categoryId).trim() !== '' &&
      !this.isCreating
    );
  }

  get canPublish() {
    return Boolean(
      this.productId && this.images.length >= 1 && !this.uploadingCount && !this.isPublishing
    );
  }

  get uploadLimitReached() {
    return this.images.length >= 5;
  }

  _validateForm() {
    const errors = {};
    const name = (this.form.name || '').trim();
    if (!name) {
      errors.name = 'El nombre es obligatorio.';
    } else if (name.length < 3) {
      errors.name = 'El nombre debe tener al menos 3 caracteres.';
    } else if (name.length > 200) {
      errors.name = 'El nombre no puede exceder 200 caracteres.';
    }

    const slug = (this.form.slug || '').trim();
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.slug = 'Usa minúsculas, números y guiones entre palabras.';
    }

    const price = Number(this.form.price);
    if (!this.form.price || String(this.form.price).trim() === '') {
      errors.price = 'El precio es obligatorio.';
    } else if (isNaN(price) || price <= 0) {
      errors.price = 'El precio debe ser mayor a 0.';
    }

    if (!this.form.categoryId || String(this.form.categoryId).trim() === '') {
      errors.categoryId = 'Selecciona una categoría.';
    } else if (
      this.categories.length > 0 &&
      !this.categories.some((c) => String(c.id) === String(this.form.categoryId))
    ) {
      errors.categoryId = 'Categoría no válida.';
    }

    if (this.form.description && this.form.description.length > 5000) {
      errors.description = 'La descripción no puede exceder 5000 caracteres.';
    }

    const validCurrencies = ['USD', 'EUR', 'BOB', 'PEN', 'ARS', 'COP', 'MXN', 'BRL'];
    if (this.form.currency && !validCurrencies.includes(this.form.currency)) {
      errors.currency = 'Moneda no soportada.';
    }

    const stock = Number(this.form.stock);
    if (this.form.stock !== '' && (isNaN(stock) || stock < 0 || !Number.isInteger(stock))) {
      errors.stock = 'El stock debe ser un entero mayor o igual a 0.';
    }

    let parsedAttributes = {};
    if (this.form.attributesText && this.form.attributesText.trim() !== '') {
      try {
        const parsed = JSON.parse(this.form.attributesText);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          errors.attributesText = 'JSON inválido';
        } else {
          parsedAttributes = parsed;
        }
      } catch {
        errors.attributesText = 'JSON inválido';
      }
    }

    return { isValid: Object.keys(errors).length === 0, errors, parsedAttributes };
  }

  async submitForm() {
    this.fieldErrors = {};
    this.generalError = '';

    const { isValid, errors, parsedAttributes } = this._validateForm();
    if (!isValid) {
      this.fieldErrors = errors;
      this._notify();
      return { status: 'error', errors };
    }

    this.isCreating = true;
    this._notify();

    const payload = {
      name: this.form.name.trim(),
      ...(this.form.slug.trim() ? { slug: this.form.slug.trim() } : {}),
      price: Number(this.form.price),
      category_id: this.form.categoryId,
      currency: this.form.currency || 'USD',
      stock: Number(this.form.stock || 0),
      description: this.form.description?.trim() || undefined,
      attributes: parsedAttributes,
    };

    try {
      const res = await this.productsApi.createProduct(payload);
      this.productId = res.data.id;
      this.productSlug = res.data.slug;
      return { status: 'success', data: res.data };
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'SLUG_ALREADY_EXISTS') {
        this.generalError = 'Ya existe un producto con ese nombre. Prueba con otro.';
      } else if (err.statusCode === 400 && err.details && Array.isArray(err.details)) {
        for (const detail of err.details) {
          const field = detail.field === 'category_id' ? 'categoryId' : detail.field;
          this.fieldErrors[field] = detail.message || 'Campo inválido';
        }
      } else {
        this.generalError = err.message || 'Error al crear producto';
      }
      return { status: 'error', error: err };
    } finally {
      this.isCreating = false;
      this._notify();
    }
  }

  async addFiles(files) {
    if (!files) return;
    const fileList = Array.from(files);
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MiB

    for (const file of fileList) {
      if (this.images.length >= 5) {
        this.uploadErrors.push({
          filename: file.name,
          message: 'IMAGE_LIMIT_REACHED: Límite de 5 imágenes alcanzado',
        });
        this._notify();
        continue;
      }

      if (file.size > maxSizeBytes) {
        this.uploadErrors.push({
          filename: file.name,
          message: 'FILE_TOO_LARGE: El archivo excede 5 MB',
        });
        this._notify();
        continue;
      }

      if (file.type && !validMimes.includes(file.type)) {
        this.uploadErrors.push({
          filename: file.name,
          message: 'INVALID_FILE_FORMAT: Formato no soportado',
        });
        this._notify();
        continue;
      }

      this.uploadingCount++;
      this._notify();
      try {
        const res = await this.productsApi.uploadProductImage(this.productId, file, {
          alt_text: file.name,
          position: this.images.length,
        });
        if (res && res.data) {
          this.images.push(res.data);
        }
      } catch (err) {
        this.uploadErrors.push({
          filename: file.name,
          message: err.message || 'Error al subir imagen',
        });
      } finally {
        this.uploadingCount--;
        this._notify();
      }
    }
  }

  async publish() {
    if (!this.canPublish) {
      return { status: 'error', message: 'Sube al menos una imagen antes de publicar.' };
    }

    this.isPublishing = true;
    this.generalError = '';
    this._notify();

    try {
      await this.productsApi.publishProduct(this.productId);
      this.publishedSuccess = true;
      this._notify();
      return { status: 'success' };
    } catch (err) {
      if (err.statusCode === 422 || err.code === 'IMAGE_REQUIRED') {
        this.generalError = 'Se requiere al menos una imagen para publicar el producto.';
      } else if (err.statusCode === 409 || err.code === 'INVALID_STATE_TRANSITION') {
        this.generalError = 'El producto no puede ser publicado en su estado actual.';
      } else if (err.statusCode === 403 || err.code === 'FORBIDDEN') {
        this.generalError = 'No tienes permiso para publicar este producto';
      } else {
        this.generalError = err.message || 'Error al publicar';
      }
      return { status: 'error', error: err };
    } finally {
      this.isPublishing = false;
      this._notify();
    }
  }

  /**
   * Deletes a single product image by id.
   *
   * Guards against double-clicks via `deletingImageId`.
   * On success, removes the image from `this.images`.
   * On error, stores the message in `this.imageErrors[imageId]`.
   *
   * @param {string} imageId
   * @returns {Promise<{ status: 'success'|'error'|'busy', error?: Error }>}
   */
  async deleteImage(imageId) {
    if (this.deletingImageId) return { status: 'busy' };
    this.deletingImageId = imageId;
    delete this.imageErrors[imageId];
    this._notify();
    try {
      await this.productsApi.deleteProductImage(this.productId, imageId);
      this.images = this.images.filter((img) => img.id !== imageId);
      if (this.images.length === 0) {
        this.publishBlockedReason = 'Sube al menos una imagen antes de publicar.';
      }
      return { status: 'success' };
    } catch (err) {
      this.imageErrors[imageId] = err.message || 'Error al eliminar imagen.';
      return { status: 'error', error: err };
    } finally {
      this.deletingImageId = null;
      this._notify();
    }
  }
}
