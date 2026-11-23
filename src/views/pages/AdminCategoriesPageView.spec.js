import { authStore } from '../../store/authStore.js';
import { AdminCategoriesViewModel } from '../../viewmodels/pages/AdminCategoriesViewModel.js';
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
