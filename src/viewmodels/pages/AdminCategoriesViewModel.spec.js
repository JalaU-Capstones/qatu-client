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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('AdminCategoriesViewModel additional branches (recovered 1)', () => {
      let api;
      let viewModel;
      let unsubscribers;

      const category = (overrides = {}) => ({
        id: 'c1',
        name: 'Librería',
        slug: 'libreria',
        description: 'Libros',
        ...overrides,
      });

      const listResponse = (data = [], meta = {}) => ({
        data,
        meta: { page: 1, per_page: 20, total: data.length, total_pages: 1, ...meta },
      });

      const pending = () => {
        let resolve;
        const promise = new Promise((done) => {
          resolve = done;
        });
        return { promise, resolve };
      };

      const subscribe = (listener) => {
        unsubscribers.push(viewModel.subscribe(listener));
      };

      beforeEach(() => {
        api = {
          getCategories: jasmine
            .createSpy('getCategories')
            .and.resolveTo(listResponse([category(), category({ id: 'c2', name: 'Zeta' })])),
          createCategory: jasmine
            .createSpy('createCategory')
            .and.resolveTo({ data: category({ id: 'c-new', name: 'Nueva' }) }),
          updateCategory: jasmine
            .createSpy('updateCategory')
            .and.callFake((id, payload) => Promise.resolve({ data: { id, ...payload } })),
          deleteCategory: jasmine.createSpy('deleteCategory').and.resolveTo(),
        };
        viewModel = new AdminCategoriesViewModel({ categoriesApi: api });
        unsubscribers = [];
      });

      afterEach(() => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
      });

      describe('name validation (recovered 2)', () => {
        it('accepts the 2- and 80-character boundaries and trims the value', async () => {
          viewModel.setNewName('  Ab  ');
          await expectAsync(viewModel.createCategory()).toBeResolvedTo(true);
          expect(api.createCategory).toHaveBeenCalledWith({ name: 'Ab', description: null });

          viewModel.setNewName(`  ${'a'.repeat(80)}  `);
          await expectAsync(viewModel.createCategory()).toBeResolvedTo(true);
          expect(api.createCategory.calls.mostRecent().args[0].name.length).toBe(80);
          expect(viewModel.createFieldError).toBe('');
        });

        it('rejects 81 characters and non-string names', async () => {
          viewModel.setNewName('a'.repeat(81));
          await expectAsync(viewModel.createCategory()).toBeResolvedTo(false);
          expect(viewModel.createFieldError).toBe('El nombre debe tener entre 2 y 80 caracteres.');

          for (const value of [null, undefined, 123]) {
            viewModel.setNewName(value);
            await expectAsync(viewModel.createCategory()).toBeResolvedTo(false);
            expect(viewModel.createFieldError).toBe('El nombre de la categoría es obligatorio.');
          }
          expect(api.createCategory).not.toHaveBeenCalled();
        });
      });

      describe('loadCategories (recovered 3)', () => {
        it('maps per_page/total_pages aliases and the requested page when meta is partial', async () => {
          api.getCategories.and.resolveTo({
            data: [category()],
            meta: { per_page: 15, total_pages: 4 },
          });

          await viewModel.loadCategories(2);

          expect(api.getCategories).toHaveBeenCalledWith({ page: 2, limit: 20 });
          expect(viewModel.meta).toEqual({ page: 2, limit: 15, total: 1, totalPages: 4 });
        });

        it('maps limit/totalPages aliases and string numbers', async () => {
          api.getCategories.and.resolveTo({
            data: [category(), category({ id: 'c2', name: 'Zeta' })],
            meta: { page: '3', limit: '25', total: '7', totalPages: '2' },
          });

          await viewModel.loadCategories(1);

          expect(viewModel.meta).toEqual({ page: 3, limit: 25, total: 7, totalPages: 2 });
        });

        it('defaults missing meta, treats non-array data as empty and resets forbidden state', async () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);
          viewModel.isForbidden = true;
          viewModel.errorMessage = 'old error';
          api.getCategories.and.resolveTo({ data: 'not-an-array' });

          await viewModel.loadCategories(4);

          expect(viewModel.categories).toEqual([]);
          expect(viewModel.meta).toEqual({ page: 4, limit: 20, total: 0, totalPages: 1 });
          expect(viewModel.isForbidden).toBe(false);
          expect(viewModel.errorMessage).toBe('');
          expect(listener.calls.count()).toBeGreaterThan(1);
          expect(listener).toHaveBeenCalledWith(viewModel);

          api.getCategories.and.resolveTo({ data: [], meta: { total: 0, total_pages: 0 } });
          await viewModel.loadCategories(4);
          expect(viewModel.categories).toEqual([]);
          expect(viewModel.meta).toEqual({ page: 4, limit: 20, total: 0, totalPages: 1 });
        });

        it('detects 403 by code only and by status code only', async () => {
          for (const error of [{ code: 'FORBIDDEN' }, { statusCode: 403 }]) {
            api.getCategories.and.rejectWith(error);

            await viewModel.loadCategories(1);

            expect(viewModel.isForbidden).toBe(true);
            expect(viewModel.errorMessage).toBe(
              '403 Forbidden: No tienes permisos de administrador.'
            );
          }
        });

        it('falls back to the default message and keeps a stale forbidden flag on generic errors', async () => {
          api.getCategories.and.rejectWith({});

          await viewModel.loadCategories(1);

          expect(viewModel.errorMessage).toBe('No se pudieron cargar las categorías.');
          expect(viewModel.isForbidden).toBe(false);

          viewModel.isForbidden = true;
          await viewModel.loadCategories(1);
          expect(viewModel.isForbidden).toBe(true);
        });
      });

      describe('createCategory (recovered 4)', () => {
        it('short-circuits while a creation is in flight', async () => {
          viewModel.isCreating = true;

          await expectAsync(viewModel.createCategory()).toBeResolvedTo(false);

          expect(api.createCategory).not.toHaveBeenCalled();
          expect(api.getCategories).not.toHaveBeenCalled();
        });

        it('reloads the list when the API response has no data', async () => {
          const onCategoriesChanged = jasmine.createSpy('onCategoriesChanged');
          viewModel = new AdminCategoriesViewModel({ categoriesApi: api, onCategoriesChanged });
          const reloaded = [category({ id: 'reloaded', name: 'Recargada' })];
          api.createCategory.and.resolveTo({});
          api.getCategories.and.resolveTo(listResponse(reloaded, { total: 1 }));
          viewModel.setNewName('Nueva');

          await expectAsync(viewModel.createCategory()).toBeResolvedTo(true);

          expect(api.getCategories).toHaveBeenCalledWith({ page: 1, limit: 20 });
          expect(viewModel.categories).toEqual(reloaded);
          expect(viewModel.meta.total).toBe(1);
          expect(viewModel.noticeMessage).toBe('Categoría creada correctamente.');
          expect(onCategoriesChanged).toHaveBeenCalledWith(reloaded);
        });

        it('reports code-only forbidden errors and the generic fallback without clearing the form', async () => {
          api.createCategory.and.rejectWith({ code: 'FORBIDDEN' });
          viewModel.setNewName('Repetida');

          await expectAsync(viewModel.createCategory()).toBeResolvedTo(false);

          expect(viewModel.isForbidden).toBe(true);
          expect(viewModel.errorMessage).toBe(
            '403 Forbidden: No tienes permisos de administrador.'
          );
          expect(viewModel.newName).toBe('Repetida');
          expect(viewModel.isCreating).toBe(false);

          api.createCategory.and.rejectWith({});
          await expectAsync(viewModel.createCategory()).toBeResolvedTo(false);
          expect(viewModel.errorMessage).toBe('No se pudo crear la categoría.');
        });

        it('characterizes the TypeError when the description is null', async () => {
          viewModel.setNewName('Café');
          viewModel.setNewDescription(null);

          await expectAsync(viewModel.createCategory()).toBeResolvedTo(false);

          expect(api.createCategory).not.toHaveBeenCalled();
          expect(viewModel.errorMessage).toMatch(/trim|function/i);
          expect(viewModel.isCreating).toBe(false);
          expect(viewModel.newName).toBe('Café');
        });
      });

      describe('inline edit state (recovered 5)', () => {
        it('startEdit falls back to empty strings for falsy name and description', () => {
          viewModel.startEdit(category({ id: 'c3', name: '', description: null }));

          expect(viewModel.editingId).toBe('c3');
          expect(viewModel.editName).toBe('');
          expect(viewModel.editDescription).toBe('');
          expect(viewModel.errorMessage).toBe('');
        });

        it('cancelEdit is a no-op without state and clears an error-only state', () => {
          const listener = jasmine.createSpy('listener');
          subscribe(listener);

          viewModel.cancelEdit();

          expect(listener).not.toHaveBeenCalled();

          viewModel.editFieldError = 'stale error';
          viewModel.cancelEdit();

          expect(viewModel.editingId).toBeNull();
          expect(viewModel.editFieldError).toBe('');
          expect(listener).toHaveBeenCalledWith(viewModel);
        });

        it('description setters notify without clearing field errors, name setters do clear them', async () => {
          viewModel.setNewName(' ');
          await viewModel.createCategory();
          expect(viewModel.createFieldError).not.toBe('');

          viewModel.setNewDescription('Descripción');
          expect(viewModel.newDescription).toBe('Descripción');
          expect(viewModel.createFieldError).not.toBe('');

          viewModel.setNewName('Válida');
          expect(viewModel.createFieldError).toBe('');

          viewModel.startEdit(category());
          viewModel.setEditName(' ');
          await viewModel.saveEdit('c1');
          expect(viewModel.editFieldError).not.toBe('');

          viewModel.setEditDescription('Otra descripción');
          expect(viewModel.editDescription).toBe('Otra descripción');
          expect(viewModel.editFieldError).not.toBe('');

          viewModel.setEditName('Renombrada');
          expect(viewModel.editFieldError).toBe('');
        });
      });

      describe('saveEdit (recovered 6)', () => {
        it('rejects missing and busy ids before calling the API', async () => {
          viewModel.startEdit(category());

          for (const id of [null, undefined, '', 0]) {
            await expectAsync(viewModel.saveEdit(id)).toBeResolvedTo(false);
          }
          viewModel.busyIds.add('c1');
          await expectAsync(viewModel.saveEdit('c1')).toBeResolvedTo(false);

          expect(api.updateCategory).not.toHaveBeenCalled();
          expect(viewModel.editFieldError).toBe('');
        });

        it('marks the id busy in flight, clears messages and notifies subscribers', async () => {
          const slow = pending();
          api.updateCategory.and.returnValue(slow.promise);
          const listener = jasmine.createSpy('listener');
          subscribe(listener);
          viewModel.startEdit(category());
          viewModel.setEditName('Renombrada');
          viewModel.errorMessage = 'old error';
          viewModel.noticeMessage = 'old notice';

          const saving = viewModel.saveEdit('c1');

          expect(viewModel.isBusy('c1')).toBe(true);
          expect(viewModel.errorMessage).toBe('');
          expect(viewModel.noticeMessage).toBe('');
          expect(listener).toHaveBeenCalledWith(viewModel);

          slow.resolve({ data: category({ id: 'c1', name: 'Renombrada' }) });
          await expectAsync(saving).toBeResolvedTo(true);

          expect(viewModel.isBusy('c1')).toBe(false);
          expect(viewModel.busyIds.size).toBe(0);
        });

        it('uses a synthetic updated category when the response has no data', async () => {
          await viewModel.loadCategories(1);
          viewModel.startEdit(viewModel.categories[0]);
          viewModel.setEditName('  Renombrada  ');
          viewModel.setEditDescription('   ');
          api.updateCategory.and.resolveTo(undefined);

          await expectAsync(viewModel.saveEdit('c1')).toBeResolvedTo(true);

          expect(api.updateCategory).toHaveBeenCalledWith('c1', {
            name: 'Renombrada',
            description: null,
          });
          expect(viewModel.categories[0].name).toBe('Renombrada');
          expect(viewModel.categories[0].description).toBeNull();
          expect(viewModel.categories[0].slug).toBe('libreria');
          expect(viewModel.editingId).toBeNull();
          expect(viewModel.noticeMessage).toBe('Categoría actualizada correctamente.');
        });

        it('reports code-only forbidden and generic errors while keeping edit state', async () => {
          api.updateCategory.and.rejectWith({ code: 'FORBIDDEN' });
          viewModel.startEdit(category());
          viewModel.setEditName('Renombrada');

          await expectAsync(viewModel.saveEdit('c1')).toBeResolvedTo(false);

          expect(viewModel.isForbidden).toBe(true);
          expect(viewModel.errorMessage).toBe(
            '403 Forbidden: No tienes permisos de administrador.'
          );
          expect(viewModel.editingId).toBe('c1');
          expect(viewModel.isBusy('c1')).toBe(false);

          api.updateCategory.and.rejectWith({});
          await expectAsync(viewModel.saveEdit('c1')).toBeResolvedTo(false);
          expect(viewModel.errorMessage).toBe('No se pudo actualizar la categoría.');
        });

        it('characterizes the TypeError when the edit description is null', async () => {
          viewModel.startEdit(category());
          viewModel.setEditName('Renombrada');
          viewModel.setEditDescription(null);

          await expectAsync(viewModel.saveEdit('c1')).toBeResolvedTo(false);

          expect(api.updateCategory).not.toHaveBeenCalled();
          expect(viewModel.errorMessage).toMatch(/trim|function/i);
          expect(viewModel.isBusy('c1')).toBe(false);
          expect(viewModel.editingId).toBe('c1');
        });
      });

      describe('deleteCategory (recovered 7)', () => {
        it('rejects missing and busy ids with an error status', async () => {
          for (const id of [null, undefined, '', 0]) {
            const result = await viewModel.deleteCategory(id);
            expect(result.status).toBe('error');
            expect(result.error.message).toBe('Operación en curso.');
          }
          viewModel.busyIds.add('c1');
          const busy = await viewModel.deleteCategory('c1');

          expect(busy.status).toBe('error');
          expect(api.deleteCategory).not.toHaveBeenCalled();
        });

        it('tracks in-flight deletion and clears the busy state afterwards', async () => {
          const slow = pending();
          api.deleteCategory.and.returnValue(slow.promise);
          const listener = jasmine.createSpy('listener');
          subscribe(listener);

          const removing = viewModel.deleteCategory('c1');

          expect(viewModel.isBusy('c1')).toBe(true);
          expect(listener).toHaveBeenCalledWith(viewModel);

          slow.resolve();
          await expectAsync(removing).toBeResolvedTo({ status: 'success' });

          expect(viewModel.isBusy('c1')).toBe(false);
          expect(viewModel.busyIds.size).toBe(0);
        });

        it('clears editingId but leaves stale edit fields and clamps the total at zero', async () => {
          await viewModel.loadCategories(1);
          viewModel.meta.total = 0;
          viewModel.startEdit(viewModel.categories[0]);
          const staleName = viewModel.editName;
          const staleDescription = viewModel.editDescription;

          await expectAsync(viewModel.deleteCategory('c1')).toBeResolvedTo({ status: 'success' });

          expect(viewModel.editingId).toBeNull();
          expect(viewModel.editName).toBe(staleName);
          expect(viewModel.editDescription).toBe(staleDescription);
          expect(viewModel.meta.total).toBe(0);
          expect(viewModel.categories.map((item) => item.id)).not.toContain('c1');
        });

        it('detects 403 by code alone and uses the generic fallback message', async () => {
          api.deleteCategory.and.rejectWith({ code: 'FORBIDDEN' });

          let result = await viewModel.deleteCategory('c1');

          expect(result.status).toBe('error');
          expect(result.error).toEqual({ code: 'FORBIDDEN' });
          expect(viewModel.isForbidden).toBe(true);
          expect(viewModel.errorMessage).toBe(
            '403 Forbidden: No tienes permisos de administrador.'
          );
          expect(viewModel.isBusy('c1')).toBe(false);

          api.deleteCategory.and.rejectWith({});
          result = await viewModel.deleteCategory('c1');

          expect(result.error).toEqual({});
          expect(viewModel.errorMessage).toBe('No se pudo eliminar la categoría.');
          expect(viewModel.isBusy('c1')).toBe(false);
        });
      });

      it('notifies multiple subscribers and stops after unsubscribe', () => {
        const first = jasmine.createSpy('first');
        const second = jasmine.createSpy('second');
        const unsubscribeFirst = viewModel.subscribe(first);
        unsubscribers.push(unsubscribeFirst);
        unsubscribers.push(viewModel.subscribe(second));

        viewModel.setNewName('Uno');

        expect(first).toHaveBeenCalledWith(viewModel);
        expect(second).toHaveBeenCalledWith(viewModel);

        unsubscribeFirst();
        viewModel.setNewDescription('Dos');

        expect(first.calls.count()).toBe(1);
        expect(second.calls.count()).toBe(2);
      });
    });
  })();
})();
