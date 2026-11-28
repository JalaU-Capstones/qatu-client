import { CategoriesApi } from '../../models/api/CategoriesApi.js';

function validateCategoryName(rawName) {
  const trimmed = typeof rawName === 'string' ? rawName.trim() : '';
  if (!trimmed) {
    return { valid: false, error: 'El nombre de la categoría es obligatorio.' };
  }
  if (trimmed.length < 2 || trimmed.length > 80) {
    return { valid: false, error: 'El nombre debe tener entre 2 y 80 caracteres.' };
  }
  return { valid: true, value: trimmed };
}

export class AdminCategoriesViewModel {
  /**
   * @param {Object} [options]
   * @param {CategoriesApi} [options.categoriesApi]
   * @param {Function|null} [options.onCategoriesChanged]
   */
  constructor({ categoriesApi = new CategoriesApi(), onCategoriesChanged = null } = {}) {
    this.api = categoriesApi;
    this.onCategoriesChanged = onCategoriesChanged;

    this.categories = [];
    this.meta = {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    };

    this.isLoading = false;
    this.isForbidden = false;
    this.isCreating = false;
    this.busyIds = new Set();

    this.newName = '';
    this.newDescription = '';
    this.createFieldError = '';

    this.editingId = null;
    this.editName = '';
    this.editDescription = '';
    this.editFieldError = '';

    this.noticeMessage = '';
    this.errorMessage = '';
    this._listeners = new Set();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach((listener) => listener(this));
  }

  isBusy(categoryId) {
    return this.busyIds.has(categoryId);
  }

  async loadCategories(page = 1) {
    this.isLoading = true;
    this.errorMessage = '';
    this._notify();

    try {
      const response = await this.api.getCategories({
        page,
        limit: this.meta.limit,
      });

      this.isForbidden = false;
      this.categories = Array.isArray(response?.data) ? response.data : [];
      const meta = response?.meta || {};
      this.meta = {
        page: Number(meta.page) || page,
        limit: Number(meta.per_page ?? meta.limit) || this.meta.limit,
        total: Number(meta.total) || this.categories.length,
        totalPages: Math.max(1, Number(meta.total_pages ?? meta.totalPages) || 1),
      };
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else {
        this.errorMessage = err?.message || 'No se pudieron cargar las categorías.';
      }
      this.categories = [];
    } finally {
      this.isLoading = false;
      this._notify();
    }
  }

  setNewName(value) {
    this.newName = value;
    if (this.createFieldError) this.createFieldError = '';
    this._notify();
  }

  setNewDescription(value) {
    this.newDescription = value;
    this._notify();
  }

  async createCategory() {
    if (this.isCreating) return false;

    const validation = validateCategoryName(this.newName);
    if (!validation.valid) {
      this.createFieldError = validation.error;
      this._notify();
      return false;
    }

    this.isCreating = true;
    this.createFieldError = '';
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      const response = await this.api.createCategory({
        name: validation.value,
        description: this.newDescription.trim() || null,
      });

      const created = response?.data;
      this.newName = '';
      this.newDescription = '';
      this.noticeMessage = 'Categoría creada correctamente.';

      if (created) {
        this.categories = [...this.categories, created].sort((a, b) =>
          String(a.name).localeCompare(String(b.name))
        );
        this.meta.total += 1;
      } else {
        await this.loadCategories(this.meta.page);
      }

      if (typeof this.onCategoriesChanged === 'function') {
        this.onCategoriesChanged(this.categories);
      }
      return true;
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else {
        this.errorMessage = err?.message || 'No se pudo crear la categoría.';
      }
      return false;
    } finally {
      this.isCreating = false;
      this._notify();
    }
  }

  startEdit(category) {
    this.editingId = category.id;
    this.editName = category.name || '';
    this.editDescription = category.description || '';
    this.editFieldError = '';
    this.errorMessage = '';
    this._notify();
  }

  cancelEdit() {
    if (this.editingId !== null || this.editFieldError) {
      this.editingId = null;
      this.editName = '';
      this.editDescription = '';
      this.editFieldError = '';
      this._notify();
    }
  }

  setEditName(value) {
    this.editName = value;
    if (this.editFieldError) this.editFieldError = '';
    this._notify();
  }

  setEditDescription(value) {
    this.editDescription = value;
    this._notify();
  }

  async saveEdit(categoryId) {
    if (!categoryId || this.busyIds.has(categoryId)) return false;

    const validation = validateCategoryName(this.editName);
    if (!validation.valid) {
      this.editFieldError = validation.error;
      this._notify();
      return false;
    }

    this.busyIds.add(categoryId);
    this.editFieldError = '';
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      const response = await this.api.updateCategory(categoryId, {
        name: validation.value,
        description: this.editDescription.trim() || null,
      });

      const updated = response?.data || {
        id: categoryId,
        name: validation.value,
        description: this.editDescription.trim() || null,
      };

      this.categories = this.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, ...updated } : cat
      );
      this.editingId = null;
      this.editName = '';
      this.editDescription = '';
      this.noticeMessage = 'Categoría actualizada correctamente.';

      if (typeof this.onCategoriesChanged === 'function') {
        this.onCategoriesChanged(this.categories);
      }
      return true;
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else {
        this.errorMessage = err?.message || 'No se pudo actualizar la categoría.';
      }
      return false;
    } finally {
      this.busyIds.delete(categoryId);
      this._notify();
    }
  }

  /**
   * Deletes a category and returns `{ status: 'success' | 'error', error?: Error }`
   * so it integrates directly with DeleteConfirmModal.
   *
   * @param {string} categoryId
   * @returns {Promise<{ status: 'success'|'error', error?: Error }>}
   */
  async deleteCategory(categoryId) {
    if (!categoryId || this.busyIds.has(categoryId)) {
      return { status: 'error', error: new Error('Operación en curso.') };
    }

    this.busyIds.add(categoryId);
    this.errorMessage = '';
    this.noticeMessage = '';
    this._notify();

    try {
      await this.api.deleteCategory(categoryId);
      this.categories = this.categories.filter((cat) => cat.id !== categoryId);
      this.meta.total = Math.max(0, this.meta.total - 1);
      if (this.editingId === categoryId) {
        this.editingId = null;
      }
      this.noticeMessage = 'Categoría eliminada correctamente.';

      if (typeof this.onCategoriesChanged === 'function') {
        this.onCategoriesChanged(this.categories);
      }
      return { status: 'success' };
    } catch (err) {
      if (err?.statusCode === 403 || err?.code === 'FORBIDDEN') {
        this.isForbidden = true;
        this.errorMessage = '403 Forbidden: No tienes permisos de administrador.';
      } else {
        // Displays "Category in use" when backend returns 409
        this.errorMessage = err?.message || 'No se pudo eliminar la categoría.';
      }
      return { status: 'error', error: err };
    } finally {
      this.busyIds.delete(categoryId);
      this._notify();
    }
  }
}
