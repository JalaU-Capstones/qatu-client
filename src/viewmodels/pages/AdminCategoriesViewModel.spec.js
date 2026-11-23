import { AdminCategoriesViewModel } from './AdminCategoriesViewModel.js';

describe('AdminCategoriesViewModel', () => {
  let categoriesApi;
  let viewModel;

  const category = (overrides = {}) => ({
    id: 'c1',
    name: 'Electrónica',
    slug: 'electronica',
    description: 'Dispositivos',
    ...overrides,
  });

  const listResponse = (data, meta = {}) => ({
    data,
    meta: {
      page: 1,
      per_page: 20,
      total: data.length,
      total_pages: 1,
      ...meta,
    },
  });

  const buildApi = (overrides = {}) => ({
    getCategories: jasmine
      .createSpy('getCategories')
      .and.resolveTo(listResponse([category({ id: 'c2', name: 'Zeta' }), category({ id: 'c1' })])),
    createCategory: jasmine
      .createSpy('createCategory')
      .and.resolveTo({ data: category({ id: 'c3', name: 'Alimentos', slug: 'alimentos' }) }),
    updateCategory: jasmine
      .createSpy('updateCategory')
      .and.callFake((categoryId, payload) =>
        Promise.resolve({ data: category({ id: categoryId, ...payload }) })
      ),
    deleteCategory: jasmine.createSpy('deleteCategory').and.resolveTo(),
    ...overrides,
  });

  beforeEach(() => {
    categoriesApi = buildApi();
    viewModel = new AdminCategoriesViewModel({ categoriesApi });
  });

  describe('loadCategories', () => {
    it('loads the categories and maps the pagination meta', async () => {
      const listener = jasmine.createSpy('listener');
      viewModel.subscribe(listener);

      await viewModel.loadCategories(1);

      expect(categoriesApi.getCategories).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(viewModel.categories.map((item) => item.id)).toEqual(['c2', 'c1']);
      expect(viewModel.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
      expect(viewModel.isLoading).toBe(false);
      expect(viewModel.isForbidden).toBe(false);
      expect(listener).toHaveBeenCalled();
    });

    it('flags isForbidden and clears the list when the API answers 403', async () => {
      const forbidden = new Error('Forbidden');
      forbidden.statusCode = 403;
      forbidden.code = 'FORBIDDEN';
      categoriesApi.getCategories.and.rejectWith(forbidden);

      await viewModel.loadCategories(1);

      expect(viewModel.isForbidden).toBe(true);
      expect(viewModel.errorMessage).toContain('403 Forbidden');
      expect(viewModel.categories).toEqual([]);
      expect(viewModel.isLoading).toBe(false);
    });

    it('exposes a generic error message when loading fails for another reason', async () => {
      categoriesApi.getCategories.and.rejectWith(new Error('Network down'));

      await viewModel.loadCategories(1);

      expect(viewModel.isForbidden).toBe(false);
      expect(viewModel.errorMessage).toBe('Network down');
      expect(viewModel.categories).toEqual([]);
    });
  });

  describe('createCategory', () => {
    it('rejects an empty name locally without calling the API', async () => {
      viewModel.setNewName('   ');

      const result = await viewModel.createCategory();

      expect(result).toBe(false);
      expect(viewModel.createFieldError).toBe('El nombre de la categoría es obligatorio.');
      expect(categoriesApi.createCategory).not.toHaveBeenCalled();
      expect(viewModel.isCreating).toBe(false);
    });

    it('rejects a name shorter than 2 characters locally without calling the API', async () => {
      viewModel.setNewName('A');

      const result = await viewModel.createCategory();

      expect(result).toBe(false);
      expect(viewModel.createFieldError).toBe('El nombre debe tener entre 2 y 80 caracteres.');
      expect(categoriesApi.createCategory).not.toHaveBeenCalled();
    });

    it('creates a category, sorts the list, clears the form and notifies the callback', async () => {
      const onCategoriesChanged = jasmine.createSpy('onCategoriesChanged');
      viewModel = new AdminCategoriesViewModel({ categoriesApi, onCategoriesChanged });
      await viewModel.loadCategories(1);

      viewModel.setNewName('  Alimentos  ');
      viewModel.setNewDescription('  Productos frescos  ');

      const result = await viewModel.createCategory();

      expect(result).toBe(true);
      expect(categoriesApi.createCategory).toHaveBeenCalledWith({
        name: 'Alimentos',
        description: 'Productos frescos',
      });
      expect(viewModel.categories.map((item) => item.name)).toEqual([
        'Alimentos',
        'Electrónica',
        'Zeta',
      ]);
      expect(viewModel.newName).toBe('');
      expect(viewModel.newDescription).toBe('');
      expect(viewModel.createFieldError).toBe('');
      expect(viewModel.noticeMessage).toContain('creada');
      expect(viewModel.meta.total).toBe(3);
      expect(onCategoriesChanged).toHaveBeenCalledWith(viewModel.categories);
    });

    it('sends a null description when the description is blank', async () => {
      viewModel.setNewName('Alimentos');
      viewModel.setNewDescription('   ');

      await viewModel.createCategory();

      expect(categoriesApi.createCategory).toHaveBeenCalledWith({
        name: 'Alimentos',
        description: null,
      });
    });

    it('keeps the form state and exposes the server message on a 409 conflict', async () => {
      const conflict = new Error('Category already exists');
      conflict.statusCode = 409;
      conflict.code = 'CONFLICT';
      categoriesApi.createCategory.and.rejectWith(conflict);
      viewModel.setNewName('Electrónica');

      const result = await viewModel.createCategory();

      expect(result).toBe(false);
      expect(viewModel.errorMessage).toBe('Category already exists');
      expect(viewModel.createFieldError).toBe('');
      expect(viewModel.newName).toBe('Electrónica');
      expect(viewModel.isCreating).toBe(false);
      expect(viewModel.noticeMessage).toBe('');
    });

    it('flags isForbidden when creating a category answers 403', async () => {
      const forbidden = new Error('Forbidden');
      forbidden.statusCode = 403;
      forbidden.code = 'FORBIDDEN';
      categoriesApi.createCategory.and.rejectWith(forbidden);
      viewModel.setNewName('Electrónica');

      const result = await viewModel.createCategory();

      expect(result).toBe(false);
      expect(viewModel.isForbidden).toBe(true);
      expect(viewModel.errorMessage).toContain('403 Forbidden');
    });
  });

  describe('startEdit / saveEdit / cancelEdit', () => {
    it('startEdit copies the category into the inline edit state and notifies', () => {
      const listener = jasmine.createSpy('listener');
      viewModel.subscribe(listener);
      const target = category({ id: 'c9', name: 'Hogar', description: 'Casa' });

      viewModel.startEdit(target);

      expect(viewModel.editingId).toBe('c9');
      expect(viewModel.editName).toBe('Hogar');
      expect(viewModel.editDescription).toBe('Casa');
      expect(viewModel.editFieldError).toBe('');
      expect(viewModel.errorMessage).toBe('');
      expect(listener).toHaveBeenCalled();
    });

    it('saveEdit rejects an empty name locally without calling the API', async () => {
      await viewModel.loadCategories(1);
      viewModel.startEdit(viewModel.categories[0]);
      viewModel.setEditName('   ');

      const result = await viewModel.saveEdit(viewModel.categories[0].id);

      expect(result).toBe(false);
      expect(viewModel.editFieldError).toBe('El nombre de la categoría es obligatorio.');
      expect(categoriesApi.updateCategory).not.toHaveBeenCalled();
      expect(viewModel.editingId).toBe(viewModel.categories[0].id);
    });

    it('saveEdit updates the category, closes the edit mode and notifies the callback', async () => {
      const onCategoriesChanged = jasmine.createSpy('onCategoriesChanged');
      viewModel = new AdminCategoriesViewModel({ categoriesApi, onCategoriesChanged });
      await viewModel.loadCategories(1);
      const target = viewModel.categories[1];
      viewModel.startEdit(target);
      viewModel.setEditName('  Tecnología  ');
      viewModel.setEditDescription('  Gadgets  ');

      const result = await viewModel.saveEdit(target.id);

      expect(result).toBe(true);
      expect(categoriesApi.updateCategory).toHaveBeenCalledWith(target.id, {
        name: 'Tecnología',
        description: 'Gadgets',
      });
      expect(viewModel.categories[1].name).toBe('Tecnología');
      expect(viewModel.categories[1].description).toBe('Gadgets');
      expect(viewModel.editingId).toBeNull();
      expect(viewModel.editName).toBe('');
      expect(viewModel.editDescription).toBe('');
      expect(viewModel.noticeMessage).toContain('actualizada');
      expect(onCategoriesChanged).toHaveBeenCalledWith(viewModel.categories);
    });

    it('saveEdit keeps the edit mode and exposes the server error on failure', async () => {
      const conflict = new Error('Category already exists');
      conflict.statusCode = 409;
      conflict.code = 'CONFLICT';
      categoriesApi.updateCategory.and.rejectWith(conflict);
      await viewModel.loadCategories(1);
      const target = viewModel.categories[0];
      viewModel.startEdit(target);
      viewModel.setEditName('Duplicada');

      const result = await viewModel.saveEdit(target.id);

      expect(result).toBe(false);
      expect(viewModel.errorMessage).toBe('Category already exists');
      expect(viewModel.editingId).toBe(target.id);
      expect(viewModel.categories[0].name).toBe(target.name);
    });

    it('cancelEdit clears the inline edit state and notifies', () => {
      const listener = jasmine.createSpy('listener');
      viewModel.startEdit(category());
      viewModel.setEditName('Cambio');
      viewModel.subscribe(listener);

      viewModel.cancelEdit();

      expect(viewModel.editingId).toBeNull();
      expect(viewModel.editName).toBe('');
      expect(viewModel.editDescription).toBe('');
      expect(viewModel.editFieldError).toBe('');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('removes the category and returns a success status', async () => {
      const onCategoriesChanged = jasmine.createSpy('onCategoriesChanged');
      viewModel = new AdminCategoriesViewModel({ categoriesApi, onCategoriesChanged });
      await viewModel.loadCategories(1);
      const targetId = viewModel.categories[0].id;

      const result = await viewModel.deleteCategory(targetId);

      expect(result).toEqual({ status: 'success' });
      expect(categoriesApi.deleteCategory).toHaveBeenCalledWith(targetId);
      expect(viewModel.categories.map((item) => item.id)).not.toContain(targetId);
      expect(viewModel.meta.total).toBe(1);
      expect(viewModel.noticeMessage).toContain('eliminada');
      expect(viewModel.busyIds.has(targetId)).toBe(false);
      expect(onCategoriesChanged).toHaveBeenCalledWith(viewModel.categories);
    });

    it('preserves the category and returns an error status on a 409 conflict', async () => {
      const conflict = new Error('Category in use');
      conflict.statusCode = 409;
      conflict.code = 'CONFLICT';
      categoriesApi.deleteCategory.and.rejectWith(conflict);
      await viewModel.loadCategories(1);
      const targetId = viewModel.categories[0].id;
      const before = viewModel.categories.map((item) => item.id);

      const result = await viewModel.deleteCategory(targetId);

      expect(result.status).toBe('error');
      expect(result.error).toBe(conflict);
      expect(viewModel.categories.map((item) => item.id)).toEqual(before);
      expect(viewModel.errorMessage).toBe('Category in use');
      expect(viewModel.noticeMessage).toBe('');
      expect(viewModel.busyIds.has(targetId)).toBe(false);
    });

    it('flags isForbidden and returns an error status on a 403 response', async () => {
      const forbidden = new Error('Forbidden');
      forbidden.statusCode = 403;
      forbidden.code = 'FORBIDDEN';
      categoriesApi.deleteCategory.and.rejectWith(forbidden);
      await viewModel.loadCategories(1);
      const targetId = viewModel.categories[0].id;

      const result = await viewModel.deleteCategory(targetId);

      expect(result.status).toBe('error');
      expect(result.error).toBe(forbidden);
      expect(viewModel.isForbidden).toBe(true);
      expect(viewModel.errorMessage).toContain('403 Forbidden');
      expect(viewModel.categories.length).toBe(2);
    });
  });
});
