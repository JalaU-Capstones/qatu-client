import { EditProductModal } from './EditProductModal.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function mockProduct(overrides = {}) {
  return {
    id: 'prod-100',
    seller_id: 'seller-1',
    category_id: 'cat-electronics',
    name: 'Teclado Mecánico',
    slug: 'teclado-mecanico',
    description: 'Teclado RGB',
    price: 89.99,
    currency: 'USD',
    stock: 15,
    state: 'draft',
    attributes: { switches: 'red' },
    ...overrides,
  };
}

describe('EditProductModal', () => {
  let productsApi;
  let categoriesApi;
  let modal;

  beforeEach(() => {
    productsApi = {
      getProductById: jasmine.createSpy('getProductById').and.resolveTo(mockProduct()),
      updateProduct: jasmine.createSpy('updateProduct').and.resolveTo({
        data: mockProduct({ name: 'Teclado Actualizado' }),
        meta: {},
      }),
    };

    categoriesApi = {
      getAll: jasmine.createSpy('getAll').and.resolveTo([
        { id: 'cat-electronics', name: 'Electrónica' },
        { id: 'cat-home', name: 'Hogar' },
      ]),
    };
  });

  afterEach(() => {
    if (modal) {
      modal.destroy();
      modal = null;
    }
    document.querySelectorAll('.q-modal').forEach((el) => el.remove());
    document.body.style.overflow = '';
  });

  it('1. open() builds the modal shell with title "Editar producto"', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const titleEl = document.querySelector('.q-modal__title');
    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('Editar producto');

    // Cancel to close
    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('2. after open(), the form is populated with values from getProductById', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const nameInput = document.querySelector('input[name="name"]');
    const priceInput = document.querySelector('input[name="price"]');
    const stockInput = document.querySelector('input[name="stock"]');
    const currencySelect = document.querySelector('select[name="currency"]');

    expect(nameInput.value).toBe('Teclado Mecánico');
    expect(priceInput.value).toBe('89.99');
    expect(stockInput.value).toBe('15');
    expect(currencySelect.value).toBe('USD');

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('3. clicking Cancel on a clean form closes the modal, resolves with { saved: false }', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    const result = await openPromise;

    expect(result.saved).toBe(false);
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  it('4. clicking Cancel on a dirty form shows discard prompt; clicking Seguir editando keeps modal open', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    // Make dirty
    const nameInput = document.querySelector('input[name="name"]');
    nameInput.value = 'Nuevo Teclado';
    nameInput.dispatchEvent(new Event('input'));
    await tick();

    // Click Cancel
    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await tick();

    const prompt = document.querySelector('.q-edit-product-modal__discard-prompt');
    expect(prompt).not.toBeNull();
    expect(prompt.textContent).toContain('Tienes cambios sin guardar. ¿Descartar?');

    // Click "Seguir editando"
    document.querySelector('.q-edit-product-modal__keep-btn').click();
    await tick();

    expect(document.querySelector('.q-edit-product-modal__discard-prompt')).toBeNull();
    expect(document.querySelector('.q-modal')).not.toBeNull();

    // Clean up
    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    document.querySelector('.q-edit-product-modal__discard-btn').click();
    await openPromise;
  });

  it('5. clicking Descartar closes the modal, resolves with { saved: false }', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    // Make dirty
    const nameInput = document.querySelector('input[name="name"]');
    nameInput.value = 'Otro Nombre';
    nameInput.dispatchEvent(new Event('input'));
    await tick();

    // Click Cancel -> Discard
    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await tick();

    document.querySelector('.q-edit-product-modal__discard-btn').click();
    const result = await openPromise;

    expect(result.saved).toBe(false);
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  it('6. clicking Save on a clean form is a no-op (button disabled)', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const saveBtn = document.querySelector('.q-edit-product-modal__save-btn');
    expect(saveBtn.disabled).toBe(true);

    saveBtn.click();
    await tick();

    expect(productsApi.updateProduct).not.toHaveBeenCalled();

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('7. changing field enables Save; clicking Save calls updateProduct, resolves with { saved: true }', async () => {
    const onSavedSpy = jasmine.createSpy('onSaved');
    modal = new EditProductModal({
      productId: 'prod-100',
      productsApi,
      categoriesApi,
      onSaved: onSavedSpy,
    });
    const openPromise = modal.open();
    await tick();

    const nameInput = document.querySelector('input[name="name"]');
    nameInput.value = 'Teclado Actualizado';
    nameInput.dispatchEvent(new Event('input'));
    await tick();

    const saveBtn = document.querySelector('.q-edit-product-modal__save-btn');
    expect(saveBtn.disabled).toBe(false);

    saveBtn.click();
    const result = await openPromise;

    expect(productsApi.updateProduct).toHaveBeenCalledWith('prod-100', {
      name: 'Teclado Actualizado',
    });
    expect(result.saved).toBe(true);
    expect(result.product.name).toBe('Teclado Actualizado');
    expect(onSavedSpy).toHaveBeenCalledWith(result.product);
  });

  it('8. save error (409) keeps the modal open and shows error message', async () => {
    const err409 = new Error('CANNOT_CHANGE_CURRENCY_ON_PUBLISHED');
    err409.statusCode = 409;
    productsApi.updateProduct.and.rejectWith(err409);

    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const nameInput = document.querySelector('input[name="name"]');
    nameInput.value = 'Cambio de Nombre';
    nameInput.dispatchEvent(new Event('input'));
    await tick();

    document.querySelector('.q-edit-product-modal__save-btn').click();
    await tick();

    expect(document.querySelector('.q-modal')).not.toBeNull();
    const errorEl = document.querySelector('.q-edit-product-modal__error');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toContain('CANNOT_CHANGE_CURRENCY_ON_PUBLISHED');

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    document.querySelector('.q-edit-product-modal__discard-btn').click();
    await openPromise;
  });

  it('9. Esc on clean form closes the modal', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    const result = await openPromise;

    expect(result.saved).toBe(false);
    expect(document.querySelector('.q-modal')).toBeNull();
  });

  it('10. Esc on dirty form shows the discard prompt (does not close)', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const nameInput = document.querySelector('input[name="name"]');
    nameInput.value = 'Dirty Esc Test';
    nameInput.dispatchEvent(new Event('input'));
    await tick();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await tick();

    expect(document.querySelector('.q-modal')).not.toBeNull();
    expect(document.querySelector('.q-edit-product-modal__discard-prompt')).not.toBeNull();

    document.querySelector('.q-edit-product-modal__discard-btn').click();
    await openPromise;
  });

  it('11. currency field is disabled when loadedProduct.state === "published"', async () => {
    productsApi.getProductById.and.resolveTo(mockProduct({ state: 'published' }));

    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const currencySelect = document.querySelector('select[name="currency"]');
    expect(currencySelect.disabled).toBe(true);

    const hint = document.querySelector('.q-form-hint--warning');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toContain('No puedes cambiar la moneda');

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('12. currency field is enabled when loadedProduct.state === "draft"', async () => {
    productsApi.getProductById.and.resolveTo(mockProduct({ state: 'draft' }));

    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const currencySelect = document.querySelector('select[name="currency"]');
    expect(currencySelect.disabled).toBe(false);

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('13. category select is populated from categoriesApi response', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const catSelect = document.querySelector('select[name="categoryId"]');
    expect(catSelect).not.toBeNull();
    const options = Array.from(catSelect.options).map((o) => o.text);
    expect(options).toContain('Electrónica');
    expect(options).toContain('Hogar');

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('14. categories empty -> category_id rendered as text input (fallback)', async () => {
    categoriesApi.getAll.and.resolveTo([]);

    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    expect(document.querySelector('select[name="categoryId"]')).toBeNull();
    const catInput = document.querySelector('input[name="categoryId"]');
    expect(catInput).not.toBeNull();
    expect(catInput.value).toBe('cat-electronics');

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('15. modal does NOT close on backdrop click', async () => {
    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    const backdrop = document.querySelector('.q-modal__backdrop');
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await tick();

    expect(document.querySelector('.q-modal')).not.toBeNull();

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });

  it('16. loading state: before getProductById resolves, shows loading text and Save disabled', async () => {
    let resolveGet;
    productsApi.getProductById.and.returnValue(
      new Promise((resolve) => {
        resolveGet = resolve;
      })
    );

    modal = new EditProductModal({ productId: 'prod-100', productsApi, categoriesApi });
    const openPromise = modal.open();
    await tick();

    expect(document.querySelector('.q-edit-product-modal__loading')).not.toBeNull();
    expect(document.querySelector('.q-edit-product-modal__loading').textContent).toBe(
      'Cargando producto…'
    );
    expect(document.querySelector('.q-edit-product-modal__save-btn').disabled).toBe(true);

    resolveGet(mockProduct());
    await tick();

    expect(document.querySelector('.q-edit-product-modal__loading')).toBeNull();
    expect(document.querySelector('input[name="name"]')).not.toBeNull();

    document.querySelector('.q-edit-product-modal__cancel-btn').click();
    await openPromise;
  });
});
