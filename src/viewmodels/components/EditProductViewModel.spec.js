import { EditProductViewModel } from './EditProductViewModel.js';

function mockProduct(overrides = {}) {
  return {
    id: 'prod-123',
    seller_id: 'seller-1',
    category_id: 'cat-1',
    name: 'Sample Product',
    slug: 'sample-product',
    description: 'A great product',
    price: 50,
    currency: 'USD',
    stock: 10,
    state: 'draft',
    attributes: { color: 'red' },
    ...overrides,
  };
}

describe('EditProductViewModel', () => {
  let productsApi;
  let categoriesApi;
  let vm;

  beforeEach(() => {
    productsApi = {
      getProductById: jasmine.createSpy('getProductById').and.resolveTo(mockProduct()),
      listProductImages: jasmine.createSpy('listProductImages').and.resolveTo({ data: [] }),
      updateProduct: jasmine.createSpy('updateProduct').and.resolveTo({
        data: mockProduct({ name: 'Updated Product' }),
        meta: {},
      }),
      uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
        data: { id: 'image-1', path: '/image.webp', alt_text: 'Frente', position: 0 },
      }),
      deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
    };

    categoriesApi = {
      getAll: jasmine.createSpy('getAll').and.resolveTo([
        { id: 'cat-1', name: 'Electronics' },
        { id: 'cat-2', name: 'Apparel' },
      ]),
    };

    vm = new EditProductViewModel({ productsApi, categoriesApi });
  });

  it('1. load() fetches product + categories in parallel', async () => {
    const res = await vm.load('prod-123');

    expect(productsApi.getProductById).toHaveBeenCalledWith('prod-123');
    expect(categoriesApi.getAll).toHaveBeenCalled();
    expect(res.status).toBe('success');
    expect(vm.categories.length).toBe(2);
    expect(vm.loadedProduct).not.toBeNull();
  });

  it('2. load() populates form correctly from a full product DTO (all 7 fields)', async () => {
    await vm.load('prod-123');

    expect(vm.form.name).toBe('Sample Product');
    expect(vm.form.description).toBe('A great product');
    expect(vm.form.price).toBe('50');
    expect(vm.form.stock).toBe('10');
    expect(vm.form.currency).toBe('USD');
    expect(vm.form.categoryId).toBe('cat-1');
    expect(JSON.parse(vm.form.attributesText)).toEqual({ color: 'red' });
  });

  it('3. load() handles empty attributes -> attributesText === ""', async () => {
    productsApi.getProductById.and.resolveTo(mockProduct({ attributes: {} }));

    await vm.load('prod-123');

    expect(vm.form.attributesText).toBe('');
  });

  it('4. load() handles non-empty attributes -> attributesText is valid JSON', async () => {
    productsApi.getProductById.and.resolveTo(
      mockProduct({ attributes: { size: 'XL', material: 'cotton' } })
    );

    await vm.load('prod-123');

    const parsed = JSON.parse(vm.form.attributesText);
    expect(parsed).toEqual({ size: 'XL', material: 'cotton' });
  });

  it('5. load() sets isLoading true during the fetch, false after', async () => {
    const loadingStates = [];
    vm.subscribe((v) => loadingStates.push(v.isLoading));

    await vm.load('prod-123');

    expect(loadingStates).toContain(true);
    expect(vm.isLoading).toBe(false);
  });

  it('6. load() sets errorMessage and returns { status: "error" } on 404', async () => {
    productsApi.getProductById.and.rejectWith(new Error('Product not found'));

    const res = await vm.load('prod-999');

    expect(res.status).toBe('error');
    expect(vm.errorMessage).toBe('Product not found');
    expect(vm.isLoading).toBe(false);
  });

  it('7. load() works when categoriesApi is null (product-only fetch)', async () => {
    const noCatVm = new EditProductViewModel({ productsApi, categoriesApi: null });

    const res = await noCatVm.load('prod-123');

    expect(res.status).toBe('success');
    expect(noCatVm.categories).toEqual([]);
    expect(noCatVm.loadedProduct.id).toBe('prod-123');
  });

  it('8. setField("name", "new") updates form.name without notifying', () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);
    const initialCallCount = notifySpy.calls.count();

    vm.setField('name', 'new');

    expect(vm.form.name).toBe('new');
    expect(notifySpy.calls.count()).toBe(initialCallCount);
  });

  it('load still notifies subscribers', async () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);

    await vm.load('prod-123');

    expect(notifySpy).toHaveBeenCalled();
  });

  it('save still notifies subscribers', async () => {
    await vm.load('prod-123');
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);
    vm.setField('name', 'Updated Product');

    await vm.save();

    expect(notifySpy).toHaveBeenCalled();
  });

  it('9. buildUpdatePayload() returns null when nothing changed', async () => {
    await vm.load('prod-123');

    expect(vm.buildUpdatePayload()).toBeNull();
  });

  it('10. buildUpdatePayload() returns { name } when only name changed', async () => {
    await vm.load('prod-123');
    vm.setField('name', 'Brand New Name');

    const payload = vm.buildUpdatePayload();
    expect(payload).toEqual({ name: 'Brand New Name' });
  });

  it('11. buildUpdatePayload() returns { price: 99.99 } when price string "99.99" differs from loaded 50', async () => {
    await vm.load('prod-123');
    vm.setField('price', '99.99');

    const payload = vm.buildUpdatePayload();
    expect(payload).toEqual({ price: 99.99 });
  });

  it('12. buildUpdatePayload() returns { attributes: { color: "blue" } } when attributesText parses to different object', async () => {
    await vm.load('prod-123');
    vm.setField('attributesText', '{"color": "blue"}');

    const payload = vm.buildUpdatePayload();
    expect(payload).toEqual({ attributes: { color: 'blue' } });
  });

  it('13. buildUpdatePayload() returns null when attributesText is empty (preservation semantics)', async () => {
    await vm.load('prod-123'); // loaded has { color: 'red' }
    vm.setField('attributesText', '');

    expect(vm.buildUpdatePayload()).toBeNull();
  });

  it('14. buildUpdatePayload() throws VALIDATION_ERROR on invalid JSON attributes', async () => {
    await vm.load('prod-123');
    vm.setField('attributesText', '{invalid json');

    expect(() => vm.buildUpdatePayload()).toThrowMatching((err) => {
      return err.code === 'VALIDATION_ERROR' && err.message === 'attributes must be valid JSON';
    });
  });

  it('15. buildUpdatePayload() includes currency when changed on draft product', async () => {
    await vm.load('prod-123');
    vm.setField('currency', 'BOB');

    const payload = vm.buildUpdatePayload();
    expect(payload).toEqual({ currency: 'BOB' });
  });

  it('16. save() returns { status: "no-changes" } when payload is null, no API call', async () => {
    await vm.load('prod-123');

    const res = await vm.save();

    expect(res.status).toBe('no-changes');
    expect(vm.infoMessage).toBe('No hay cambios para guardar.');
    expect(productsApi.updateProduct).not.toHaveBeenCalled();
  });

  it('17. save() calls updateProduct(id, payload) on success, updates loadedProduct with response', async () => {
    await vm.load('prod-123');
    vm.setField('name', 'Updated Product');

    const res = await vm.save();

    expect(productsApi.updateProduct).toHaveBeenCalledWith('prod-123', {
      name: 'Updated Product',
    });
    expect(res.status).toBe('success');
    expect(vm.loadedProduct.name).toBe('Updated Product');
  });

  it('18. save() returns { status: "error" } and sets errorMessage on 409 CANNOT_CHANGE_CURRENCY_ON_PUBLISHED', async () => {
    await vm.load('prod-123');
    vm.setField('currency', 'EUR');

    const err409 = new Error('CANNOT_CHANGE_CURRENCY_ON_PUBLISHED');
    err409.statusCode = 409;
    productsApi.updateProduct.and.rejectWith(err409);

    const res = await vm.save();

    expect(res.status).toBe('error');
    expect(vm.errorMessage).toBe('CANNOT_CHANGE_CURRENCY_ON_PUBLISHED');
    expect(vm.isSaving).toBe(false);
  });

  it('19. save() is idempotent: second call while isSaving does not call API twice', async () => {
    await vm.load('prod-123');
    vm.setField('name', 'In-Flight Update');

    let resolveSave;
    productsApi.updateProduct.and.returnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );

    const p1 = vm.save();
    expect(vm.isSaving).toBe(true);

    const p2 = await vm.save();
    expect(p2.status).toBe('no-changes');
    expect(productsApi.updateProduct.calls.count()).toBe(1);

    resolveSave({ data: mockProduct({ name: 'In-Flight Update' }), meta: {} });
    await p1;
    expect(vm.isSaving).toBe(false);
  });

  it('20. isDirty getter returns true when form has changes, false when not', async () => {
    await vm.load('prod-123');

    expect(vm.isDirty).toBe(false);

    vm.setField('name', 'Changed Name');
    expect(vm.isDirty).toBe(true);

    vm.setField('name', 'Sample Product'); // reset back to loaded
    expect(vm.isDirty).toBe(false);

    vm.setField('attributesText', '{broken'); // throws in buildUpdatePayload
    expect(vm.isDirty).toBe(true); // dirty getter tolerates throws and returns true
  });

  it('loads image records and exposes image-list errors without hiding the product', async () => {
    productsApi.listProductImages.and.resolveTo({
      data: [
        { id: 'image-2', position: 1 },
        { id: 'image-1', position: 0 },
      ],
    });
    await vm.load('prod-123');
    expect(vm.images.map((image) => image.id)).toEqual(['image-1', 'image-2']);

    productsApi.listProductImages.and.rejectWith(new Error('Images unavailable'));
    await vm.load('prod-123');
    expect(vm.loadedProduct.id).toBe('prod-123');
    expect(vm.imageErrorMessage).toBe('Images unavailable');
  });

  it('uploads images with accessible alt text and deletes them through the product API', async () => {
    await vm.load('prod-123');
    const file = new File(['image'], 'bag.webp', { type: 'image/webp' });

    await vm.addImages([file], 'Vista frontal');
    expect(productsApi.uploadProductImage).toHaveBeenCalledWith('prod-123', file, {
      alt_text: 'Vista frontal',
      position: 0,
    });
    expect(vm.images.length).toBe(1);

    const result = await vm.deleteImage('image-1');
    expect(result.status).toBe('success');
    expect(productsApi.deleteProductImage).toHaveBeenCalledWith('prod-123', 'image-1');
    expect(vm.images).toEqual([]);
  });

  it('does not upload past the five-image limit', async () => {
    await vm.load('prod-123');
    vm.images = Array.from({ length: 5 }, (_, position) => ({ id: `image-${position}`, position }));
    const file = new File(['image'], 'extra.png', { type: 'image/png' });

    await vm.addImages([file]);

    expect(productsApi.uploadProductImage).not.toHaveBeenCalled();
    expect(vm.uploadErrors[0].message).toContain('hasta 5 imágenes');
  });

  it('rejects invalid required values and does not include currency changes for published products', async () => {
    await vm.load('prod-123');
    vm.setField('name', 'ab');
    expect(() => vm.buildUpdatePayload()).toThrowError(
      'El nombre debe tener entre 3 y 200 caracteres.'
    );

    productsApi.getProductById.and.resolveTo(mockProduct({ state: 'published' }));
    await vm.load('prod-123');
    vm.setField('currency', 'EUR');
    expect(vm.buildUpdatePayload()).toBeNull();
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
  function mockProduct(overrides = {}) {
    return {
      id: 'prod-123',
      seller_id: 'seller-1',
      category_id: 'cat-1',
      name: 'Sample Product',
      slug: 'sample-product',
      description: 'A great product',
      price: 50,
      currency: 'USD',
      stock: 10,
      state: 'draft',
      attributes: { color: 'red' },
      ...overrides,
    };
  }

  describe('EditProductViewModel (recovered 1)', () => {
    let productsApi;
    let categoriesApi;
    let vm;

    beforeEach(() => {
      productsApi = {
        getProductById: jasmine.createSpy('getProductById').and.resolveTo(mockProduct()),
        listProductImages: jasmine.createSpy('listProductImages').and.resolveTo({ data: [] }),
        updateProduct: jasmine.createSpy('updateProduct').and.resolveTo({
          data: mockProduct({ name: 'Updated Product' }),
          meta: {},
        }),
        uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
          data: { id: 'image-1', path: '/image.webp', alt_text: 'Frente', position: 0 },
        }),
        deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
      };

      categoriesApi = {
        getAll: jasmine.createSpy('getAll').and.resolveTo([
          { id: 'cat-1', name: 'Electronics' },
          { id: 'cat-2', name: 'Apparel' },
        ]),
      };

      vm = new EditProductViewModel({ productsApi, categoriesApi });
    });

    it('3. load() handles empty attributes -> attributesText === ""', async () => {
      productsApi.getProductById.and.resolveTo(mockProduct({ attributes: {} }));

      await vm.load('prod-123');

      expect(vm.form.attributesText).toBe('');
    });

    it('6. load() sets errorMessage and returns { status: "error" } on 404', async () => {
      productsApi.getProductById.and.rejectWith(new Error('Product not found'));

      const res = await vm.load('prod-999');

      expect(res.status).toBe('error');
      expect(vm.errorMessage).toBe('Product not found');
      expect(vm.isLoading).toBe(false);
    });

    it('8. setField("name", "new") updates form.name without notifying', () => {
      const notifySpy = jasmine.createSpy('notify');
      vm.subscribe(notifySpy);
      const initialCallCount = notifySpy.calls.count();

      vm.setField('name', 'new');

      expect(vm.form.name).toBe('new');
      expect(notifySpy.calls.count()).toBe(initialCallCount);
    });

    it('11. buildUpdatePayload() returns { price: 99.99 } when price string "99.99" differs from loaded 50', async () => {
      await vm.load('prod-123');
      vm.setField('price', '99.99');

      const payload = vm.buildUpdatePayload();
      expect(payload).toEqual({ price: 99.99 });
    });

    it('12. buildUpdatePayload() returns { attributes: { color: "blue" } } when attributesText parses to different object', async () => {
      await vm.load('prod-123');
      vm.setField('attributesText', '{"color": "blue"}');

      const payload = vm.buildUpdatePayload();
      expect(payload).toEqual({ attributes: { color: 'blue' } });
    });

    it('16. save() returns { status: "no-changes" } when payload is null, no API call', async () => {
      await vm.load('prod-123');

      const res = await vm.save();

      expect(res.status).toBe('no-changes');
      expect(vm.infoMessage).toBe('No hay cambios para guardar.');
      expect(productsApi.updateProduct).not.toHaveBeenCalled();
    });

    it('18. save() returns { status: "error" } and sets errorMessage on 409 CANNOT_CHANGE_CURRENCY_ON_PUBLISHED', async () => {
      await vm.load('prod-123');
      vm.setField('currency', 'EUR');

      const err409 = new Error('CANNOT_CHANGE_CURRENCY_ON_PUBLISHED');
      err409.statusCode = 409;
      productsApi.updateProduct.and.rejectWith(err409);

      const res = await vm.save();

      expect(res.status).toBe('error');
      expect(vm.errorMessage).toBe('CANNOT_CHANGE_CURRENCY_ON_PUBLISHED');
      expect(vm.isSaving).toBe(false);
    });
  });

  (() => {
    function baseProduct(overrides = {}) {
      return {
        id: 'prod-1',
        category_id: 'cat-1',
        name: 'Sample Product',
        description: 'A great product',
        price: 50,
        currency: 'USD',
        stock: 10,
        state: 'draft',
        attributes: { color: 'red' },
        ...overrides,
      };
    }

    function defaultForm(overrides = {}) {
      return {
        name: 'Sample Product',
        description: 'A great product',
        price: '50',
        stock: '10',
        currency: 'USD',
        categoryId: 'cat-1',
        attributesText: '',
        ...overrides,
      };
    }

    function expectValidationError(viewModel, message) {
      expect(() => viewModel.buildUpdatePayload()).toThrowMatching(
        (error) => error.code === 'VALIDATION_ERROR' && error.message === message
      );
    }

    describe('EditProductViewModel additional branches (recovered 2)', () => {
      let categoriesApi;
      let disposers;
      let productsApi;
      let vm;

      const markLoaded = (
        viewModel,
        productOverrides = {},
        categories = [{ id: 'cat-1', name: 'Electronics' }]
      ) => {
        viewModel.loadedProduct = baseProduct(productOverrides);
        viewModel.categories = categories;
        viewModel._populateFormFromProduct(viewModel.loadedProduct);
      };

      beforeEach(() => {
        productsApi = {
          getProductById: jasmine.createSpy('getProductById').and.resolveTo(baseProduct()),
          listProductImages: jasmine.createSpy('listProductImages').and.resolveTo({ data: [] }),
          updateProduct: jasmine.createSpy('updateProduct').and.resolveTo({ data: baseProduct() }),
          uploadProductImage: jasmine
            .createSpy('uploadProductImage')
            .and.resolveTo({ data: { id: 'img-new', position: 0 } }),
          deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
        };
        categoriesApi = {
          getAll: jasmine.createSpy('getAll').and.resolveTo([{ id: 'cat-1', name: 'Electronics' }]),
        };
        vm = new EditProductViewModel({ productsApi, categoriesApi });
        disposers = [];
      });

      afterEach(() => {
        disposers.forEach((unsubscribe) => unsubscribe());
      });

      it('constructs with no arguments and an empty, non-dirty state', async () => {
        const bare = new EditProductViewModel();

        expect(bare.productsApi).toBeUndefined();
        expect(bare.categoriesApi).toBeNull();
        expect(bare.onChange).toBeNull();
        expect(bare.isLoading).toBe(false);
        expect(bare.isSaving).toBe(false);
        expect(bare.errorMessage).toBe('');
        expect(bare.infoMessage).toBe('');
        expect(bare.loadedProduct).toBeNull();
        expect(bare.form).toEqual({
          name: '',
          description: '',
          price: '',
          stock: '',
          currency: 'USD',
          categoryId: '',
          attributesText: '',
        });
        expect(bare.categories).toEqual([]);
        expect(bare.categoryErrorMessage).toBe('');
        expect(bare.images).toEqual([]);
        expect(bare.imageErrorMessage).toBe('');
        expect(bare.uploadErrors).toEqual([]);
        expect(bare.uploadingCount).toBe(0);
        expect(bare.deletingImageId).toBeNull();
        expect(bare.imageErrors).toEqual({});
        expect(bare.buildUpdatePayload()).toBeNull();
        expect(bare.isDirty).toBe(false);
        await expectAsync(bare.save()).toBeResolvedTo({ status: 'no-changes' });
        expect(bare.infoMessage).toBe('No hay cambios para guardar.');
      });

      it('notifies both the onChange listener and subscribers, and honors unsubscription', async () => {
        const onChange = jasmine.createSpy('onChange');
        const listener = jasmine.createSpy('listener');
        const localVm = new EditProductViewModel({ productsApi, categoriesApi, onChange });
        const unsubscribe = localVm.subscribe(listener);
        disposers.push(unsubscribe);

        await localVm.load('prod-1');
        expect(onChange).toHaveBeenCalledTimes(2);
        expect(listener).toHaveBeenCalledTimes(2);

        unsubscribe();
        await localVm.load('prod-1');
        expect(onChange).toHaveBeenCalledTimes(4);
        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('reads categories from getAll().data and keeps only id and name', async () => {
        categoriesApi.getAll.and.resolveTo({
          data: [{ id: 'cat-1', name: 'Electronics', extra: 'dropped' }],
        });

        await vm.load('prod-1');

        expect(vm.categories).toEqual([{ id: 'cat-1', name: 'Electronics' }]);
        expect(vm.categoryErrorMessage).toBe('');
      });

      it('supports getCategories() with wrapped and direct arrays when getAll is absent', async () => {
        const getCategories = jasmine
          .createSpy('getCategories')
          .and.resolveTo({ data: [{ id: 'cat-2', name: 'Apparel' }] });
        const wrappedVm = new EditProductViewModel({
          productsApi,
          categoriesApi: { getCategories },
        });

        await wrappedVm.load('prod-1');
        expect(wrappedVm.categories).toEqual([{ id: 'cat-2', name: 'Apparel' }]);

        getCategories.and.resolveTo([{ id: 'cat-3', name: 'Books' }]);
        const directVm = new EditProductViewModel({
          productsApi,
          categoriesApi: { getCategories },
        });

        await directVm.load('prod-1');
        expect(directVm.categories).toEqual([{ id: 'cat-3', name: 'Books' }]);
      });

      it('treats a categoriesApi without a supported method as an empty list', async () => {
        const localVm = new EditProductViewModel({ productsApi, categoriesApi: {} });

        await localVm.load('prod-1');

        expect(localVm.categories).toEqual([]);
        expect(localVm.categoryErrorMessage).toBe('');
      });

      it('uses custom and fallback category error messages', async () => {
        categoriesApi.getAll.and.rejectWith(new Error('categorias caidas'));
        await vm.load('prod-1');
        expect(vm.categoryErrorMessage).toBe('categorias caidas');
        expect(vm.categories).toEqual([]);

        categoriesApi.getAll.and.rejectWith({});
        await vm.load('prod-1');
        expect(vm.categoryErrorMessage).toBe('No pudimos cargar las categorías.');
      });

      it('reports the missing listProductImages method as an image-list error', async () => {
        const localVm = new EditProductViewModel({
          productsApi: {
            getProductById: jasmine.createSpy('getProductById').and.resolveTo(baseProduct()),
          },
          categoriesApi: null,
        });

        await localVm.load('prod-1');

        expect(localVm.images).toEqual([]);
        expect(localVm.imageErrorMessage).toBe('No pudimos cargar las imágenes del producto.');
      });

      it('sorts a direct image array by position, treating missing positions as zero', async () => {
        productsApi.listProductImages.and.resolveTo([
          { id: 'i2', position: 2 },
          { id: 'i0' },
          { id: 'i1', position: 1 },
        ]);

        await vm.load('prod-1');

        expect(vm.images.map((image) => image.id)).toEqual(['i0', 'i1', 'i2']);
        expect(vm.imageErrorMessage).toBe('');
      });

      it('uses custom and fallback image-list error messages without failing the load', async () => {
        productsApi.listProductImages.and.rejectWith(new Error('sin imagenes'));
        let result = await vm.load('prod-1');
        expect(result).toEqual({ status: 'success' });
        expect(vm.imageErrorMessage).toBe('sin imagenes');
        expect(vm.images).toEqual([]);
        expect(vm.loadedProduct.id).toBe('prod-1');

        productsApi.listProductImages.and.rejectWith({});
        await vm.load('prod-1');
        expect(vm.imageErrorMessage).toBe('No pudimos cargar las imágenes del producto.');
      });

      it('accepts a null product and leaves the initial form untouched', async () => {
        productsApi.getProductById.and.resolveTo(null);

        const result = await vm.load('missing');

        expect(result).toEqual({ status: 'success' });
        expect(vm.loadedProduct).toBeNull();
        expect(vm.form).toEqual({
          name: '',
          description: '',
          price: '',
          stock: '',
          currency: 'USD',
          categoryId: '',
          attributesText: '',
        });
        expect(vm.isLoading).toBe(false);
      });

      it('notifies subscribers and uses a fallback message when the product load fails', async () => {
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));
        const error = {};
        productsApi.getProductById.and.rejectWith(error);

        const result = await vm.load('prod-1');

        expect(result).toEqual({ status: 'error', error });
        expect(vm.errorMessage).toBe('No pudimos cargar el producto.');
        expect(vm.isLoading).toBe(false);
        expect(listener).toHaveBeenCalledTimes(2);
      });

      it('populates zero values, default currency and empty attributes from a sparse product', async () => {
        productsApi.getProductById.and.resolveTo(
          baseProduct({
            name: null,
            description: null,
            price: 0,
            stock: 0,
            currency: '',
            category_id: null,
            attributes: [],
          })
        );

        await vm.load('prod-1');
        expect(vm.form).toEqual(
          defaultForm({
            name: '',
            description: '',
            price: '0',
            stock: '0',
            currency: 'USD',
            categoryId: '',
            attributesText: '',
          })
        );

        productsApi.getProductById.and.resolveTo(baseProduct({ attributes: 'not-an-object' }));
        await vm.load('prod-1');
        expect(vm.form.attributesText).toBe('');
      });

      it('rejects names outside the 3-200 character range', () => {
        markLoaded(vm);
        vm.setField('name', 'ab');
        expectValidationError(vm, 'El nombre debe tener entre 3 y 200 caracteres.');

        vm.setField('name', 'a'.repeat(201));
        expectValidationError(vm, 'El nombre debe tener entre 3 y 200 caracteres.');
      });

      it('rejects descriptions longer than 5000 characters', () => {
        markLoaded(vm);
        vm.setField('description', 'x'.repeat(5001));

        expectValidationError(vm, 'La descripción no puede exceder 5,000 caracteres.');
      });

      it('rejects empty, non-numeric, zero and negative prices', () => {
        markLoaded(vm);
        for (const price of ['', 'abc', 0, -1]) {
          vm.setField('price', price);
          expectValidationError(vm, 'El precio debe ser mayor a 0.');
        }
      });

      it('rejects empty, non-numeric, negative and fractional stock', () => {
        markLoaded(vm);
        for (const stock of ['', 'abc', -1, '1.5']) {
          vm.setField('stock', stock);
          expectValidationError(vm, 'El stock debe ser un número entero igual o mayor a 0.');
        }
      });

      it('omits an unchanged or empty currency on a draft product', () => {
        markLoaded(vm, { state: 'draft', currency: 'USD' });

        vm.setField('currency', 'USD');
        expect(vm.buildUpdatePayload()).toBeNull();

        vm.setField('currency', '');
        expect(vm.buildUpdatePayload()).toBeNull();
      });

      it('validates a missing category and an unknown category only when a list is present', () => {
        markLoaded(vm);

        vm.setField('categoryId', '');
        expectValidationError(vm, 'Selecciona una categoría.');

        vm.setField('categoryId', 'cat-999');
        expectValidationError(vm, 'Selecciona una categoría válida.');

        vm.categories = [];
        expect(vm.buildUpdatePayload()).toEqual({ category_id: 'cat-999' });
      });

      it('rejects non-object attributes and compares identical JSON without whitespace', () => {
        markLoaded(vm, { attributes: { color: 'red', size: 'M' } });

        for (const raw of ['[]', 'null', '7', '"text"']) {
          vm.setField('attributesText', raw);
          expectValidationError(vm, 'attributes must be a JSON object');
        }

        vm.setField('attributesText', '{ "color": "red", "size": "M" }');
        expect(vm.buildUpdatePayload()).toBeNull();
      });

      it('characterizes attribute key-order sensitivity in the dirty check', () => {
        markLoaded(vm, { attributes: { color: 'red', size: 'M' } });
        vm.setField('attributesText', '{"size":"M","color":"red"}');

        expect(vm.buildUpdatePayload()).toEqual({ attributes: { size: 'M', color: 'red' } });
        expect(vm.isDirty).toBe(true);
      });

      it('returns a validation error from save without calling the API', async () => {
        markLoaded(vm);
        vm.setField('name', 'ab');

        const result = await vm.save();

        expect(result.status).toBe('error');
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toBe('El nombre debe tener entre 3 y 200 caracteres.');
        expect(vm.errorMessage).toBe('El nombre debe tener entre 3 y 200 caracteres.');
        expect(vm.infoMessage).toBe('');
        expect(productsApi.updateProduct).not.toHaveBeenCalled();
        expect(vm.isSaving).toBe(false);
      });

      it('falls back to a generic save error when the rejection has no message', async () => {
        markLoaded(vm);
        vm.setField('name', 'Renamed Product');
        const error = {};
        productsApi.updateProduct.and.rejectWith(error);

        const result = await vm.save();

        expect(result).toEqual({ status: 'error', error });
        expect(vm.errorMessage).toBe('No pudimos guardar.');
        expect(vm.isSaving).toBe(false);
      });

      it('treats null files as an empty upload with no errors', async () => {
        markLoaded(vm);

        await vm.addImages(null);

        expect(productsApi.uploadProductImage).not.toHaveBeenCalled();
        expect(vm.uploadErrors).toEqual([]);
        expect(vm.uploadingCount).toBe(0);
      });

      it('rejects oversized and invalid MIME files but uploads a valid file in the same batch', async () => {
        markLoaded(vm);
        const oversized = { name: 'big.png', size: 5 * 1024 * 1024 + 1, type: 'image/png' };
        const invalidMime = { name: 'bad.gif', size: 10, type: 'image/gif' };
        const valid = { name: 'front.webp', size: 10, type: 'image/webp' };

        await vm.addImages([oversized, invalidMime, valid]);

        expect(vm.uploadErrors).toEqual([
          { filename: 'big.png', message: 'La imagen excede el límite de 5 MB.' },
          { filename: 'bad.gif', message: 'Solo se aceptan imágenes JPEG, PNG o WebP.' },
        ]);
        expect(vm.images.map((image) => image.id)).toEqual(['img-new']);
        expect(vm.uploadingCount).toBe(0);
      });

      it('accepts a file at exactly the 5 MB boundary and resets uploadErrors per call', async () => {
        markLoaded(vm);
        vm.uploadErrors = [{ filename: 'old.png', message: 'old failure' }];

        await vm.addImages([{ name: 'exact.png', size: 5 * 1024 * 1024, type: 'image/png' }]);

        expect(vm.uploadErrors).toEqual([]);
        expect(vm.images.length).toBe(1);
      });

      it('tracks uploadingCount and trims alt text during an in-flight upload', async () => {
        markLoaded(vm);
        let resolveUpload;
        productsApi.uploadProductImage.and.returnValue(
          new Promise((resolve) => {
            resolveUpload = resolve;
          })
        );
        const listener = jasmine.createSpy('listener');
        disposers.push(vm.subscribe(listener));
        const file = { name: 'in-flight.png', size: 10, type: 'image/png' };

        const pending = vm.addImages([file], '  Vista  ');
        expect(vm.uploadingCount).toBe(1);
        expect(listener).toHaveBeenCalled();

        resolveUpload({ data: { id: 'img-1', position: 0 } });
        await pending;

        expect(vm.uploadingCount).toBe(0);
        expect(productsApi.uploadProductImage).toHaveBeenCalledWith('prod-1', file, {
          alt_text: 'Vista',
          position: 0,
        });
      });

      it('falls back to the filename for blank alt text, computes position and re-sorts', async () => {
        markLoaded(vm);
        vm.images = [
          { id: 'i1', position: 1 },
          { id: 'i2', position: 2 },
        ];
        productsApi.uploadProductImage.and.resolveTo({ data: { id: 'i3', position: 0 } });
        vm.imageErrorMessage = 'previous error';

        await vm.addImages([{ name: 'frente.webp', size: 10, type: 'image/webp' }]);

        expect(productsApi.uploadProductImage).toHaveBeenCalledWith('prod-1', jasmine.any(Object), {
          alt_text: 'frente.webp',
          position: 3,
        });
        expect(vm.images.map((image) => image.id)).toEqual(['i3', 'i1', 'i2']);
        expect(vm.imageErrorMessage).toBe('');
      });

      it('characterizes a successful upload response without data leaving the old image error', async () => {
        markLoaded(vm);
        vm.imageErrorMessage = 'previous error';
        productsApi.uploadProductImage.and.resolveTo({});

        await vm.addImages([{ name: 'no-data.png', size: 10, type: 'image/png' }]);

        expect(vm.images).toEqual([]);
        expect(vm.imageErrorMessage).toBe('previous error');
      });

      it('records custom and fallback upload failures and returns the counter to zero', async () => {
        markLoaded(vm);
        productsApi.uploadProductImage.and.rejectWith(new Error('upload boom'));
        await vm.addImages([{ name: 'a.png', size: 10, type: 'image/png' }]);
        expect(vm.uploadErrors).toEqual([{ filename: 'a.png', message: 'upload boom' }]);

        productsApi.uploadProductImage.and.rejectWith({});
        await vm.addImages([{ name: 'b.png', size: 10, type: 'image/png' }]);
        expect(vm.uploadErrors).toEqual([
          { filename: 'b.png', message: 'No pudimos subir la imagen.' },
        ]);
        expect(vm.uploadingCount).toBe(0);
      });

      it('blocks every file in a batch once the image limit is reached', async () => {
        markLoaded(vm);
        vm.images = Array.from({ length: 4 }, (_, position) => ({ id: `i${position}`, position }));
        vm.uploadingCount = 1;

        await vm.addImages([
          { name: 'x.png', size: 10, type: 'image/png' },
          { name: 'y.png', size: 10, type: 'image/png' },
        ]);

        expect(vm.uploadErrors).toEqual([
          { filename: 'x.png', message: 'A cada producto se le permiten hasta 5 imágenes.' },
          { filename: 'y.png', message: 'A cada producto se le permiten hasta 5 imágenes.' },
        ]);
        expect(productsApi.uploadProductImage).not.toHaveBeenCalled();
        expect(vm.uploadingCount).toBe(1);
      });

      it('is busy while a deletion is in flight and ignores a concurrent deletion', async () => {
        markLoaded(vm);
        vm.images = [
          { id: 'i1', position: 0 },
          { id: 'i2', position: 1 },
        ];
        let resolveDelete;
        productsApi.deleteProductImage.and.returnValue(
          new Promise((resolve) => {
            resolveDelete = resolve;
          })
        );

        const first = vm.deleteImage('i1');
        const second = await vm.deleteImage('i2');

        expect(second).toEqual({ status: 'busy' });
        expect(productsApi.deleteProductImage).toHaveBeenCalledTimes(1);
        expect(vm.deletingImageId).toBe('i1');

        resolveDelete();
        await expectAsync(first).toBeResolvedTo({ status: 'success' });
        expect(vm.deletingImageId).toBeNull();
      });

      it('clears a previous image error, removes the image and re-sorts on success', async () => {
        markLoaded(vm);
        vm.images = [
          { id: 'a', position: 0 },
          { id: 'b', position: 2 },
          { id: 'c', position: 1 },
        ];
        vm.imageErrors.a = 'old error';

        const result = await vm.deleteImage('a');

        expect(result).toEqual({ status: 'success' });
        expect(productsApi.deleteProductImage).toHaveBeenCalledWith('prod-1', 'a');
        expect(vm.images.map((image) => image.id)).toEqual(['c', 'b']);
        expect(vm.imageErrors.a).toBeUndefined();
        expect(vm.deletingImageId).toBeNull();
      });

      it('records custom and fallback deletion errors without removing the image', async () => {
        markLoaded(vm);
        vm.images = [{ id: 'i1', position: 0 }];
        const error = new Error('delete boom');
        productsApi.deleteProductImage.and.rejectWith(error);

        let result = await vm.deleteImage('i1');
        expect(result).toEqual({ status: 'error', error });
        expect(vm.imageErrors.i1).toBe('delete boom');
        expect(vm.images.length).toBe(1);
        expect(vm.deletingImageId).toBeNull();

        productsApi.deleteProductImage.and.rejectWith({});
        result = await vm.deleteImage('i1');
        expect(result.status).toBe('error');
        expect(vm.imageErrors.i1).toBe('No pudimos eliminar la imagen.');
      });
    });
  })();
})();
