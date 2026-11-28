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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  describe('SellerProductFormViewModel (recovered 1)', () => {
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

    // ─── deleteImage ─────────────────────────────────────────────────────────

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
  });

  (() => {
    function productsApiMock() {
      return {
        createProduct: jasmine
          .createSpy('createProduct')
          .and.resolveTo({ data: { id: 'p1', slug: 'test-product' } }),
        uploadProductImage: jasmine
          .createSpy('uploadProductImage')
          .and.resolveTo({ data: { id: 'img-1', path: '/img.png' } }),
        publishProduct: jasmine
          .createSpy('publishProduct')
          .and.resolveTo({ data: { id: 'p1', state: 'published' } }),
        deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(),
      };
    }

    function categoriesMock() {
      return [
        { id: 'cat-1', name: 'Electrónica' },
        { id: 'cat-2', name: 'Ropa' },
      ];
    }

    function fillValidForm(vm) {
      vm.setField('name', 'Laptop Gamer');
      vm.setField('price', '1200');
      vm.setField('categoryId', 'cat-1');
    }

    describe('SellerProductFormViewModel additional branches (recovered 2)', () => {
      let productsApi;
      let vm;
      let unsubscribes;

      beforeEach(() => {
        unsubscribes = [];
        productsApi = productsApiMock();
        vm = new SellerProductFormViewModel({ productsApi, categories: categoriesMock() });
      });

      afterEach(() => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
        vm?._listeners?.clear();
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      function watch(target) {
        const listener = jasmine.createSpy('listener');
        unsubscribes.push(target.subscribe(listener));
        return listener;
      }

      it('notifies the constructor onChange for actions but not for typing, and honors unsubscribe', async () => {
        const onChange = jasmine.createSpy('onChange');
        vm = new SellerProductFormViewModel({
          productsApi,
          categories: categoriesMock(),
          onChange,
        });
        expect(vm.onChange).toBe(onChange);

        vm.setField('name', 'Laptop Gamer');
        expect(onChange).not.toHaveBeenCalled();

        const listener = watch(vm);
        await vm.submitForm();
        expect(onChange).toHaveBeenCalledWith(vm);
        expect(listener).toHaveBeenCalledWith(vm);

        onChange.calls.reset();
        listener.calls.reset();
        unsubscribes[unsubscribes.length - 1]();
        await vm.submitForm();
        expect(listener).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalled();
      });

      it('canSubmitForm requires no product, non-blank fields and no in-flight creation', () => {
        fillValidForm(vm);
        expect(vm.canSubmitForm()).toBe(true);

        vm.productId = 'p1';
        expect(vm.canSubmitForm()).toBe(false);
        vm.productId = null;

        vm.form.name = '   ';
        expect(vm.canSubmitForm()).toBe(false);
        vm.form.name = 'Laptop Gamer';

        vm.form.price = '   ';
        expect(vm.canSubmitForm()).toBe(false);
        vm.form.price = '1200';

        vm.form.categoryId = '   ';
        expect(vm.canSubmitForm()).toBe(false);
        vm.form.categoryId = 'cat-1';

        vm.isCreating = true;
        expect(vm.canSubmitForm()).toBe(false);
        vm.isCreating = false;
        expect(vm.canSubmitForm()).toBe(true);
      });

      it('derives canPublish and uploadLimitReached from id, images and in-flight work', () => {
        expect(vm.canPublish).toBe(false);
        expect(vm.uploadLimitReached).toBe(false);

        vm.productId = 'p1';
        expect(vm.canPublish).toBe(false);
        vm.images = [{ id: 'img-1' }];
        expect(vm.canPublish).toBe(true);

        vm.uploadingCount = 1;
        expect(vm.canPublish).toBe(false);
        vm.uploadingCount = 0;
        vm.isPublishing = true;
        expect(vm.canPublish).toBe(false);
        vm.isPublishing = false;
        expect(vm.canPublish).toBe(true);

        vm.images = Array.from({ length: 4 }, (_, index) => ({ id: `i${index}` }));
        expect(vm.uploadLimitReached).toBe(false);
        vm.images.push({ id: 'i4' });
        expect(vm.uploadLimitReached).toBe(true);
      });

      it('validates name, price and category with exact messages', () => {
        fillValidForm(vm);
        const errors = () => vm._validateForm().errors;

        vm.form.name = 'ab';
        expect(errors().name).toBe('El nombre debe tener al menos 3 caracteres.');
        vm.form.name = 'a'.repeat(201);
        expect(errors().name).toBe('El nombre no puede exceder 200 caracteres.');
        vm.form.name = '   ';
        expect(errors().name).toBe('El nombre es obligatorio.');
        vm.form.name = 'Laptop Gamer';

        vm.form.price = 'abc';
        expect(errors().price).toBe('El precio debe ser mayor a 0.');
        vm.form.price = '-5';
        expect(errors().price).toBe('El precio debe ser mayor a 0.');
        vm.form.price = '';
        expect(errors().price).toBe('El precio es obligatorio.');
        vm.form.price = '1200';

        vm.form.categoryId = 'ghost';
        expect(errors().categoryId).toBe('Categoría no válida.');
        vm.form.categoryId = '   ';
        expect(errors().categoryId).toBe('Selecciona una categoría.');
      });

      it('validates description, currency, stock and JSON attributes with exact messages', () => {
        fillValidForm(vm);
        const errors = () => vm._validateForm().errors;

        vm.form.description = 'd'.repeat(5001);
        expect(errors().description).toBe('La descripción no puede exceder 5000 caracteres.');
        vm.form.description = 'ok';

        vm.form.currency = 'XYZ';
        expect(errors().currency).toBe('Moneda no soportada.');
        vm.form.currency = '';
        expect(errors().currency).toBeUndefined();
        vm.form.currency = 'USD';

        for (const stock of ['-1', '1.5', 'abc']) {
          vm.form.stock = stock;
          expect(errors().stock).toBe('El stock debe ser un entero mayor o igual a 0.');
        }
        vm.form.stock = '';
        expect(errors().stock).toBeUndefined();
        vm.form.stock = '0';
        expect(errors().stock).toBeUndefined();

        for (const attributesText of ['null', '[]', '42', '{bad']) {
          vm.form.attributesText = attributesText;
          expect(errors().attributesText).toBe('JSON inválido');
        }
        vm.form.attributesText = '{"color":"red"}';
        const result = vm._validateForm();
        expect(result.isValid).toBe(true);
        expect(result.parsedAttributes).toEqual({ color: 'red' });
      });

      it('omits a blank slug and normalizes defaults and category_id in the payload', async () => {
        vm.setField('name', 'Laptop Gamer');
        vm.form.slug = '   ';
        vm.setField('price', '1200');
        vm.setField('categoryId', 'cat-1');
        vm.form.currency = '';
        vm.form.stock = '';
        vm.form.description = '  ';
        vm.form.attributesText = '  ';

        const result = await vm.submitForm();

        expect(result.status).toBe('success');
        const payload = productsApi.createProduct.calls.mostRecent().args[0];
        expect(Object.keys(payload).sort()).toEqual([
          'attributes',
          'category_id',
          'currency',
          'description',
          'name',
          'price',
          'stock',
        ]);
        expect(payload.name).toBe('Laptop Gamer');
        expect(payload.price).toBe(1200);
        expect(payload.category_id).toBe('cat-1');
        expect(payload.currency).toBe('USD');
        expect(payload.stock).toBe(0);
        expect(payload.description).toBeUndefined();
        expect(payload.attributes).toEqual({});
        expect(Object.hasOwn(payload, 'slug')).toBe(false);
      });

      it('maps 400 details including category_id and a missing message', async () => {
        const error = new Error('Validation failed');
        error.statusCode = 400;
        error.details = [
          { field: 'category_id', message: 'Categoría inexistente' },
          { field: 'price' },
        ];
        productsApi.createProduct.and.rejectWith(error);
        fillValidForm(vm);

        const result = await vm.submitForm();

        expect(result.status).toBe('error');
        expect(vm.fieldErrors).toEqual({
          categoryId: 'Categoría inexistente',
          price: 'Campo inválido',
        });
        expect(vm.generalError).toBe('');
      });

      it('uses generic create errors when details are not an array or the message is blank', async () => {
        fillValidForm(vm);

        const notArray = new Error('');
        notArray.statusCode = 400;
        notArray.details = { price: 'bad' };
        productsApi.createProduct.and.rejectWith(notArray);
        await vm.submitForm();
        expect(vm.generalError).toBe('Error al crear producto');
        expect(vm.fieldErrors).toEqual({});

        productsApi.createProduct.and.rejectWith({});
        await vm.submitForm();
        expect(vm.generalError).toBe('Error al crear producto');

        const conflict = new Error('x');
        conflict.code = 'SLUG_ALREADY_EXISTS';
        productsApi.createProduct.and.rejectWith(conflict);
        await vm.submitForm();
        expect(vm.generalError).toBe('Ya existe un producto con ese nombre. Prueba con otro.');
      });

      it('exposes isCreating during submission', async () => {
        let resolveCreate;
        productsApi.createProduct.and.returnValue(
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
        );
        fillValidForm(vm);
        const listener = watch(vm);

        const pending = vm.submitForm();
        expect(vm.isCreating).toBe(true);
        expect(vm.canSubmitForm()).toBe(false);
        expect(listener).toHaveBeenCalledWith(vm);

        resolveCreate({ data: { id: 'p1', slug: 'laptop-gamer' } });
        await pending;
        expect(vm.isCreating).toBe(false);
        expect(vm.productId).toBe('p1');
      });

      it('ignores falsy file input and files without a MIME type', async () => {
        vm.productId = 'p1';
        await vm.addFiles(null);
        await vm.addFiles(undefined);
        expect(productsApi.uploadProductImage).not.toHaveBeenCalled();
        expect(vm.uploadErrors).toEqual([]);

        const unknownType = new File(['bits'], 'mystery', { type: '' });
        await vm.addFiles([unknownType]);
        expect(productsApi.uploadProductImage).toHaveBeenCalledWith(
          'p1',
          unknownType,
          jasmine.objectContaining({ alt_text: 'mystery', position: 0 })
        );
        expect(vm.uploadErrors).toEqual([]);
      });

      it('reports exact size and MIME validation messages', async () => {
        vm.productId = 'p1';
        const large = new File([''], 'huge.jpg', { type: 'image/jpeg' });
        Object.defineProperty(large, 'size', { value: 5 * 1024 * 1024 + 1 });
        const gif = new File(['bits'], 'anim.gif', { type: 'image/gif' });

        await vm.addFiles([large, gif]);

        expect(vm.uploadErrors).toEqual([
          { filename: 'huge.jpg', message: 'FILE_TOO_LARGE: El archivo excede 5 MB' },
          { filename: 'anim.gif', message: 'INVALID_FILE_FORMAT: Formato no soportado' },
        ]);
        expect(productsApi.uploadProductImage).not.toHaveBeenCalled();

        vm.uploadErrors = [];
        vm.images = Array.from({ length: 5 }, (_, index) => ({ id: `i${index}` }));
        await vm.addFiles([new File(['bits'], 'extra.png', { type: 'image/png' })]);
        expect(vm.uploadErrors).toEqual([
          {
            filename: 'extra.png',
            message: 'IMAGE_LIMIT_REACHED: Límite de 5 imágenes alcanzado',
          },
        ]);
      });

      it('ignores upload responses without data and maps upload failures', async () => {
        vm.productId = 'p1';
        const png = () => new File(['x'], 'a.png', { type: 'image/png' });

        productsApi.uploadProductImage.and.resolveTo({});
        await vm.addFiles([png()]);
        expect(vm.images).toEqual([]);
        expect(vm.uploadErrors).toEqual([]);

        productsApi.uploadProductImage.and.resolveTo(null);
        await vm.addFiles([png()]);
        expect(vm.images).toEqual([]);

        productsApi.uploadProductImage.and.rejectWith(new Error('Upload failed'));
        await vm.addFiles([png()]);
        expect(vm.uploadErrors).toEqual([{ filename: 'a.png', message: 'Upload failed' }]);

        productsApi.uploadProductImage.and.rejectWith({});
        await vm.addFiles([png()]);
        expect(vm.uploadErrors[1]).toEqual({ filename: 'a.png', message: 'Error al subir imagen' });
        expect(vm.uploadingCount).toBe(0);
      });

      it('exposes uploadingCount in flight and blocks canPublish', async () => {
        let resolveUpload;
        productsApi.uploadProductImage.and.returnValue(
          new Promise((resolve) => {
            resolveUpload = resolve;
          })
        );
        vm.productId = 'p1';
        vm.images = [{ id: 'existing' }];
        const file = new File(['x'], 'new.png', { type: 'image/png' });

        const pending = vm.addFiles([file]);
        expect(vm.uploadingCount).toBe(1);
        expect(vm.canPublish).toBe(false);

        resolveUpload({ data: { id: 'img-2' } });
        await pending;
        expect(vm.uploadingCount).toBe(0);
        expect(vm.canPublish).toBe(true);
        expect(productsApi.uploadProductImage.calls.mostRecent().args[2].position).toBe(1);
      });

      it('refuses to publish without a usable product and succeeds otherwise', async () => {
        const refusal = { status: 'error', message: 'Sube al menos una imagen antes de publicar.' };
        await expectAsync(vm.publish()).toBeResolvedTo(refusal);

        vm.productId = 'p1';
        await expectAsync(vm.publish()).toBeResolvedTo(refusal);

        vm.images = [{ id: 'img-1' }];
        vm.uploadingCount = 1;
        await expectAsync(vm.publish()).toBeResolvedTo(refusal);
        vm.uploadingCount = 0;

        vm.isPublishing = true;
        await expectAsync(vm.publish()).toBeResolvedTo(refusal);
        vm.isPublishing = false;

        expect(productsApi.publishProduct).not.toHaveBeenCalled();
        await expectAsync(vm.publish()).toBeResolvedTo({ status: 'success' });
        expect(productsApi.publishProduct).toHaveBeenCalledWith('p1');
        expect(vm.publishedSuccess).toBe(true);
      });

      it('maps 403, FORBIDDEN and generic publish errors', async () => {
        vm.productId = 'p1';
        vm.images = [{ id: 'img-1' }];

        const forbidden = new Error('x');
        forbidden.statusCode = 403;
        productsApi.publishProduct.and.rejectWith(forbidden);
        await vm.publish();
        expect(vm.generalError).toBe('No tienes permiso para publicar este producto');

        const byCode = new Error('x');
        byCode.code = 'FORBIDDEN';
        productsApi.publishProduct.and.rejectWith(byCode);
        await vm.publish();
        expect(vm.generalError).toBe('No tienes permiso para publicar este producto');

        const missingImage = new Error('x');
        missingImage.code = 'IMAGE_REQUIRED';
        productsApi.publishProduct.and.rejectWith(missingImage);
        await vm.publish();
        expect(vm.generalError).toBe('Se requiere al menos una imagen para publicar el producto.');

        productsApi.publishProduct.and.rejectWith({});
        const result = await vm.publish();
        expect(result.status).toBe('error');
        expect(vm.generalError).toBe('Error al publicar');
        expect(vm.isPublishing).toBe(false);
      });

      it('exposes isPublishing during flight', async () => {
        let resolvePublish;
        productsApi.publishProduct.and.returnValue(
          new Promise((resolve) => {
            resolvePublish = resolve;
          })
        );
        vm.productId = 'p1';
        vm.images = [{ id: 'img-1' }];

        const pending = vm.publish();
        expect(vm.isPublishing).toBe(true);
        expect(vm.canPublish).toBe(false);

        resolvePublish({ data: {} });
        await pending;
        expect(vm.isPublishing).toBe(false);
        expect(vm.canPublish).toBe(true);
      });

      it('clears a previous per-image error and uses the exact delete fallback', async () => {
        vm.productId = 'p1';
        vm.images = [{ id: 'i1' }, { id: 'i2' }];
        vm.imageErrors.i1 = 'old error';

        await expectAsync(vm.deleteImage('i1')).toBeResolvedTo({ status: 'success' });
        expect(vm.imageErrors.i1).toBeUndefined();
        expect(vm.images.map((image) => image.id)).toEqual(['i2']);

        vm.imageErrors.i2 = 'older error';
        productsApi.deleteProductImage.and.rejectWith({});
        const result = await vm.deleteImage('i2');
        expect(result.status).toBe('error');
        expect(vm.imageErrors.i2).toBe('Error al eliminar imagen.');
        expect(vm.images.map((image) => image.id)).toEqual(['i2']);
        expect(vm.deletingImageId).toBeNull();
      });

      it('slugifies spaces, punctuation, accents and non-strings', () => {
        expect(vm._slugify('  Hola MÍ MUNDO!  ')).toBe('hola-mi-mundo');
        expect(vm._slugify('a  b / c')).toBe('a-b-c');
        expect(vm._slugify('---')).toBe('');
        expect(vm._slugify(null)).toBe('');
        expect(vm._slugify(undefined)).toBe('');
        expect(vm._slugify(123)).toBe('123');
        expect(vm._slugify('ÁÉÍÓÚ ñ')).toBe('aeiou-n');
      });

      it('currently uploads images even when productId is missing', async () => {
        const file = new File(['x'], 'orphan.png', { type: 'image/png' });

        await vm.addFiles([file]);

        expect(productsApi.uploadProductImage).toHaveBeenCalledWith(
          null,
          file,
          jasmine.objectContaining({ alt_text: 'orphan.png', position: 0 })
        );
        expect(vm.images.length).toBe(1);
        expect(vm.uploadErrors).toEqual([]);
      });

      it('currently keeps a stale publishBlockedReason after re-uploading an image', async () => {
        vm.productId = 'p1';
        vm.images = [{ id: 'i1' }];

        await vm.deleteImage('i1');
        expect(vm.publishBlockedReason).toBe('Sube al menos una imagen antes de publicar.');

        await vm.addFiles([new File(['x'], 'new.png', { type: 'image/png' })]);
        expect(vm.images.length).toBe(1);
        expect(vm.canPublish).toBe(true);
        expect(vm.publishBlockedReason).toBe('Sube al menos una imagen antes de publicar.');
      });
    });
  })();
})();
