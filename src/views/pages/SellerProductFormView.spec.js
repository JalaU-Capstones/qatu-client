import { SellerProductFormViewModel } from '../../viewmodels/pages/SellerProductFormViewModel.js';
import { SellerProductFormView } from './SellerProductFormView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

describe('SellerProductFormView', () => {
  let container;
  let productsApi;
  let categories;
  let viewModel;
  let view;
  let onNavigate;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    productsApi = {
      createProduct: jasmine.createSpy('createProduct').and.resolveTo({
        data: { id: 'prod-1', slug: 'my-product', state: 'draft' },
        meta: {},
      }),
      uploadProductImage: jasmine.createSpy('uploadProductImage').and.resolveTo({
        data: { id: 'img-1', path: 'https://example.com/1.png', alt_text: '1.png' },
        meta: {},
      }),
      publishProduct: jasmine.createSpy('publishProduct').and.resolveTo({
        data: { id: 'prod-1', state: 'published' },
        meta: {},
      }),
      deleteProductImage: jasmine.createSpy('deleteProductImage').and.resolveTo(undefined),
    };
    categories = [
      { id: 'cat-1', name: 'Electrónica', slug: 'electronica' },
      { id: 'cat-2', name: 'Ropa', slug: 'ropa' },
    ];
    viewModel = new SellerProductFormViewModel({ productsApi, categories });
    onNavigate = jasmine.createSpy('onNavigate');
    view = new SellerProductFormView({ viewModel, categories, onNavigate });
  });

  afterEach(() => {
    view?.destroy();
    view = null;
    container.remove();
  });

  it('renders the single-page product form and keeps images hidden before draft creation', () => {
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__stepper')).toBeNull();
    expect(container.querySelector('.q-seller-product-form__breadcrumb').textContent).toContain(
      'Inicio'
    );
    expect(container.querySelector('.q-seller-product-form__status').textContent).toBe('Borrador');
    for (const selector of [
      'input[name="name"]',
      'input[name="slug"]',
      'select[name="categoryId"]',
      'input[name="price"]',
      'select[name="currency"]',
      'input[name="stock"]',
      'textarea[name="description"]',
      'textarea[name="attributesText"]',
    ]) {
      expect(container.querySelector(selector)).not.toBeNull();
    }
    expect(container.querySelector('.q-seller-product-form__images-panel')).toBeNull();
    expect(container.querySelector('.q-seller-product-form__cancel-btn').textContent).toBe(
      'Cancelar'
    );
    expect(container.querySelector('.q-seller-product-form__submit-btn').textContent).toBe(
      'Crear borrador'
    );
  });

  it('updates the generated slug and description character counter while typing', () => {
    view.mount(container);
    const nameInput = container.querySelector('#field-name');
    const slugInput = container.querySelector('#field-slug');
    nameInput.value = 'Cámara de Acción';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(slugInput.value).toBe('camara-de-accion');

    const description = container.querySelector('#field-description');
    description.value = 'Descripción breve';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    expect(container.querySelector('.q-seller-product-form__character-count').textContent).toBe(
      '17 / 5,000'
    );
  });

  it('shows validation errors and does not create a draft with an empty form', async () => {
    view.mount(container);
    container
      .querySelector('.q-seller-product-form__form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    expect(container.querySelectorAll('.q-seller-product-form__error').length).toBeGreaterThan(0);
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('creates a draft without leaving the page, locks fields, and reveals image upload', async () => {
    view.mount(container);
    viewModel.setField('name', 'Teclado Mecánico');
    viewModel.setField('price', '45.00');
    viewModel.setField('categoryId', 'cat-1');
    container
      .querySelector('.q-seller-product-form__form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    expect(viewModel.productId).toBe('prod-1');
    expect(container.querySelector('.q-seller-product-form__form')).not.toBeNull();
    expect(container.querySelector('#field-name').disabled).toBe(true);
    expect(container.querySelector('#field-description').disabled).toBe(true);
    expect(container.querySelector('#field-attributesText').disabled).toBe(true);
    expect(container.querySelector('.q-seller-product-form__locked-notice').textContent).toContain(
      'modal de edición'
    );
    expect(container.querySelector('.q-seller-product-form__images-panel')).not.toBeNull();
    expect(container.querySelector('.q-seller-product-form__image-count').textContent).toBe(
      '0 / 5 imágenes'
    );
    expect(container.querySelector('.q-seller-product-form__draft-btn').textContent).toBe(
      'Guardar como borrador'
    );
    expect(container.querySelector('.q-seller-product-form__publish-btn').disabled).toBe(true);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('shows the primary badge and enables publishing after an image uploads', async () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__primary-badge').textContent).toBe(
      'Principal'
    );
    expect(container.querySelector('.q-seller-product-form__publish-btn').disabled).toBe(false);
    container.querySelector('.q-seller-product-form__publish-btn').click();
    expect(productsApi.publishProduct).toHaveBeenCalledWith('prod-1');
    await tick();
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });

  it('provides a full-thumb, accessible delete confirmation with yes and no actions', async () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
    view.mount(container);

    const thumb = container.querySelector('.q-seller-product-form__thumb');
    const removeButton = thumb.querySelector('.q-seller-product-form__image-remove');
    removeButton.click();
    const confirmation = thumb.querySelector('.q-seller-product-form__image-confirm');
    expect(confirmation.hidden).toBe(false);
    expect(confirmation.getAttribute('aria-label')).toContain('Confirmar');
    expect(confirmation.textContent).toContain('¿Eliminar?');
    expect(confirmation.querySelector('[aria-label="No, conservar imagen"]')).not.toBeNull();

    confirmation.querySelector('[aria-label="No, conservar imagen"]').click();
    expect(confirmation.hidden).toBe(true);
    expect(removeButton.hidden).toBe(false);

    removeButton.click();
    confirmation.querySelector('[aria-label="Sí, eliminar imagen"]').click();
    await tick();
    expect(productsApi.deleteProductImage).toHaveBeenCalledWith('prod-1', 'img-1');
  });

  it('renders upload validation errors and disables upload at the five-image limit', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [1, 2, 3, 4, 5].map((id) => ({
      id: `img-${id}`,
      path: `https://example.com/${id}.png`,
    }));
    viewModel.uploadErrors = [{ filename: 'bad.txt', message: 'Formato no soportado' }];
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__file-input').disabled).toBe(true);
    expect(container.querySelector('.q-seller-product-form__upload-errors').textContent).toContain(
      'bad.txt'
    );
  });

  it('protects an uncompleted draft from accidental unload and redirects after publish', () => {
    view.mount(container);
    viewModel.productId = 'prod-1';
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    viewModel.publishedSuccess = true;
    viewModel._notify();
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });
});
