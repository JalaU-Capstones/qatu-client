import { EditProductView } from './EditProductView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function mockProduct(overrides = {}) {
  return {
    id: 'product-1',
    category_id: 'category-1',
    name: 'Bolso tejido',
    slug: 'bolso-tejido',
    description: 'Hecho a mano',
    price: 48,
    currency: 'USD',
    stock: 12,
    state: 'draft',
    attributes: { material: 'algodón' },
    ...overrides,
  };
}

describe('EditProductView', () => {
  let view;
  let container;
  let productsApi;
  let categoriesApi;
  let onNavigate;

  beforeEach(() => {
    productsApi = {
      getProductById: jasmine.createSpy('getProductById').and.resolveTo(mockProduct()),
      listProductImages: jasmine.createSpy('listProductImages').and.resolveTo({
        data: [
          {
            id: 'image-1',
            path: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
            alt_text: 'Frente del bolso',
            position: 0,
          },
        ],
      }),
      updateProduct: jasmine.createSpy('updateProduct').and.resolveTo({
        data: mockProduct({ name: 'Bolso andino' }),
      }),
      uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
        data: { id: 'image-2', path: 'https://example.test/two.webp', position: 1 },
      }),
      deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
    };
    categoriesApi = {
      getCategories: jasmine.createSpy('getCategories').and.resolveTo({
        data: [
          { id: 'category-1', name: 'Accesorios' },
          { id: 'category-2', name: 'Textiles' },
        ],
      }),
    };
    onNavigate = jasmine.createSpy('onNavigate');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container?.remove();
    document.body.style.overflow = '';
  });

  function mount(overrides = {}) {
    view = new EditProductView({
      productId: 'product-1',
      productsApi,
      categoriesApi,
      onNavigate,
      ...overrides,
    });
    view.mount(container);
  }

  it('renders the page structure, status, supported fields, and image count after loading', async () => {
    mount();
    await tick();

    expect(container.querySelector('.q-edit-product__breadcrumb')).not.toBeNull();
    expect(container.querySelector('.q-edit-product__title').textContent).toBe('Editar producto');
    expect(container.querySelector('.q-edit-product__status').textContent).toBe('Borrador');
    expect(container.querySelector('input[name="name"]').value).toBe('Bolso tejido');
    expect(container.querySelector('select[name="categoryId"]').value).toBe('category-1');
    expect(container.querySelector('input[name="slug"]')).toBeNull();
    expect(container.querySelector('textarea[name="attributesText"]')).not.toBeNull();
    expect(container.querySelector('.q-edit-product__image-count').textContent).toBe(
      '1 / 5 imágenes'
    );
    expect(container.querySelector('.q-edit-product__primary-badge').textContent).toBe('Principal');
    expect(container.querySelector('.q-edit-product__image-frame img').alt).toBe(
      'Frente del bolso'
    );
  });

  it('shows the live description count and enforces the description character limit', async () => {
    mount();
    await tick();

    const description = container.querySelector('textarea[name="description"]');
    const counter = container.querySelector('.q-edit-product__character-count');
    expect(counter.textContent).toBe('12 / 5,000');
    description.value = 'Descripción nueva';
    description.dispatchEvent(new Event('input', { bubbles: true }));

    expect(counter.textContent).toBe('17 / 5,000');
    expect(description.maxLength).toBe(5000);
  });

  it('locks currency for published products and shows the published status', async () => {
    productsApi.getProductById.and.resolveTo(mockProduct({ state: 'published' }));
    mount();
    await tick();

    expect(container.querySelector('.q-edit-product__status').textContent).toBe('Publicado');
    expect(container.querySelector('select[name="currency"]').disabled).toBe(true);
    expect(container.querySelector('.q-edit-product__hint--notice')).not.toBeNull();
  });

  it('submits only changed fields, then navigates back to the seller product list', async () => {
    const onSaved = jasmine.createSpy('onSaved');
    mount({ onSaved });
    await tick();

    const name = container.querySelector('input[name="name"]');
    name.value = 'Bolso andino';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const save = container.querySelector('[data-action="save"]');
    expect(save.disabled).toBe(false);
    save.click();
    await tick();

    expect(productsApi.updateProduct).toHaveBeenCalledWith('product-1', { name: 'Bolso andino' });
    expect(onSaved).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Bolso andino' }));
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('passes the loaded product to the delete confirmation trigger', async () => {
    const onDeleteProduct = jasmine.createSpy('onDeleteProduct');
    mount({ onDeleteProduct });
    await tick();

    container.querySelector('.q-edit-product__delete-btn').click();
    expect(onDeleteProduct).toHaveBeenCalledWith(jasmine.objectContaining({ id: 'product-1' }));
  });

  it('uploads through the image picker with the provided alt text', async () => {
    mount();
    await tick();
    const altInput = container.querySelector('.q-edit-product__alt-input');
    altInput.value = 'Vista lateral';
    altInput.dispatchEvent(new Event('input', { bubbles: true }));

    const file = new File(['image'], 'bolso.webp', { type: 'image/webp' });
    const fileInput = container.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();

    expect(productsApi.uploadProductImage).toHaveBeenCalledWith('product-1', file, {
      alt_text: 'Vista lateral',
      position: 1,
    });
    expect(container.querySelector('.q-edit-product__image-count').textContent).toBe(
      '2 / 5 imágenes'
    );
  });

  it('keeps unsaved changes safe when cancel is selected', async () => {
    mount();
    await tick();
    const name = container.querySelector('input[name="name"]');
    name.value = 'Nombre modificado';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    container.querySelector('.q-edit-product__cancel-btn').click();

    expect(container.querySelector('.q-edit-product__discard')).not.toBeNull();
    container.querySelector('.q-edit-product__discard .q-btn--danger').click();
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('confirms image removal with the overlay and reports a deletion error', async () => {
    productsApi.deleteProductImage.and.rejectWith(new Error('No se pudo eliminar'));
    mount();
    await tick();

    container.querySelector('.q-edit-product__image-remove').click();
    const overlay = container.querySelector('.q-edit-product__image-confirm');
    expect(overlay.hidden).toBe(false);
    overlay.querySelector('.q-btn--danger').click();
    await tick();

    expect(productsApi.deleteProductImage).toHaveBeenCalledWith('product-1', 'image-1');
    expect(container.querySelector('.q-edit-product__image-error').textContent).toBe(
      'No se pudo eliminar'
    );
  });
});
