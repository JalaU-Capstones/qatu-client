import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { AdminCategoriesViewModel } from '../../viewmodels/pages/AdminCategoriesViewModel.js';
import { CategoryIcon } from '../components/CategoryIcon.js';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.js';

export class AdminCategoriesPageView {
  /**
   * @param {Object} [options]
   * @param {AdminCategoriesViewModel} [options.viewModel]
   * @param {Function|null} [options.onNavigate]
   */
  constructor({ viewModel = new AdminCategoriesViewModel(), onNavigate = null } = {}) {
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
      this._renderGate('Debes iniciar sesión como administrador para acceder a este panel.', true);
      return this.element;
    }

    if (!authStore.isAdmin()) {
      this._renderForbidden();
      return this.element;
    }

    void this.viewModel.loadCategories(1);
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
    section.className = 'q-admin-categories-page';
    section.setAttribute('aria-label', 'Administración de categorías');

    const container = document.createElement('div');
    container.className = 'q-section-container';

    const header = document.createElement('div');
    header.className = 'q-admin-categories-header';

    const title = document.createElement('h1');
    title.className = 'q-admin-categories-title';
    title.textContent = 'Gestión de categorías';

    const subtitle = document.createElement('p');
    subtitle.className = 'q-admin-categories-subtitle';
    subtitle.textContent = 'Crea, edita y organiza las categorías de productos del catálogo.';

    header.append(title, subtitle);

    const notices = document.createElement('div');
    notices.dataset.role = 'notices';

    const notice = document.createElement('div');
    notice.dataset.role = 'notice';
    notice.setAttribute('aria-live', 'polite');

    const error = document.createElement('div');
    error.dataset.role = 'error';
    error.setAttribute('role', 'alert');

    notices.append(notice, error);

    const createCard = this._buildCreateForm();

    const content = document.createElement('div');
    content.dataset.role = 'content';
    content.className = 'q-admin-categories-content';

