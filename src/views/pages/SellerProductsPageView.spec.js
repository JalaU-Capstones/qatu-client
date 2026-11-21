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
  let onEditProduct;
  let onDeleteProduct;

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
      unpublishProduct: jasmine.createSpy('unpublishProduct').and.resolveTo({
        data: mockProduct({ state: 'unpublished' }),
      }),
      deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo(),
    };

    viewModel = new SellerProductsViewModel({ productsApi });
    onViewProduct = jasmine.createSpy('onViewProduct');
    onCreate = jasmine.createSpy('onCreate');
    onEditProduct = jasmine.createSpy('onEditProduct');
    onDeleteProduct = jasmine.createSpy('onDeleteProduct');
    view = new SellerProductsPageView({
      viewModel,
      onViewProduct,
      onCreate,
      onEditProduct,
      onDeleteProduct,
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
    expect(container.querySelectorAll('[role="listitem"]').length).toBe(0);
    expect(container.textContent).toContain('No tienes productos en esta lista.');
    expect(
      container.querySelector('.q-seller-products__empty svg[aria-hidden="true"]')
    ).not.toBeNull();
  });

  it('renders the seller breadcrumb and accessible status tabs', async () => {
    view.mount(container);
    await tick();

    const breadcrumb = container.querySelector('.q-seller-products__breadcrumb');
    expect(
      Array.from(breadcrumb.children)
        .map((item) => item.textContent)
        .filter((text) => text !== '/')
        .join(' / ')
    ).toBe('Inicio / Panel del vendedor / Mis productos');
    expect(container.querySelector('.q-seller-products__create-btn').textContent).toBe(
      'Crear producto'
    );
    expect(
      container.querySelector('.q-seller-products__create-btn svg[aria-hidden="true"]')
    ).not.toBeNull();

    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Todos',
      'Borradores',
      'Publicados',
      'No publicados',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-controls')).toBe('seller-products-panel');
    expect(container.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(
      tabs[0].id
    );
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
    expect(
      container.querySelectorAll('.q-seller-products__kpi-icon svg[aria-hidden="true"]').length
    ).toBe(5);

    expect(container.querySelectorAll('[role="listitem"]').length).toBe(2);
  });

  it('renders visible seller actions in state-specific order without cart actions', async () => {
    productsApi.getSellerProducts.and.resolveTo({
      data: [
        mockProduct({ id: 'draft', state: 'draft' }),
        mockProduct({ id: 'published', state: 'published' }),
        mockProduct({ id: 'unpublished', state: 'unpublished' }),
      ],
      meta: { page: 1, per_page: 20, total: 3, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const actionsFor = (id) =>
      Array.from(
        container.querySelector(`[data-product-id="${id}"] .q-seller-products__actions`).children
      )
        .filter((element) => element.matches('button'))
        .map((button) => button.textContent);

    expect(actionsFor('draft')).toEqual(['Publicar', 'Editar', 'Eliminar']);
    expect(actionsFor('published')).toEqual(['Despublicar', 'Editar', 'Eliminar', 'Ver']);
    expect(actionsFor('unpublished')).toEqual(['Publicar', 'Editar', 'Eliminar']);
    expect(
      container.querySelectorAll(
        '.q-seller-products__actions button:not([aria-hidden="true"]) svg[aria-hidden="true"]'
      ).length
    ).toBe(10);
    expect(
      container.querySelector('.product-card--seller button[aria-label^="Añadir"]')
    ).toBeNull();
    expect(container.querySelector('.product-card__dropdown')).toBeNull();

    const publishedMedia = container.querySelector(
      '[data-product-id="published"] .product-card__media'
    );
    expect(publishedMedia.firstElementChild.classList.contains('product-card__status')).toBe(true);
    expect(publishedMedia.querySelector('.q-seller-products__thumb-wrap')).not.toBeNull();
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
    expect(errorEl.querySelector('svg[aria-hidden="true"]')).not.toBeNull();

    // Setup success for retry
    productsApi.getSellerProducts.and.resolveTo({
      data: [mockProduct({ id: 'p-recovered' })],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    const retryBtn = container.querySelector('.q-seller-products__retry-btn');
    retryBtn.click();
    await tick();

    expect(container.querySelector('.q-seller-products__error')).toBeNull();
    expect(container.querySelectorAll('[role="listitem"]').length).toBe(1);
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

  it('10. renders pagination bar when meta.total_pages > 1', async () => {
    productsApi.getSellerProducts.and.resolveTo({
      data: [mockProduct({ id: 'p1' })],
      meta: { page: 1, per_page: 20, total: 27, total_pages: 2 },
    });

    view.mount(container);
    await tick();

    const pagination = container.querySelector('.q-seller-products__pagination');
    expect(pagination).not.toBeNull();
    expect(pagination.querySelector('.q-seller-products__pagination-label').textContent).toBe(
      'Mostrando 1\u201320 de 27'
    );
    expect(pagination.querySelector('.q-seller-products__pagination-compact').textContent).toBe(
      '1\u201320 / 27'
    );
    expect(pagination.querySelectorAll('button svg[aria-hidden="true"]').length).toBe(2);
  });

  it('11. has prev disabled and next enabled on page 1', async () => {
    productsApi.getSellerProducts.and.resolveTo({
      data: [mockProduct({ id: 'p1' })],
      meta: { page: 1, per_page: 20, total: 27, total_pages: 2 },
    });

    view.mount(container);
    await tick();

    const prevBtn = container.querySelector('.q-seller-products__pagination-prev');
    const nextBtn = container.querySelector('.q-seller-products__pagination-next');
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);
  });

  it('12. clicking next calls viewModel.setPage with next page', async () => {
    productsApi.getSellerProducts.and.resolveTo({
      data: [mockProduct({ id: 'p1' })],
      meta: { page: 1, per_page: 20, total: 27, total_pages: 2 },
    });
    spyOn(viewModel, 'setPage').and.callThrough();

    view.mount(container);
    await tick();

    const nextBtn = container.querySelector('.q-seller-products__pagination-next');
    nextBtn.click();
    await tick();

    expect(viewModel.setPage).toHaveBeenCalledWith(2);
  });

  it('13. renders Despublicar button on published card and calls unpublishProduct on click', async () => {
    const published = mockProduct({
      id: 'p-pub',
      state: 'published',
      primary_image_path: 'https://example.com/item.png',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [published],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });
    spyOn(viewModel, 'unpublishProduct').and.callThrough();

    view.mount(container);
    await tick();

    const unpublishBtn = container.querySelector('.q-seller-products__unpublish-btn');
    expect(unpublishBtn).not.toBeNull();
    expect(unpublishBtn.textContent).toBe('Despublicar');
    expect(unpublishBtn.disabled).toBe(false);

    unpublishBtn.click();
    await tick();

    expect(viewModel.unpublishProduct).toHaveBeenCalledWith('p-pub');
    expect(productsApi.unpublishProduct).toHaveBeenCalledWith('p-pub');
  });

  it('14. displays No publicado badge text on unpublished card', async () => {
    const unpublished = mockProduct({
      id: 'p-unpub',
      state: 'unpublished',
      primary_image_path: 'https://example.com/item.png',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [unpublished],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const badge = container.querySelector('.product-card__status');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe('No publicado');
  });

  it('15. enables Publicar button for unpublished card with primary_image_path', async () => {
    const unpublishedWithImg = mockProduct({
      id: 'p-unpub',
      state: 'unpublished',
      primary_image_path: 'https://example.com/item.png',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [unpublishedWithImg],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });
    spyOn(viewModel, 'publishProduct').and.callThrough();

    view.mount(container);
    await tick();

    const publishBtn = container.querySelector('.q-seller-products__publish-btn');
    expect(publishBtn).not.toBeNull();
    expect(publishBtn.textContent).toBe('Publicar');
    expect(publishBtn.disabled).toBe(false);

    publishBtn.click();
    await tick();

    expect(viewModel.publishProduct).toHaveBeenCalledWith('p-unpub');
    expect(productsApi.publishProduct).toHaveBeenCalledWith('p-unpub');
  });

  it('16. disables Publicar button for unpublished card without primary_image_path and shows tooltip', async () => {
    const unpublishedNoImg = mockProduct({
      id: 'p-unpub-noimg',
      state: 'unpublished',
      primary_image_path: null,
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [unpublishedNoImg],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const publishBtn = container.querySelector('.q-seller-products__publish-btn');
    expect(publishBtn).not.toBeNull();
    expect(publishBtn.disabled).toBe(true);
    expect(publishBtn.title).toBe(viewModel.publishTooltip);
  });

  it('17. invokes onEditProduct with productId when Editar button is clicked', async () => {
    const product = mockProduct({
      id: 'prod-edit-1',
      state: 'draft',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [product],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const editBtn = container.querySelector('.q-seller-products__edit-btn');
    expect(editBtn).not.toBeNull();
    expect(editBtn.textContent).toBe('Editar');

    editBtn.click();
    await tick();

    expect(onEditProduct).toHaveBeenCalledWith('prod-edit-1');
  });

  it('18. invokes onDeleteProduct with productId when Eliminar button is clicked', async () => {
    const product = mockProduct({
      id: 'prod-delete-1',
      state: 'published',
    });
    productsApi.getSellerProducts.and.resolveTo({
      data: [product],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const deleteBtn = container.querySelector('.q-seller-products__delete-btn');
    expect(deleteBtn).not.toBeNull();
    expect(deleteBtn.textContent).toBe('Eliminar');

    deleteBtn.click();
    await tick();

    expect(onDeleteProduct).toHaveBeenCalledWith('prod-delete-1');
  });

  it('19. renders No publicados filter tab and triggers setFilter on click', async () => {
    view.mount(container);
    await tick();

    const unpublishedTab = container.querySelector('button[data-status="unpublished"]');
    expect(unpublishedTab).not.toBeNull();
    expect(unpublishedTab.textContent).toBe('No publicados');

    unpublishedTab.click();
    await tick();

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 'unpublished', page: 1 })
    );
    expect(
      container.querySelector('button[data-status="unpublished"]').classList.contains('is-active')
    ).toBe(true);
  });

  it('20. renders unpublished KPI card with accurate count', async () => {
    const p1 = mockProduct({ id: 'p1', state: 'unpublished' });
    const p2 = mockProduct({ id: 'p2', state: 'unpublished' });
    const p3 = mockProduct({ id: 'p3', state: 'published' });
    productsApi.getSellerProducts.and.resolveTo({
      data: [p1, p2, p3],
      meta: { page: 1, per_page: 20, total: 3, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const kpiCard = container.querySelector('[data-kpi="unpublished"]');
    expect(kpiCard).not.toBeNull();
    expect(kpiCard.querySelector('.q-seller-products__kpi-label').textContent).toBe(
      'No publicados'
    );
    expect(kpiCard.querySelector('.q-seller-products__kpi-value').textContent).toBe('2');
  });

  it('21. renders fallback placeholder when product has no primary_image_path', async () => {
    const p1 = mockProduct({ id: 'p1', primary_image_path: null });
    productsApi.getSellerProducts.and.resolveTo({
      data: [p1],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });

    view.mount(container);
    await tick();

    const placeholder = container.querySelector('img[src*="product-placeholder.svg"]');
    expect(placeholder).not.toBeNull();
  });
});
