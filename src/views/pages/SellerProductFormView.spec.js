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
    };

    categories = [
      { id: 'cat-1', name: 'Electrónica', slug: 'electronica' },
      { id: 'cat-2', name: 'Ropa', slug: 'ropa' },
    ];

    viewModel = new SellerProductFormViewModel({ productsApi, categories });
    onNavigate = jasmine.createSpy('onNavigate');
    view = new SellerProductFormView({
      viewModel,
      categories,
      onNavigate,
    });
  });

  afterEach(() => {
    if (view) {
      view.destroy();
      view = null;
    }
    if (container?.parentElement) {
      container.remove();
    }
  });

  it('1. Step 1 renders the form with all expected inputs', () => {
    view.mount(container);

    expect(container.querySelector('input[name="name"]')).not.toBeNull();
    expect(container.querySelector('input[name="price"]')).not.toBeNull();
    expect(container.querySelector('select[name="currency"]')).not.toBeNull();
    expect(container.querySelector('select[name="categoryId"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="description"]')).not.toBeNull();
    expect(container.querySelector('input[name="stock"]')).not.toBeNull();
    expect(container.querySelector('textarea[name="attributesText"]')).not.toBeNull();
  });

  it('2. Step 1: clicking "Crear borrador" with empty fields shows inline errors and does not navigate', async () => {
    view.mount(container);

    const form = container.querySelector('.q-seller-product-form__form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    const errors = container.querySelectorAll('.q-seller-product-form__error');
    expect(errors.length).toBeGreaterThan(0);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('3. Step 1: successful submit switches to step 2 rendering', async () => {
    view.mount(container);

    viewModel.setField('name', 'Teclado Mecánico');
    viewModel.setField('price', '45.00');
    viewModel.setField('categoryId', 'cat-1');

    const form = container.querySelector('.q-seller-product-form__form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();

    expect(viewModel.step).toBe(2);
    expect(container.querySelector('.q-seller-product-form__subtitle').textContent).toContain(
      'Sube al menos una imagen'
    );
  });

  it('4. Step 2 renders the file input and "Seleccionar imágenes" button', () => {
    viewModel.productId = 'prod-1';
    viewModel.setStep(2);
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__file-input')).not.toBeNull();
    expect(container.querySelector('.q-seller-product-form__select-files-btn')).not.toBeNull();
  });

  it('5. Step 2: with 1 image and 0 uploading, "Siguiente" is enabled and advances to step 3 on click', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/1.png' }];
    viewModel.setStep(2);
    view.mount(container);

    const nextBtn = container.querySelector('.q-seller-product-form__next-btn');
    expect(nextBtn.disabled).toBe(false);

    nextBtn.click();
    expect(viewModel.step).toBe(3);
  });

  it('6. Step 2: with 0 images, "Siguiente" is disabled', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [];
    viewModel.setStep(2);
    view.mount(container);

    const nextBtn = container.querySelector('.q-seller-product-form__next-btn');
    expect(nextBtn.disabled).toBe(true);
  });

  it('7. Step 2: uploadLimitReached (5 images) disables file input and shows message', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [1, 2, 3, 4, 5].map((i) => ({
      id: `img-${i}`,
      path: `https://example.com/${i}.png`,
    }));
    viewModel.setStep(2);
    view.mount(container);

    const fileInput = container.querySelector('.q-seller-product-form__file-input');
    expect(fileInput.disabled).toBe(true);
    const limitMsg = container.querySelector('.q-seller-product-form__limit-msg');
    expect(limitMsg).not.toBeNull();
    expect(limitMsg.textContent).toContain('5 imágenes');
  });

  it('8. Step 2: uploadErrors array is rendered', () => {
    viewModel.productId = 'prod-1';
    viewModel.uploadErrors = [{ filename: 'bad.txt', message: 'Formato no soportado' }];
    viewModel.setStep(2);
    view.mount(container);

    const errList = container.querySelector('.q-seller-product-form__upload-errors');
    expect(errList).not.toBeNull();
    expect(errList.textContent).toContain('bad.txt');
    expect(errList.textContent).toContain('Formato no soportado');
  });

  it('9. Step 3 renders the review (name, price, images count)', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/phone.png' }];
    viewModel.form.name = 'Super Phone';
    viewModel.form.price = '699.99';
    viewModel.form.currency = 'USD';
    viewModel.form.categoryId = 'cat-1';
    viewModel.setStep(3);
    view.mount(container);

    expect(container.querySelector('.q-seller-product-form__review-name').textContent).toBe(
      'Super Phone'
    );
    expect(container.querySelector('.q-seller-product-form__review-price').textContent).toContain(
      '699.99'
    );
    expect(
      container.querySelector('.q-seller-product-form__review-images-count').textContent
    ).toContain('1');
  });

  it('10. Step 3: "Publicar producto" click calls viewModel.publish()', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/phone.png' }];
    viewModel.setStep(3);
    view.mount(container);

    spyOn(viewModel, 'publish');
    const publishBtn = container.querySelector('.q-seller-product-form__publish-btn');
    publishBtn.click();

    expect(viewModel.publish).toHaveBeenCalled();
  });

  it('11. Step 3: viewModel.generalError banner is visible', () => {
    viewModel.productId = 'prod-1';
    viewModel.images = [{ id: 'img-1', path: 'https://example.com/phone.png' }];
    viewModel.generalError = 'Error al publicar producto';
    viewModel.setStep(3);
    view.mount(container);

    const banner = container.querySelector('.q-seller-product-form__error-banner');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('Error al publicar producto');
  });

  it('12. beforeunload listener registered when productId is set and publishedSuccess = false; removed when publishedSuccess = true', () => {
    view.mount(container);
    viewModel.productId = 'prod-1';

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    spyOn(window, 'removeEventListener').and.callThrough();
    viewModel.publishedSuccess = true;
    viewModel._notify();

    expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', jasmine.any(Function));
    expect(onNavigate).toHaveBeenCalledWith('/seller/products');
  });
});