    container.append(header, notices, createCard, content);
    section.appendChild(container);
    this.element = section;
    return section;
  }

  _buildCreateForm() {
    const vm = this.viewModel;
    const form = document.createElement('form');
    form.className = 'q-admin-categories-form';
    form.setAttribute('novalidate', '');

    const fieldsRow = document.createElement('div');
    fieldsRow.className = 'q-admin-categories-form__fields';

    const nameGroup = document.createElement('div');
    nameGroup.className = 'q-admin-categories-form__group';

    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'admin-category-name';
    nameLabel.textContent = 'Nueva categoría *';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'admin-category-name';
    nameInput.name = 'name';
    nameInput.maxLength = 80;
    nameInput.placeholder = 'Ej. Electrónica';
    nameInput.value = vm.newName;
    nameInput.addEventListener('input', (e) => vm.setNewName(e.target.value));

    const nameErr = document.createElement('p');
    nameErr.dataset.role = 'create-field-error';
    nameErr.className = 'q-seller-apply-field-error';

    nameGroup.append(nameLabel, nameInput, nameErr);

    const descGroup = document.createElement('div');
    descGroup.className = 'q-admin-categories-form__group';

    const descLabel = document.createElement('label');
    descLabel.htmlFor = 'admin-category-description';
    descLabel.textContent = 'Descripción (opcional)';

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.id = 'admin-category-description';
    descInput.name = 'description';
    descInput.maxLength = 500;
    descInput.placeholder = 'Breve descripción de la categoría';
    descInput.value = vm.newDescription;
    descInput.addEventListener('input', (e) => vm.setNewDescription(e.target.value));

    descGroup.append(descLabel, descInput);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'q-btn q-btn--primary q-admin-categories-create-btn';
    submitBtn.textContent = 'Crear categoría';

    fieldsRow.append(nameGroup, descGroup, submitBtn);
    form.appendChild(fieldsRow);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const created = await vm.createCategory();
      if (created) {
        nameInput.value = '';
        descInput.value = '';
      }
    });

    return form;
  }

  _update() {
    if (!this.element) return;
    const vm = this.viewModel;

    if (vm.isForbidden) {
      this._renderForbidden();
      return;
    }

    const notice = this.element.querySelector('[data-role="notice"]');
    const error = this.element.querySelector('[data-role="error"]');
    const createFieldErr = this.element.querySelector('[data-role="create-field-error"]');
    const createBtn = this.element.querySelector('.q-admin-categories-create-btn');
    const content = this.element.querySelector('[data-role="content"]');
    if (!notice || !error || !content) return;

    if (createFieldErr) {
      createFieldErr.textContent = vm.createFieldError || '';
    }
    if (createBtn) {
      createBtn.disabled = vm.isCreating;
      createBtn.textContent = vm.isCreating ? 'Creando…' : 'Crear categoría';
    }

    notice.replaceChildren();
    if (vm.noticeMessage) {
      const ok = document.createElement('div');
      ok.className = 'q-orders-alert q-orders-alert--success';
      ok.textContent = vm.noticeMessage;
      notice.appendChild(ok);
    }

    error.replaceChildren();
    if (vm.errorMessage) {
      const err = document.createElement('div');
      err.className = 'q-orders-alert q-orders-alert--forbidden';
      err.textContent = vm.errorMessage;
      error.appendChild(err);
    }

    content.replaceChildren();
    if (!vm.categories.length) {
      const empty = document.createElement('p');
      empty.className = 'q-admin-categories-empty';
      empty.textContent = vm.isLoading ? 'Cargando categorías…' : 'No hay categorías registradas.';
      content.appendChild(empty);
      return;
    }

    content.appendChild(this._buildTable());

    if (vm.meta.totalPages > 1) {
      content.appendChild(this._buildPager());
    }
  }

  _buildTable() {
    const vm = this.viewModel;
    const wrap = document.createElement('div');
    wrap.className = 'q-admin-categories-table-wrap';
    if (vm.isLoading) {
      wrap.classList.add('is-loading');
      wrap.setAttribute('aria-busy', 'true');
    }

    const table = document.createElement('table');
    table.className = 'q-admin-categories-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const label of ['Nombre', 'Slug', 'Descripción', 'Acciones']) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    for (const category of vm.categories) {
      tbody.appendChild(this._buildRow(category));
    }

    table.append(thead, tbody);
    wrap.appendChild(table);
    return wrap;
  }

  _buildRow(category) {
    const vm = this.viewModel;
    const tr = document.createElement('tr');
    tr.dataset.categoryId = category.id;
    const busy = vm.isBusy(category.id);
    if (busy) {
      tr.setAttribute('aria-busy', 'true');
    }

    const isEditing = vm.editingId === category.id;

    if (isEditing) {
      const nameWrap = document.createElement('div');
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'q-admin-categories-edit-input';
      nameInput.maxLength = 80;
      nameInput.value = vm.editName;
      nameInput.disabled = busy;
      nameInput.setAttribute('aria-label', 'Editar nombre de categoría');
      nameInput.addEventListener('input', (e) => vm.setEditName(e.target.value));
      nameWrap.appendChild(nameInput);

      if (vm.editFieldError) {
        const err = document.createElement('p');
        err.className = 'q-seller-apply-field-error';
        err.textContent = vm.editFieldError;
        nameWrap.appendChild(err);
      }

      const descInput = document.createElement('input');
      descInput.type = 'text';
      descInput.className = 'q-admin-categories-edit-input';
      descInput.maxLength = 500;
      descInput.value = vm.editDescription;
      descInput.disabled = busy;
      descInput.setAttribute('aria-label', 'Editar descripción de categoría');
      descInput.addEventListener('input', (e) => vm.setEditDescription(e.target.value));

      const actions = document.createElement('div');
      actions.className = 'q-admin-categories-actions';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'q-btn q-btn--primary q-btn--sm q-admin-categories-save-btn';
      saveBtn.textContent = busy ? 'Guardando…' : 'Guardar';
      saveBtn.disabled = busy;
      saveBtn.addEventListener('click', () => void vm.saveEdit(category.id));

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'q-btn q-btn--neutral q-btn--sm q-admin-categories-cancel-btn';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.disabled = busy;
      cancelBtn.addEventListener('click', () => vm.cancelEdit());

      actions.append(saveBtn, cancelBtn);

      tr.append(
        this._cell('Nombre', nameWrap),
        this._cell('Slug', category.slug || '—'),
        this._cell('Descripción', descInput),
        this._cell('Acciones', actions)
      );
      return tr;
    }

    const actions = document.createElement('div');
    actions.className = 'q-admin-categories-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'q-btn q-btn--outline q-btn--sm q-admin-categories-edit-btn';
    editBtn.textContent = 'Editar';
    editBtn.disabled = busy;
    editBtn.addEventListener('click', () => vm.startEdit(category));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'q-btn q-btn--danger q-btn--sm q-admin-categories-delete-btn';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.disabled = busy;
    deleteBtn.addEventListener('click', () => {
      const modal = new DeleteConfirmModal({
        productId: category.id,
        title: 'Eliminar categoría',
        itemName: category.name,
        fallbackItemName: 'esta categoría',
        errorFallback: 'No se pudo eliminar la categoría.',
        onConfirm: () => vm.deleteCategory(category.id),
      });
      void modal.open();
    });

    actions.append(editBtn, deleteBtn);

    tr.append(
      this._cell('Nombre', this._buildNameCell(category)),
      this._cell('Slug', category.slug || '—'),
      this._cell('Descripción', category.description || '—'),
      this._cell('Acciones', actions)
    );

    return tr;
  }

  _cell(label, content) {
    const td = document.createElement('td');
    td.dataset.label = label;
    if (content instanceof Node) {
      td.appendChild(content);
    } else {
      td.textContent = String(content ?? '');
    }
    return td;
  }

  _buildNameCell(category) {
    const wrap = document.createElement('div');
    wrap.className = 'q-admin-categories-name';
    wrap.appendChild(new CategoryIcon({ name: category.name, size: 22 }).render());
    const link = document.createElement('a');
    link.className = 'q-admin-categories-name-link';
    link.href = `/products?category=${encodeURIComponent(category.slug || category.id)}`;
    link.dataset.route = '';
    link.textContent = category.name || '—';
    wrap.appendChild(link);
    return wrap;
  }

  _buildPager() {
    const vm = this.viewModel;
    const pager = document.createElement('nav');
    pager.className = 'q-orders-page__pagination';
    pager.setAttribute('aria-label', 'Paginación de categorías');

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'q-btn q-btn--neutral q-btn--sm q-pagination-btn q-pagination-prev';
    prev.textContent = 'Anterior';
    prev.disabled = vm.meta.page <= 1 || vm.isLoading;
    prev.addEventListener('click', () => void vm.loadCategories(vm.meta.page - 1));

    const info = document.createElement('span');
    info.className = 'q-pagination-info';
    info.textContent = `Página ${vm.meta.page} de ${vm.meta.totalPages}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'q-btn q-btn--neutral q-btn--sm q-pagination-btn q-pagination-next';
    next.textContent = 'Siguiente';
    next.disabled = vm.meta.page >= vm.meta.totalPages || vm.isLoading;
    next.addEventListener('click', () => void vm.loadCategories(vm.meta.page + 1));

    pager.append(prev, info, next);
    return pager;
  }

  _renderForbidden() {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'q-admin-applications-forbidden';
    box.setAttribute('role', 'alert');

    const code = document.createElement('p');
    code.className = 'q-admin-applications-forbidden__code';
    code.textContent = '403 Forbidden';

    const title = document.createElement('h2');
    title.className = 'q-admin-applications-forbidden__title';
    title.textContent = 'Acceso denegado';

    const desc = document.createElement('p');
    desc.textContent = 'No tienes permisos de administrador para gestionar categorías.';

    const homeBtn = document.createElement('button');
    homeBtn.type = 'button';
    homeBtn.className = 'q-btn q-btn--primary';
    homeBtn.textContent = 'Volver al inicio';
    homeBtn.addEventListener('click', () => {
      if (typeof this.onNavigate === 'function') this.onNavigate('/');
    });

    box.append(code, title, desc, homeBtn);
    content.appendChild(box);
  }

  _renderGate(message, offerLogin) {
    const content = this.element?.querySelector('[data-role="content"]');
    if (!content) return;
    content.replaceChildren();

    const box = document.createElement('div');
    box.className = 'q-admin-applications-empty';

    const p = document.createElement('p');
    p.textContent = message;
    box.appendChild(p);

    if (offerLogin) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'q-btn q-btn--primary';
      btn.textContent = 'Iniciar sesión';
      btn.addEventListener('click', () => {
        authRedirectStore.setReturnTo('/admin/categories');
        if (typeof this.onNavigate === 'function') this.onNavigate('/login');
      });
      box.appendChild(btn);
    }

    content.appendChild(box);
  }
}
