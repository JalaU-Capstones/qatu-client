import { authRedirectStore } from '../../store/authRedirectStore.js';
import { authStore } from '../../store/authStore.js';
import { AdminCategoriesViewModel } from '../../viewmodels/pages/AdminCategoriesViewModel.js';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal.js';
import { AdminCategoriesPageView } from './AdminCategoriesPageView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function mockCategory(overrides = {}) {
  return {
    id: 'cat-1',
    name: 'Electrónica',
    slug: 'electronica',
    description: 'Dispositivos y gadgets',
    ...overrides,
  };
}

describe('AdminCategoriesPageView', () => {
  let container;
  let categoriesApi;
  let viewModel;
  let view;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    authStore.setSession({
      user: { id: 'admin-1', username: 'ada' },
      roles: [{ name: 'admin' }],
    });

    categoriesApi = {
      getCategories: jasmine.createSpy('getCategories').and.resolveTo({
        data: [
          mockCategory({ id: 'cat-2', name: 'Textiles', slug: 'textiles' }),
          mockCategory({ id: 'cat-1', name: 'Electrónica', slug: 'electronica' }),
        ],
        meta: { page: 1, per_page: 20, total: 2, total_pages: 1 },
      }),
      createCategory: jasmine.createSpy('createCategory').and.resolveTo({
        data: mockCategory({ id: 'cat-3', name: 'Alimentos', slug: 'alimentos' }),
      }),
      updateCategory: jasmine
        .createSpy('updateCategory')
        .and.callFake((categoryId, payload) =>
          Promise.resolve({ data: mockCategory({ id: categoryId, ...payload }) })
        ),
      deleteCategory: jasmine.createSpy('deleteCategory').and.resolveTo(),
    };

    viewModel = new AdminCategoriesViewModel({ categoriesApi });
    view = new AdminCategoriesPageView({ viewModel });
  });

  afterEach(() => {
    if (view) {
      view.destroy();
      view = null;
    }
    if (container?.parentElement) {
      container.remove();
    }
    authStore.clearSession();
  });

  it('renders the creation form and the categories table from the view model', async () => {
    view.mount(container);
    await tick();

    expect(container.querySelector('#admin-category-name')).not.toBeNull();
    expect(container.querySelector('#admin-category-description')).not.toBeNull();
    expect(container.querySelector('.q-admin-categories-create-btn')).not.toBeNull();

    const table = container.querySelector('.q-admin-categories-table');
    expect(table).not.toBeNull();
    expect(table.querySelectorAll('tr[data-category-id]').length).toBe(2);
    expect(container.textContent).toContain('Electrónica');
    expect(container.textContent).toContain('Textiles');
    expect(container.querySelectorAll('.q-admin-categories-edit-btn').length).toBe(2);
    expect(container.querySelectorAll('.q-admin-categories-delete-btn').length).toBe(2);
  });

  it('submits the creation form through viewModel.createCategory()', async () => {
    view.mount(container);
    await tick();
    spyOn(viewModel, 'createCategory').and.resolveTo(true);

    const nameInput = container.querySelector('#admin-category-name');
    nameInput.value = 'Alimentos';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const form = container.querySelector('.q-admin-categories-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();

    expect(viewModel.createCategory).toHaveBeenCalled();
    expect(nameInput.value).toBe('');
  });

  it('activates inline edit mode and saves through viewModel.saveEdit()', async () => {
    view.mount(container);
    await tick();

    const row = container.querySelector('tr[data-category-id="cat-2"]');
    row.querySelector('.q-admin-categories-edit-btn').click();

    const editingRow = container.querySelector('tr[data-category-id="cat-2"]');
    expect(editingRow.querySelector('.q-admin-categories-save-btn')).not.toBeNull();
    expect(editingRow.querySelector('.q-admin-categories-cancel-btn')).not.toBeNull();
    expect(viewModel.editingId).toBe('cat-2');

    const nameInput = editingRow.querySelector('.q-admin-categories-edit-input');
    nameInput.value = 'Textiles Premium';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    editingRow.querySelector('.q-admin-categories-save-btn').click();
    await tick();

    expect(categoriesApi.updateCategory).toHaveBeenCalledWith('cat-2', {
      name: 'Textiles Premium',
      description: 'Dispositivos y gadgets',
    });
    expect(container.querySelector('tr[data-category-id="cat-2"]').textContent).toContain(
      'Textiles Premium'
    );
    expect(container.querySelector('.q-admin-categories-save-btn')).toBeNull();
  });

  it('cancels inline edit mode without calling the API', async () => {
    view.mount(container);
    await tick();

    container.querySelector('tr[data-category-id="cat-2"] .q-admin-categories-edit-btn').click();
    const editingRow = container.querySelector('tr[data-category-id="cat-2"]');
    editingRow.querySelector('.q-admin-categories-cancel-btn').click();

    expect(viewModel.editingId).toBeNull();
    expect(container.querySelector('.q-admin-categories-save-btn')).toBeNull();
    expect(categoriesApi.updateCategory).not.toHaveBeenCalled();
  });

  it('renders an error alert when the view model reports "Category in use"', async () => {
    view.mount(container);
    await tick();

    viewModel.errorMessage = 'Category in use';
    viewModel._notify();

    const error = container.querySelector('[data-role="error"]');
    expect(error.textContent).toContain('Category in use');
    expect(error.querySelector('.q-orders-alert')).not.toBeNull();
  });

  it('renders the 403 Forbidden state when viewModel.isForbidden is true', async () => {
    view.mount(container);
    await tick();

    viewModel.isForbidden = true;
    viewModel._notify();

    const forbidden = container.querySelector('.q-admin-applications-forbidden');
    expect(forbidden).not.toBeNull();
    expect(forbidden.textContent).toContain('403 Forbidden');
    expect(container.querySelector('.q-admin-categories-table')).toBeNull();
  });

  it('removes the DOM and unsubscribes from the view model on destroy()', async () => {
    const unsubscribe = jasmine.createSpy('unsubscribe');
    spyOn(viewModel, 'subscribe').and.returnValue(unsubscribe);

    view.mount(container);
    await tick();

    expect(viewModel.subscribe).toHaveBeenCalled();
    expect(container.querySelector('.q-admin-categories-page')).not.toBeNull();

    view.destroy();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.q-admin-categories-page')).toBeNull();
    expect(view.element).toBeNull();

    view = null;
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

  function mockCategory(overrides = {}) {
    return {
      id: 'cat-1',
      name: 'Electrónica',
      slug: 'electronica',
      description: 'Dispositivos y gadgets',
      ...overrides,
    };
  }

  describe('AdminCategoriesPageView (recovered 1)', () => {
    let container;
    let categoriesApi;
    let viewModel;
    let view;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);

      authStore.setSession({
        user: { id: 'admin-1', username: 'ada' },
        roles: [{ name: 'admin' }],
      });

      categoriesApi = {
        getCategories: jasmine.createSpy('getCategories').and.resolveTo({
          data: [
            mockCategory({ id: 'cat-2', name: 'Textiles', slug: 'textiles' }),
            mockCategory({ id: 'cat-1', name: 'Electrónica', slug: 'electronica' }),
          ],
          meta: { page: 1, per_page: 20, total: 2, total_pages: 1 },
        }),
        createCategory: jasmine.createSpy('createCategory').and.resolveTo({
          data: mockCategory({ id: 'cat-3', name: 'Alimentos', slug: 'alimentos' }),
        }),
        updateCategory: jasmine
          .createSpy('updateCategory')
          .and.callFake((categoryId, payload) =>
            Promise.resolve({ data: mockCategory({ id: categoryId, ...payload }) })
          ),
        deleteCategory: jasmine.createSpy('deleteCategory').and.resolveTo(),
      };

      viewModel = new AdminCategoriesViewModel({ categoriesApi });
      view = new AdminCategoriesPageView({ viewModel });
    });

    afterEach(() => {
      if (view) {
        view.destroy();
        view = null;
      }
      if (container?.parentElement) {
        container.remove();
      }
      authStore.clearSession();
    });

    it('renders an error alert when the view model reports "Category in use"', async () => {
      view.mount(container);
      await tick();

      viewModel.errorMessage = 'Category in use';
      viewModel._notify();

      const error = container.querySelector('[data-role="error"]');
      expect(error.textContent).toContain('Category in use');
      expect(error.querySelector('.q-orders-alert')).not.toBeNull();
    });
  });

  (() => {
    const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

    function mockCategory(overrides = {}) {
      return {
        description: 'Dispositivos y gadgets',
        id: 'cat-1',
        name: 'Electrónica',
        slug: 'electronica',
        ...overrides,
      };
    }

    function createViewModel(overrides = {}) {
      const listeners = new Set();
      const vm = {
        busyIds: new Set(),
        categories: [mockCategory()],
        createFieldError: '',
        editDescription: '',
        editFieldError: '',
        editName: '',
        editingId: null,
        errorMessage: '',
        isCreating: false,
        isForbidden: false,
        isLoading: false,
        meta: { limit: 20, page: 1, total: 1, totalPages: 1 },
        newDescription: '',
        newName: '',
        noticeMessage: '',
        subscribe: jasmine.createSpy('subscribe').and.callFake((listener) => {
          listeners.add(listener);
          return jasmine.createSpy('unsubscribe').and.callFake(() => listeners.delete(listener));
        }),
        _notify() {
          for (const listener of [...listeners]) listener(vm);
        },
        cancelEdit: jasmine.createSpy('cancelEdit').and.callFake(() => {
          vm.editingId = null;
          vm._notify();
        }),
        createCategory: jasmine.createSpy('createCategory').and.resolveTo(true),
        deleteCategory: jasmine.createSpy('deleteCategory').and.resolveTo({ status: 'success' }),
        isBusy: jasmine.createSpy('isBusy').and.callFake((id) => vm.busyIds.has(id)),
        loadCategories: jasmine.createSpy('loadCategories').and.callFake(() => {
          vm._notify();
          return Promise.resolve();
        }),
        saveEdit: jasmine.createSpy('saveEdit').and.resolveTo(true),
        setEditDescription: jasmine.createSpy('setEditDescription').and.callFake((value) => {
          vm.editDescription = value;
          vm._notify();
        }),
        setEditName: jasmine.createSpy('setEditName').and.callFake((value) => {
          vm.editName = value;
          vm._notify();
        }),
        setNewDescription: jasmine.createSpy('setNewDescription').and.callFake((value) => {
          vm.newDescription = value;
          vm._notify();
        }),
        setNewName: jasmine.createSpy('setNewName').and.callFake((value) => {
          vm.newName = value;
          vm._notify();
        }),
        startEdit: jasmine.createSpy('startEdit').and.callFake((category) => {
          vm.editingId = category.id;
          vm.editName = category.name || '';
          vm.editDescription = category.description || '';
          vm._notify();
        }),
        ...overrides,
      };
      return vm;
    }

    describe('AdminCategoriesPageView additional branches (recovered 2)', () => {
      let container;
      let onNavigate;
      let viewModel;
      let view;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        onNavigate = jasmine.createSpy('onNavigate');
        authStore.setSession({
          roles: [{ name: 'admin' }],
          user: { id: 'admin-1', username: 'ada' },
        });
        viewModel = createViewModel();
        view = new AdminCategoriesPageView({ onNavigate, viewModel });
      });

      afterEach(() => {
        view?.destroy();
        view = null;
        container.remove();
        authStore.clearSession();
        authRedirectStore.clearReturnTo();
      });

      it('shows the exact login gate for anonymous visitors and remembers the return path', () => {
        authStore.clearSession();
        spyOn(authRedirectStore, 'setReturnTo');

        view.mount(container);

        const gate = container.querySelector('.q-admin-applications-empty');
        expect(gate).not.toBeNull();
        expect(gate.querySelector('p').textContent).toBe(
          'Debes iniciar sesión como administrador para acceder a este panel.'
        );
        const loginButton = gate.querySelector('button.q-btn--primary');
        expect(loginButton.textContent).toBe('Iniciar sesión');
        expect(viewModel.loadCategories).not.toHaveBeenCalled();

        loginButton.click();
        expect(authRedirectStore.setReturnTo).toHaveBeenCalledWith('/admin/categories');
        expect(onNavigate).toHaveBeenCalledWith('/login');
      });

      it('shows the exact forbidden box for signed-in non-admins at mount', () => {
        authStore.setSession({
          roles: [{ name: 'buyer' }],
          user: { id: 'buyer-1', username: 'brian' },
        });

        view.mount(container);

        const box = container.querySelector(
          '[data-role="content"] .q-admin-applications-forbidden'
        );
        expect(box).not.toBeNull();
        expect(box.getAttribute('role')).toBe('alert');
        expect(box.querySelector('.q-admin-applications-forbidden__code').textContent).toBe(
          '403 Forbidden'
        );
        expect(box.querySelector('.q-admin-applications-forbidden__title').textContent).toBe(
          'Acceso denegado'
        );
        expect(box.querySelector('p:not([class])').textContent).toBe(
          'No tienes permisos de administrador para gestionar categorías.'
        );
        const homeButton = box.querySelector('button.q-btn--primary');
        expect(homeButton.textContent).toBe('Volver al inicio');
        expect(viewModel.loadCategories).not.toHaveBeenCalled();

        homeButton.click();
        expect(onNavigate).toHaveBeenCalledWith('/');
      });

      it('keeps the forbidden home button safe when onNavigate is absent', () => {
        authStore.setSession({ roles: [{ name: 'buyer' }], user: { id: 'buyer-1' } });
        view = new AdminCategoriesPageView({ viewModel });

        view.mount(container);
        const homeButton = container.querySelector('.q-admin-applications-forbidden button');
        expect(() => homeButton.click()).not.toThrow();
      });

      it('caches render() output across calls, mount(), and later renders', () => {
        const rendered = view.render();

        expect(view.render()).toBe(rendered);
        expect(view.mount(container)).toBe(rendered);
        expect(view.render()).toBe(rendered);
        expect(view.element).toBe(rendered);
      });

      it('renders the novalidate create form with exact field metadata and initial values', () => {
        viewModel.newName = 'Mascotas';
        viewModel.newDescription = 'Productos para mascotas';

        view.mount(container);
        const form = container.querySelector('.q-admin-categories-form');
        expect(form.getAttribute('novalidate')).toBe('');

        const nameLabel = form.querySelector('label[for="admin-category-name"]');
        expect(nameLabel.textContent).toBe('Nueva categoría *');
        const nameInput = form.querySelector('#admin-category-name');
        expect(nameInput.name).toBe('name');
        expect(nameInput.type).toBe('text');
        expect(nameInput.maxLength).toBe(80);
        expect(nameInput.placeholder).toBe('Ej. Electrónica');
        expect(nameInput.value).toBe('Mascotas');

        const descriptionLabel = form.querySelector('label[for="admin-category-description"]');
        expect(descriptionLabel.textContent).toBe('Descripción (opcional)');
        const descriptionInput = form.querySelector('#admin-category-description');
        expect(descriptionInput.name).toBe('description');
        expect(descriptionInput.type).toBe('text');
        expect(descriptionInput.maxLength).toBe(500);
        expect(descriptionInput.placeholder).toBe('Breve descripción de la categoría');
        expect(descriptionInput.value).toBe('Productos para mascotas');

        const submitButton = form.querySelector('.q-admin-categories-create-btn');
        expect(submitButton.type).toBe('submit');
        expect(submitButton.textContent).toBe('Crear categoría');
      });

      it('forwards create form input to the view model setters', () => {
        view.mount(container);

        const nameInput = container.querySelector('#admin-category-name');
        nameInput.value = 'Electrónica';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(viewModel.setNewName).toHaveBeenCalledWith('Electrónica');

        const descriptionInput = container.querySelector('#admin-category-description');
        descriptionInput.value = 'Dispositivos';
        descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(viewModel.setNewDescription).toHaveBeenCalledWith('Dispositivos');
      });

      it('clears both create fields when creation succeeds', async () => {
        view.mount(container);
        const nameInput = container.querySelector('#admin-category-name');
        const descriptionInput = container.querySelector('#admin-category-description');
        nameInput.value = 'Nueva categoría';
        descriptionInput.value = 'Nueva descripción';

        container
          .querySelector('.q-admin-categories-form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await tick();

        expect(viewModel.createCategory).toHaveBeenCalled();
        expect(nameInput.value).toBe('');
        expect(descriptionInput.value).toBe('');
      });

      it('keeps both create fields when creation fails', async () => {
        viewModel.createCategory = jasmine.createSpy('createCategory').and.resolveTo(false);
        view.mount(container);
        const nameInput = container.querySelector('#admin-category-name');
        const descriptionInput = container.querySelector('#admin-category-description');
        nameInput.value = 'Mascotas';
        descriptionInput.value = 'Productos para mascotas';

        container
          .querySelector('.q-admin-categories-form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await tick();

        expect(viewModel.createCategory).toHaveBeenCalled();
        expect(nameInput.value).toBe('Mascotas');
        expect(descriptionInput.value).toBe('Productos para mascotas');
      });

      it('renders and clears the exact create-field validation error', () => {
        view.mount(container);
        const error = container.querySelector('[data-role="create-field-error"]');
        expect(error.className).toBe('q-seller-apply-field-error');

        viewModel.createFieldError = 'El nombre de la categoría es obligatorio.';
        viewModel._notify();
        expect(error.textContent).toBe('El nombre de la categoría es obligatorio.');

        viewModel.createFieldError = '';
        viewModel._notify();
        expect(error.textContent).toBe('');
      });

      it('disables the create button and shows Creando… while creating', () => {
        view.mount(container);
        const button = container.querySelector('.q-admin-categories-create-btn');

        viewModel.isCreating = true;
        viewModel._notify();
        expect(button.disabled).toBe(true);
        expect(button.textContent).toBe('Creando…');

        viewModel.isCreating = false;
        viewModel._notify();
        expect(button.disabled).toBe(false);
        expect(button.textContent).toBe('Crear categoría');
      });

      it('renders the exact success notice alert and clears it', () => {
        view.mount(container);
        const notice = container.querySelector('[data-role="notice"]');
        expect(notice.getAttribute('aria-live')).toBe('polite');

        viewModel.noticeMessage = 'Categoría creada correctamente.';
        viewModel._notify();
        expect(notice.querySelector('.q-orders-alert--success').textContent).toBe(
          'Categoría creada correctamente.'
        );

        viewModel.noticeMessage = '';
        viewModel._notify();
        expect(notice.children.length).toBe(0);
      });

      it('shows the exact empty and loading messages', () => {
        viewModel.categories = [];
        view.mount(container);
        const content = container.querySelector('[data-role="content"]');

        expect(content.textContent).toBe('No hay categorías registradas.');
        expect(content.querySelector('.q-admin-categories-empty')).not.toBeNull();

        viewModel.isLoading = true;
        viewModel._notify();
        expect(content.textContent).toBe('Cargando categorías…');
      });

      it('marks the table wrapper as busy while loading', () => {
        view.mount(container);

        viewModel.isLoading = true;
        viewModel._notify();
        let wrap = container.querySelector('.q-admin-categories-table-wrap');
        expect(wrap.classList.contains('is-loading')).toBe(true);
        expect(wrap.getAttribute('aria-busy')).toBe('true');

        viewModel.isLoading = false;
        viewModel._notify();
        wrap = container.querySelector('.q-admin-categories-table-wrap');
        expect(wrap.classList.contains('is-loading')).toBe(false);
        expect(wrap.hasAttribute('aria-busy')).toBe(false);
      });

      it('marks a busy row and disables its edit and delete buttons', () => {
        view.mount(container);

        viewModel.busyIds.add('cat-1');
        viewModel._notify();
        const row = container.querySelector('tr[data-category-id="cat-1"]');

        expect(row.getAttribute('aria-busy')).toBe('true');
        expect(row.querySelector('.q-admin-categories-edit-btn').disabled).toBe(true);
        expect(row.querySelector('.q-admin-categories-delete-btn').disabled).toBe(true);
      });

      it('disables inline edit inputs, save, and cancel for a busy row', () => {
        view.mount(container);

        viewModel.busyIds.add('cat-1');
        viewModel.editingId = 'cat-1';
        viewModel.editName = 'Electrónica';
        viewModel.editDescription = 'Dispositivos';
        viewModel._notify();
        const row = container.querySelector('tr[data-category-id="cat-1"]');
        const inputs = [...row.querySelectorAll('.q-admin-categories-edit-input')];

        expect(inputs.length).toBe(2);
        expect(inputs.every((input) => input.disabled)).toBe(true);
        const saveButton = row.querySelector('.q-admin-categories-save-btn');
        expect(saveButton.textContent).toBe('Guardando…');
        expect(saveButton.disabled).toBe(true);
        const cancelButton = row.querySelector('.q-admin-categories-cancel-btn');
        expect(cancelButton.textContent).toBe('Cancelar');
        expect(cancelButton.disabled).toBe(true);
      });

      it('renders inline edit fields with exact labels, values, error, and slug fallback', () => {
        viewModel.categories = [mockCategory({ slug: '' })];
        view.mount(container);

        viewModel.editingId = 'cat-1';
        viewModel.editName = 'Electrónica Premium';
        viewModel.editDescription = 'Nueva descripción';
        viewModel.editFieldError = 'El nombre debe tener entre 2 y 80 caracteres.';
        viewModel._notify();
        const row = container.querySelector('tr[data-category-id="cat-1"]');
        const nameInput = row.querySelector('input[aria-label="Editar nombre de categoría"]');
        const descriptionInput = row.querySelector(
          'input[aria-label="Editar descripción de categoría"]'
        );

        expect(nameInput.maxLength).toBe(80);
        expect(nameInput.value).toBe('Electrónica Premium');
        expect(descriptionInput.maxLength).toBe(500);
        expect(descriptionInput.value).toBe('Nueva descripción');
        expect(row.querySelector('.q-seller-apply-field-error').textContent).toBe(
          'El nombre debe tener entre 2 y 80 caracteres.'
        );
        expect(row.querySelectorAll('td')[1].textContent).toBe('—');
      });

      it('forwards inline edit input changes to the view model setters', () => {
        view.mount(container);
        viewModel.editingId = 'cat-1';
        viewModel._notify();

        const nameInput = container.querySelector('input[aria-label="Editar nombre de categoría"]');
        nameInput.value = 'Otro nombre';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(viewModel.setEditName).toHaveBeenCalledWith('Otro nombre');

        const descriptionInput = container.querySelector(
          'input[aria-label="Editar descripción de categoría"]'
        );
        descriptionInput.value = 'Otra descripción';
        descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
        expect(viewModel.setEditDescription).toHaveBeenCalledWith('Otra descripción');
      });

      it('uses row fallbacks for missing values and keeps null _cell content empty', () => {
        viewModel.categories = [mockCategory({ description: undefined, name: '', slug: null })];
        view.mount(container);
        const row = container.querySelector('tr[data-category-id="cat-1"]');

        expect([...row.querySelectorAll('td')].slice(0, 3).map((cell) => cell.textContent)).toEqual(
          ['—', '—', '—']
        );

        const node = document.createElement('strong');
        node.textContent = 'nodo';
        const nodeCell = view._cell('Etiqueta', node);
        expect(nodeCell.dataset.label).toBe('Etiqueta');
        expect(nodeCell.firstChild).toBe(node);
        expect(view._cell('Nulo', null).textContent).toBe('');
      });

      it('opens the delete modal with exact options and delegates confirmation', async () => {
        let modal;
        spyOn(DeleteConfirmModal.prototype, 'open').and.callFake(function () {
          modal = this;
          return Promise.resolve({ confirmed: false });
        });

        view.mount(container);
        container.querySelector('.q-admin-categories-delete-btn').click();

        expect(modal).toBeDefined();
        expect(modal.productId).toBe('cat-1');
        expect(modal.title).toBe('Eliminar categoría');
        // DeleteConfirmModal maps the itemName option onto its productName field.
        expect(modal.productName).toBe('Electrónica');
        expect(modal.fallbackItemName).toBe('esta categoría');
        expect(modal.errorFallback).toBe('No se pudo eliminar la categoría.');
        expect(typeof modal.onConfirm).toBe('function');

        void modal.onConfirm();
        await tick();
        expect(viewModel.deleteCategory).toHaveBeenCalledWith('cat-1');
      });

      it('omits the pager when there is only one page', () => {
        view.mount(container);
        expect(container.querySelector('.q-orders-page__pagination')).toBeNull();
      });

      it('renders the pager with exact label and enforces page and loading rules', () => {
        viewModel.meta = { limit: 20, page: 1, total: 60, totalPages: 3 };
        view.mount(container);
        let pager = container.querySelector('.q-orders-page__pagination');

        expect(pager.getAttribute('aria-label')).toBe('Paginación de categorías');
        expect(pager.querySelector('.q-pagination-info').textContent).toBe('Página 1 de 3');
        expect(pager.querySelector('.q-pagination-prev').disabled).toBe(true);
        expect(pager.querySelector('.q-pagination-next').disabled).toBe(false);

        pager.querySelector('.q-pagination-next').click();
        expect(viewModel.loadCategories).toHaveBeenCalledWith(2);

        viewModel.meta.page = 3;
        viewModel._notify();
        pager = container.querySelector('.q-orders-page__pagination');
        expect(pager.querySelector('.q-pagination-info').textContent).toBe('Página 3 de 3');
        expect(pager.querySelector('.q-pagination-prev').disabled).toBe(false);
        expect(pager.querySelector('.q-pagination-next').disabled).toBe(true);
        pager.querySelector('.q-pagination-prev').click();
        expect(viewModel.loadCategories).toHaveBeenCalledWith(2);

        viewModel.isLoading = true;
        viewModel._notify();
        pager = container.querySelector('.q-orders-page__pagination');
        expect(pager.querySelector('.q-pagination-prev').disabled).toBe(true);
        expect(pager.querySelector('.q-pagination-next').disabled).toBe(true);
      });

      it('unsubscribes once, ignores later notifications, and stays safe on repeated destroy', () => {
        view.mount(container);
        const rendered = view.element;
        const unsubscribe = viewModel.subscribe.calls.mostRecent().returnValue;
        const content = container.querySelector('[data-role="content"]');
        const before = content.textContent;

        view.destroy();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(container.querySelector('.q-admin-categories-page')).toBeNull();
        expect(view.element).toBeNull();

        viewModel.noticeMessage = 'No debe aparecer.';
        viewModel._notify();
        expect(content.textContent).toBe(before);

        expect(() => view.destroy()).not.toThrow();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(view.render()).not.toBe(rendered);
      });

      it('characterizes the gate-wipe bug: a form notification re-renders the table while anonymous', () => {
        authStore.clearSession();
        view.mount(container);
        expect(container.querySelector('.q-admin-applications-empty')).not.toBeNull();

        const nameInput = container.querySelector('#admin-category-name');
        nameInput.value = 'Mascotas';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));

        expect(viewModel.setNewName).toHaveBeenCalledWith('Mascotas');
        expect(container.querySelector('.q-admin-applications-empty')).toBeNull();
        expect(container.querySelector('.q-admin-categories-table')).not.toBeNull();
        expect(viewModel.loadCategories).not.toHaveBeenCalled();
      });

      it('characterizes the live-form bug: submitting while gated still creates and clears inputs', async () => {
        authStore.clearSession();
        viewModel.createCategory = jasmine.createSpy('createCategory').and.callFake(() => {
          viewModel._notify();
          return Promise.resolve(true);
        });
        view.mount(container);
        const nameInput = container.querySelector('#admin-category-name');
        const descriptionInput = container.querySelector('#admin-category-description');
        nameInput.value = 'Mascotas';
        descriptionInput.value = 'Productos para mascotas';

        container
          .querySelector('.q-admin-categories-form')
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await tick();

        expect(viewModel.createCategory).toHaveBeenCalled();
        expect(nameInput.value).toBe('');
        expect(descriptionInput.value).toBe('');
        expect(viewModel.loadCategories).not.toHaveBeenCalled();
        expect(container.querySelector('.q-admin-applications-empty')).toBeNull();
      });
    });
  })();
})();
