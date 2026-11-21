import { SellerProductFormViewModel } from './SellerProductFormViewModel.js';

describe('SellerProductFormViewModel', () => {
  let productsApi;
  let categories;
  let vm;

  beforeEach(() => {
    productsApi = {
      createProduct: jasmine.createSpy('createProduct').and.resolveTo({
        data: { id: 'prod-123', slug: 'test-product', state: 'draft' },
        meta: {},
      }),
      uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
        data: {
          id: 'img-1',
          path: 'https://example.com/img1.png',
          alt_text: 'img.png',
          position: 0,
        },
        meta: {},
      }),
      publishProduct: jasmine.createSpy('publishProduct').and.resolveTo({
        data: { id: 'prod-123', state: 'published' },
        meta: {},
      }),
      deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
    };
    categories = [
      { id: 'cat-1', name: 'Electrónica', slug: 'electronica' },
      { id: 'cat-2', name: 'Ropa', slug: 'ropa' },
    ];
    vm = new SellerProductFormViewModel({ productsApi, categories });
  });

  it('1. setField updates form field and clears that field error', () => {
    vm.fieldErrors.name = 'Required';
    vm.setField('name', 'Test');
    expect(vm.form.name).toBe('Test');
    expect(vm.fieldErrors.name).toBeUndefined();
  });

  it('setField does not notify subscribers (prevents re-render on typing)', () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);
    const initialCallCount = notifySpy.calls.count();

    vm.setField('name', 'New name');

    expect(notifySpy.calls.count()).toBe(initialCallCount);
    expect(vm.form.name).toBe('New name');
  });

  it('submitForm still notifies subscribers', async () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);

    await vm.submitForm();

    expect(notifySpy).toHaveBeenCalled();
  });

  it('name changes auto-generate a normalized slug until a slug is edited', () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);

    vm.setField('name', 'Cámara de Acción HD');
    expect(vm.form.slug).toBe('camara-de-accion-hd');
    vm.setField('slug', 'mi-camara');
    vm.setField('name', 'Otra cámara');

    expect(vm.form.slug).toBe('mi-camara');
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('2. submitForm with empty required fields sets fieldErrors and does not call createProduct', async () => {
    const res = await vm.submitForm();

    expect(res.status).toBe('error');
    expect(vm.fieldErrors.name).toBeDefined();
    expect(vm.fieldErrors.price).toBeDefined();
    expect(vm.fieldErrors.categoryId).toBeDefined();
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('3. submitForm with invalid price (0) sets fieldErrors.price', async () => {
    vm.setField('name', 'Laptop Gamer');
    vm.setField('price', '0');
    vm.setField('categoryId', 'cat-1');

    await vm.submitForm();

    expect(vm.fieldErrors.price).toContain('mayor a 0');
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('rejects a manually edited slug outside the lowercase hyphen format', async () => {
    vm.setField('name', 'Laptop Gamer');
    vm.setField('slug', 'Laptop Gamer!');
    vm.setField('price', '1200');
    vm.setField('categoryId', 'cat-1');

    await vm.submitForm();

    expect(vm.fieldErrors.slug).toContain('minúsculas');
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('4. submitForm with invalid attributesText (not JSON) sets fieldErrors.attributesText', async () => {
    vm.setField('name', 'Laptop Gamer');
    vm.setField('price', '1200');
    vm.setField('categoryId', 'cat-1');
    vm.setField('attributesText', '{ invalid json:');

    await vm.submitForm();

    expect(vm.fieldErrors.attributesText).toBe('JSON inválido');
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('5. submitForm with all valid fields calls createProduct with correct payload', async () => {
    vm.setField('name', 'Laptop Gamer');
    vm.setField('price', '1200.50');
    vm.setField('categoryId', 'cat-1');
    vm.setField('currency', 'USD');
    vm.setField('stock', '5');
    vm.setField('description', 'Potente laptop');
    vm.setField('attributesText', '{"ram": "16GB"}');

    await vm.submitForm();

    expect(productsApi.createProduct).toHaveBeenCalledWith({
      name: 'Laptop Gamer',
      slug: 'laptop-gamer',
      price: 1200.5,
      category_id: 'cat-1',
      currency: 'USD',
      stock: 5,
      description: 'Potente laptop',
      attributes: { ram: '16GB' },
    });
  });

  it('6. submitForm success sets productId and productSlug without resetting form values', async () => {
    vm.setField('name', 'Laptop Gamer');
    vm.setField('price', '1200');
    vm.setField('categoryId', 'cat-1');

    const res = await vm.submitForm();

    expect(res.status).toBe('success');
    expect(vm.productId).toBe('prod-123');
    expect(vm.productSlug).toBe('test-product');
    expect(vm.form.name).toBe('Laptop Gamer');
  });

  it('7. submitForm 409 SLUG_ALREADY_EXISTS sets generalError and keeps the form editable', async () => {
    const error = new Error('Slug already exists');
    error.statusCode = 409;
    error.code = 'SLUG_ALREADY_EXISTS';
    productsApi.createProduct.and.rejectWith(error);

    vm.setField('name', 'Laptop Gamer');
    vm.setField('price', '1200');
    vm.setField('categoryId', 'cat-1');

    const res = await vm.submitForm();

    expect(res.status).toBe('error');
    expect(vm.generalError).toContain('Ya existe un producto con ese nombre');
    expect(vm.productId).toBeNull();
  });

  it('8. submitForm 400 VALIDATION_ERROR with details sets fieldErrors', async () => {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.details = [{ field: 'price', message: 'El precio es inválido' }];
    productsApi.createProduct.and.rejectWith(error);

    vm.setField('name', 'Laptop Gamer');
    vm.setField('price', '1200');
    vm.setField('categoryId', 'cat-1');

    const res = await vm.submitForm();

    expect(res.status).toBe('error');
    expect(vm.fieldErrors.price).toBe('El precio es inválido');
  });

  it('12. addFiles with valid file calls uploadProductImage and pushes to images', async () => {
    vm.productId = 'prod-123';
    const validFile = new File(['image-bits'], 'laptop.png', { type: 'image/png' });

    await vm.addFiles([validFile]);

    expect(productsApi.uploadProductImage).toHaveBeenCalledWith(
      'prod-123',
      validFile,
      jasmine.objectContaining({ alt_text: 'laptop.png' })
    );
    expect(vm.images.length).toBe(1);
    expect(vm.canPublish).toBe(true);
  });

  it('13. addFiles with tooLargeFile adds to uploadErrors and does not call uploadProductImage', async () => {
    vm.productId = 'prod-123';
    const largeFile = new File([''], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6 MiB

    await vm.addFiles([largeFile]);

    expect(productsApi.uploadProductImage).not.toHaveBeenCalled();
    expect(vm.uploadErrors.length).toBe(1);
    expect(vm.uploadErrors[0].filename).toBe('huge.jpg');
    expect(vm.uploadErrors[0].message).toContain('excede');
  });

  it('14. addFiles when images.length === 5 adds IMAGE_LIMIT_REACHED error and does not upload', async () => {
    vm.productId = 'prod-123';
    vm.images = [1, 2, 3, 4, 5].map((i) => ({ id: `img-${i}` }));
    const extraFile = new File(['bits'], 'extra.png', { type: 'image/png' });

    await vm.addFiles([extraFile]);

    expect(productsApi.uploadProductImage).not.toHaveBeenCalled();
    expect(vm.uploadErrors.length).toBe(1);
    expect(vm.uploadErrors[0].message).toContain('IMAGE_LIMIT_REACHED');
  });

  it('15. publish calls publishProduct(productId) and sets publishedSuccess = true', async () => {
    vm.productId = 'prod-123';
    vm.images = [{ id: 'img-1' }];

    const res = await vm.publish();

    expect(res.status).toBe('success');
    expect(productsApi.publishProduct).toHaveBeenCalledWith('prod-123');
    expect(vm.publishedSuccess).toBe(true);
  });

  it('16. publish 422 IMAGE_REQUIRED sets a visible error without changing page phase', async () => {
    const error = new Error('Image required');
    error.statusCode = 422;
    error.code = 'IMAGE_REQUIRED';
    productsApi.publishProduct.and.rejectWith(error);

    vm.productId = 'prod-123';
    vm.images = [{ id: 'img-1' }];

    const res = await vm.publish();

    expect(res.status).toBe('error');
    expect(vm.generalError).toContain('imagen');
    expect(vm.productId).toBe('prod-123');
  });

  it('17. publish 409 INVALID_STATE_TRANSITION sets generalError', async () => {
    const error = new Error('Invalid transition');
    error.statusCode = 409;
    error.code = 'INVALID_STATE_TRANSITION';
    productsApi.publishProduct.and.rejectWith(error);

    vm.productId = 'prod-123';
    vm.images = [{ id: 'img-1' }];

    const res = await vm.publish();

    expect(res.status).toBe('error');
    expect(vm.generalError).toContain('estado');
  });

  // ─── deleteImage ─────────────────────────────────────────────────────────

  it('18. deleteImage happy path: removes image from list, deletingImageId reset to null', async () => {
    vm.productId = 'prod-123';
    vm.images = [
      { id: 'i1', path: 'https://example.com/1.png' },
      { id: 'i2', path: 'https://example.com/2.png' },
    ];
    const result = await vm.deleteImage('i1');

    expect(result).toEqual({ status: 'success' });
    expect(vm.images.length).toBe(1);
    expect(vm.images[0].id).toBe('i2');
    expect(vm.deletingImageId).toBeNull();
    expect(productsApi.deleteProductImage).toHaveBeenCalledWith('prod-123', 'i1');
  });

  it('19. deleting the last image preserves the draft phase and blocks publishing', async () => {
    vm.productId = 'prod-123';
    vm.images = [{ id: 'i1', path: 'https://example.com/1.png' }];
    const result = await vm.deleteImage('i1');

    expect(result).toEqual({ status: 'success' });
    expect(vm.images.length).toBe(0);
    expect(vm.publishBlockedReason).toContain('imagen');
    expect(vm.canPublish).toBe(false);
  });

  it('20. deleteImage error: sets imageErrors entry, images unchanged, deletingImageId reset', async () => {
    const err = new Error('CANNOT_DELETE_LAST_IMAGE');
    err.statusCode = 409;
    productsApi.deleteProductImage.and.rejectWith(err);

    vm.productId = 'prod-123';
    vm.images = [{ id: 'i1', path: 'https://example.com/1.png' }];

    const result = await vm.deleteImage('i1');

    expect(result.status).toBe('error');
    expect(vm.imageErrors['i1']).toContain('CANNOT_DELETE_LAST_IMAGE');
    expect(vm.images.length).toBe(1);
    expect(vm.deletingImageId).toBeNull();
  });

  it('21. deleteImage guard: second call while deletingImageId is set returns { status: "busy" } and API not called twice', async () => {
    // Slow promise we can hold open
    let resolveDelete;
    productsApi.deleteProductImage.and.returnValue(new Promise((r) => (resolveDelete = r)));

    vm.productId = 'prod-123';
    vm.images = [
      { id: 'i1', path: 'https://example.com/1.png' },
      { id: 'i2', path: 'https://example.com/2.png' },
    ];

    const firstCall = vm.deleteImage('i1');
    const secondResult = await vm.deleteImage('i2'); // should be blocked

    expect(secondResult).toEqual({ status: 'busy' });
    expect(productsApi.deleteProductImage).toHaveBeenCalledTimes(1);

    resolveDelete(undefined);
    await firstCall;
  });

  it('22. deleteImage notifies subscribers on success and in finally', async () => {
    const spy = jasmine.createSpy('notify');
    vm.subscribe(spy);

    vm.productId = 'prod-123';
    vm.images = [{ id: 'i1', path: 'https://example.com/1.png' }];

    spy.calls.reset();
    await vm.deleteImage('i1');

    // At minimum: notify on start (deletingImageId set) + notify in finally
    expect(spy).toHaveBeenCalled();
    expect(spy.calls.count()).toBeGreaterThanOrEqual(2);
  });
});
