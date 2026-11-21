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
