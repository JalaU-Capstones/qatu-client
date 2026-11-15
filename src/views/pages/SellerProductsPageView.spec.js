import { SellerProductsViewModel } from '../../viewmodels/pages/SellerProductsViewModel.js';
import { SellerProductsPageView } from './SellerProductsPageView.js';

const tick = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

function mockProduct(overrides = {}) {
  return {
    id: 'prod-1',
    name: 'Sample Product',
    slug: 'sample-product',
    price: 49.99,
    currency: 'USD',
    stock: 10,
    state: 'draft',
    primary_image_path: 'https://example.com/img.png',
    ...overrides,
  };
}

describe('SellerProductsPageView', () => {
  let container;
  let productsApi;
  let viewModel;
  let view;
  let onViewProduct;
  let onCreate;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    productsApi = {
      getSellerProducts: jasmine.createSpy('getSellerProducts').and.resolveTo({
        data: [],
        meta: { page: 1, per_page: 20, total: 0, total_pages: 0 },
      }),
      publishProduct: jasmine.createSpy('publishProduct').and.resolveTo({
        data: mockProduct({ state: 'published' }),
      }),
    };

    viewModel = new SellerProductsViewModel({ productsApi });
    onViewProduct = jasmine.createSpy('onViewProduct');
    onCreate = jasmine.createSpy('onCreate');
    view = new SellerProductsPageView({
      viewModel,
      onViewProduct,
      onCreate,
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

  it('1. shows empty state when mounted with 0 products', async () => {
    view.mount(container);
    await tick();

    expect(container.querySelector('.q-seller-products__empty')).not.toBeNull();
    expect(container.querySelectorAll('.q-seller-products__card').length).toBe(0);
    expect(container.textContent).toContain('No tienes productos en esta lista.');
  });

  it('2. renders KPIs and product cards when products exist', async () => {
    const p1 = mockProduct({
      id: 'p1',
      state: 'published',
      primary_image_path: 'https://img.com/1.png',
    });
    const p2 = mockProduct({ id: 'p2', state: 'draft', primary_image_path: null });
    productsApi.getSellerProducts.and.resolveTo({
      data: [p1, p2],
      meta: { page: 1, per_page: 20, total: 2, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    expect(
      container.querySelector('[data-kpi="total"] .q-seller-products__kpi-value').textContent
    ).toBe('2');
    expect(
      container.querySelector('[data-kpi="published"] .q-seller-products__kpi-value').textContent
    ).toBe('1');
    expect(
      container.querySelector('[data-kpi="drafts"] .q-seller-products__kpi-value').textContent
    ).toBe('1');
    expect(
      container.querySelector('[data-kpi="withImage"] .q-seller-products__kpi-value').textContent
    ).toBe('1');

    expect(container.querySelectorAll('.q-seller-products__card').length).toBe(2);
  });

  it('3. triggers setFilter when a filter tab is clicked', async () => {
    view.mount(container);
    await tick();

    const draftTab = container.querySelector('button[data-status="draft"]');
    draftTab.click();
    await tick();

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'draft', page: 1 })
    );
    expect(
      container.querySelector('button[data-status="draft"]').classList.contains('is-active')
    ).toBe(true);
  });

  it('4. allows publishing a draft product that has an image', async () => {
    const draftWithImg = mockProduct({
      id: 'p-draft',
      state: 'draft',
      primary_image_path: 'https://example.com/photo.png',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [draftWithImg],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const publishBtn = container.querySelector('.q-seller-products__publish-btn');
    expect(publishBtn).not.toBeNull();
    expect(publishBtn.disabled).toBe(false);

    publishBtn.click();
    await tick();

    expect(productsApi.publishProduct).toHaveBeenCalledWith('p-draft');
  });

  it('5. disables publish button on draft without an image and shows tooltip', async () => {
    const draftNoImg = mockProduct({
      id: 'p-noimg',
      state: 'draft',
      primary_image_path: null,
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [draftNoImg],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const publishBtn = container.querySelector('.q-seller-products__publish-btn');
    expect(publishBtn).not.toBeNull();
    expect(publishBtn.disabled).toBe(true);
    expect(publishBtn.title).toBe(viewModel.publishTooltip);
  });

  it('6. invokes onViewProduct when viewing a published product', async () => {
    const published = mockProduct({
      id: 'p-pub',
      slug: 'awesome-item',
      state: 'published',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [published],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const viewBtn = container.querySelector('.q-seller-products__view-btn');
    expect(viewBtn).not.toBeNull();
    viewBtn.click();

    expect(onViewProduct).toHaveBeenCalledWith('awesome-item');
  });

  it('7. displays loading state while fetching products', async () => {
    productsApi.getSellerProducts.and.returnValue(new Promise(() => {}));

    view.mount(container);
    await tick();

    const loading = container.querySelector('.q-seller-products__loading');
    expect(loading).not.toBeNull();
    expect(loading.textContent).toContain('Cargando productos');
  });

  it('8. renders error state and retries loading when retry button is clicked', async () => {
    productsApi.getSellerProducts.and.rejectWith(new Error('Network error'));

    view.mount(container);
    await tick();

    const errorEl = container.querySelector('.q-seller-products__error');
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toContain('No pudimos cargar tus productos');

    // Setup success for retry
    productsApi.getSellerProducts.and.resolveTo({
      data: [mockProduct({ id: 'p-recovered' })],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    const retryBtn = container.querySelector('.q-seller-products__retry-btn');
    retryBtn.click();
    await tick();

    expect(container.querySelector('.q-seller-products__error')).toBeNull();
    expect(container.querySelectorAll('.q-seller-products__card').length).toBe(1);
  });

  it('9. displays publish error on the card if publishing fails', async () => {
    const draft = mockProduct({
      id: 'p-err',
      state: 'draft',
      primary_image_path: 'https://example.com/img.png',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [draft],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });
    productsApi.publishProduct.and.rejectWith(new Error('IMAGE_REQUIRED'));

    view.mount(container);
    await tick();

    const publishBtn = container.querySelector('.q-seller-products__publish-btn');
    publishBtn.click();
    await tick();

    const errSpan = container.querySelector('.q-seller-products__publish-error');
    expect(errSpan).not.toBeNull();
    expect(errSpan.textContent).toBe('IMAGE_REQUIRED');
  });
});
