import { SellerProductsViewModel } from './SellerProductsViewModel.js';

function mockProduct(overrides = {}) {
  return {
    id: 'prod-1',
    name: 'Sample Product',
    price: 49.99,
    currency: 'USD',
    stock: 10,
    state: 'draft',
    primary_image_path: 'https://example.com/img.png',
    ...overrides,
  };
}

describe('SellerProductsViewModel', () => {
  let productsApi;
  let vm;

  beforeEach(() => {
    productsApi = {
      getSellerProducts: jasmine.createSpy('getSellerProducts').and.resolveTo({
        data: [mockProduct()],
        meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
      }),
      publishProduct: jasmine.createSpy('publishProduct').and.resolveTo({
        data: mockProduct({ state: 'published' }),
      }),
      unpublishProduct: jasmine.createSpy('unpublishProduct').and.resolveTo({
        data: mockProduct({ state: 'unpublished' }),
      }),
      deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo(),
    };
    vm = new SellerProductsViewModel({ productsApi });
  });

  it('1. loads products successfully and updates state', async () => {
    await vm.load();

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: undefined,
    });
    expect(vm.products.length).toBe(1);
    expect(vm.meta.total).toBe(1);
    expect(vm.isLoading).toBe(false);
    expect(vm.errorMessage).toBe('');
  });

  it('2. sets error message when load fails', async () => {
    productsApi.getSellerProducts.and.rejectWith(new Error('Network Error'));

    await vm.load();

    expect(vm.isLoading).toBe(false);
    expect(vm.errorMessage).toBe('No pudimos cargar tus productos. Intenta de nuevo.');
    expect(vm.products).toEqual([]);
  });

  it('3. filters by draft status', async () => {
    await vm.setFilter('draft');

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'draft',
    });
    expect(vm.filterStatus).toBe('draft');
  });

  it('4. filters by published status', async () => {
    await vm.setFilter('published');

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'published',
    });
    expect(vm.filterStatus).toBe('published');
  });

  it('5. publishes product successfully and updates state in-place', async () => {
    const p1 = mockProduct({ id: 'p1', state: 'draft' });
    vm.products = [p1];

    const result = await vm.publishProduct('p1');

    expect(productsApi.publishProduct).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ status: 'success' });
    expect(vm.products[0].state).toBe('published');
    expect(vm.publishingId).toBeNull();
  });

  it('6. handles publish error (e.g. 422 IMAGE_REQUIRED)', async () => {
    const p1 = mockProduct({ id: 'p1', state: 'draft' });
    vm.products = [p1];
    productsApi.publishProduct.and.rejectWith(new Error('IMAGE_REQUIRED'));

    const result = await vm.publishProduct('p1');

    expect(result.status).toBe('error');
    expect(vm.publishErrors['p1']).toBe('IMAGE_REQUIRED');
    expect(vm.products[0].state).toBe('draft');
    expect(vm.publishingId).toBeNull();
  });

  it('7. guards against double-click publishing while in flight', async () => {
    let resolvePublish;
    productsApi.publishProduct.and.returnValue(
      new Promise((resolve) => {
        resolvePublish = resolve;
      })
    );
    vm.products = [mockProduct({ id: 'p1', state: 'draft' })];

    const p1Promise = vm.publishProduct('p1');
    expect(vm.publishingId).toBe('p1');

    // Second call while first is in-flight
    const p2Result = await vm.publishProduct('p1');
    expect(p2Result).toBeUndefined();
    expect(productsApi.publishProduct.calls.count()).toBe(1);

    resolvePublish({ data: mockProduct({ id: 'p1', state: 'published' }) });
    await p1Promise;
    expect(vm.publishingId).toBeNull();
  });

  it('8. calculates kpis correctly', () => {
    vm.products = [
      mockProduct({ id: '1', state: 'published', primary_image_path: 'https://img.com/1.png' }),
      mockProduct({ id: '2', state: 'published', primary_image_path: null }),
      mockProduct({ id: '3', state: 'draft', primary_image_path: 'https://img.com/3.png' }),
      mockProduct({ id: '4', state: 'draft', primary_image_path: null }),
    ];

    expect(vm.kpis).toEqual({
      total: 4,
      published: 2,
      drafts: 2,
      unpublished: 0,
      withImage: 2,
    });
  });

  it('9. evaluates canPublish helper accurately', () => {
    expect(
      vm.canPublish(mockProduct({ state: 'draft', primary_image_path: 'https://img.com/1.png' }))
    ).toBe(true);

    expect(vm.canPublish(mockProduct({ state: 'draft', primary_image_path: null }))).toBe(false);
    expect(vm.canPublish(mockProduct({ state: 'draft', primary_image_path: '' }))).toBe(false);
    expect(
      vm.canPublish(
        mockProduct({ state: 'published', primary_image_path: 'https://img.com/1.png' })
      )
    ).toBe(false);
    expect(vm.canPublish(null)).toBe(false);
  });

  it('10. setPage(2) calls load with page 2 and updates currentPage', async () => {
    productsApi.getSellerProducts.and.resolveTo({
      data: [mockProduct({ id: 'p2' })],
      meta: { page: 2, per_page: 20, total: 27, total_pages: 2 },
    });
    // Set total_pages so guard allows page 2
    vm.meta = { page: 1, per_page: 20, total: 27, total_pages: 2 };

    await vm.setPage(2);

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2 })
    );
    expect(vm.currentPage).toBe(2);
  });

  it('11. setPage(0) is a no-op and does not change currentPage', async () => {
    vm.meta = { page: 1, per_page: 20, total: 27, total_pages: 2 };
    vm.currentPage = 1;

    await vm.setPage(0);

    expect(productsApi.getSellerProducts).not.toHaveBeenCalled();
    expect(vm.currentPage).toBe(1);
  });

  it('12. setPage(totalPages + 1) is a no-op', async () => {
    vm.meta = { page: 1, per_page: 20, total: 27, total_pages: 2 };
    vm.currentPage = 1;

    await vm.setPage(3);

    expect(productsApi.getSellerProducts).not.toHaveBeenCalled();
    expect(vm.currentPage).toBe(1);
  });

  it('13. hasPrevPage, hasNextPage, pageRangeLabel return correct values on page 1 of 2', () => {
    vm.currentPage = 1;
    vm.meta = { page: 1, per_page: 20, total: 27, total_pages: 2 };

    expect(vm.hasPrevPage).toBe(false);
    expect(vm.hasNextPage).toBe(true);
    expect(vm.pageRangeLabel).toBe('Mostrando 1\u201320 de 27');
  });

  it('14. unpublishes product successfully and updates state in-place', async () => {
    const p1 = mockProduct({ id: 'p1', state: 'published' });
    vm.products = [p1];

    const result = await vm.unpublishProduct('p1');

    expect(productsApi.unpublishProduct).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ status: 'success' });
    expect(vm.products[0].state).toBe('unpublished');
    expect(vm.publishingId).toBeNull();
  });

  it('15. handles unpublish error (e.g. 409 INVALID_STATE_TRANSITION)', async () => {
    const p1 = mockProduct({ id: 'p1', state: 'published' });
    vm.products = [p1];
    productsApi.unpublishProduct.and.rejectWith(new Error('INVALID_STATE_TRANSITION'));

    const result = await vm.unpublishProduct('p1');

    expect(result.status).toBe('error');
    expect(vm.publishErrors['p1']).toBe('INVALID_STATE_TRANSITION');
    expect(vm.products[0].state).toBe('published');
    expect(vm.publishingId).toBeNull();
  });

  it('16. guards against double-click unpublishing while in flight', async () => {
    let resolveUnpublish;
    productsApi.unpublishProduct.and.returnValue(
      new Promise((resolve) => {
        resolveUnpublish = resolve;
      })
    );
    vm.products = [mockProduct({ id: 'p1', state: 'published' })];

    const p1Promise = vm.unpublishProduct('p1');
    expect(vm.publishingId).toBe('p1');

    // Second call while first is in-flight
    const p2Result = await vm.unpublishProduct('p1');
    expect(p2Result).toBeUndefined();
    expect(productsApi.unpublishProduct.calls.count()).toBe(1);

    resolveUnpublish({ data: mockProduct({ id: 'p1', state: 'unpublished' }) });
    await p1Promise;
    expect(vm.publishingId).toBeNull();
  });

  it('17. deletes product successfully and removes it from products list', async () => {
    const p1 = mockProduct({ id: 'p1' });
    const p2 = mockProduct({ id: 'p2' });
    vm.products = [p1, p2];

    const result = await vm.deleteProduct('p1');

    expect(productsApi.deleteProduct).toHaveBeenCalledWith('p1');
    expect(result).toEqual({ status: 'success' });
    expect(vm.products).toEqual([p2]);
    expect(vm.publishingId).toBeNull();
  });

  it('18. deletes product on last item of page 2 and calls load to rewind page', async () => {
    const p1 = mockProduct({ id: 'p1' });
    vm.products = [p1];
    vm.currentPage = 2;
    spyOn(vm, 'load').and.resolveTo();

    const result = await vm.deleteProduct('p1');

    expect(result).toEqual({ status: 'success' });
    expect(vm.products).toEqual([]);
    expect(vm.load).toHaveBeenCalledWith({ page: 1 });
  });

  it('19. handles delete error (e.g. 404 PRODUCT_NOT_FOUND)', async () => {
    const p1 = mockProduct({ id: 'p1' });
    vm.products = [p1];
    productsApi.deleteProduct.and.rejectWith(new Error('PRODUCT_NOT_FOUND'));

    const result = await vm.deleteProduct('p1');

    expect(result.status).toBe('error');
    expect(vm.publishErrors['p1']).toBe('PRODUCT_NOT_FOUND');
    expect(vm.products).toEqual([p1]);
    expect(vm.publishingId).toBeNull();
  });

  it('20. guards against double-click delete while in flight', async () => {
    let resolveDelete;
    productsApi.deleteProduct.and.returnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );
    vm.products = [mockProduct({ id: 'p1' })];

    const p1Promise = vm.deleteProduct('p1');
    expect(vm.publishingId).toBe('p1');

    // Second call while first is in-flight
    const p2Result = await vm.deleteProduct('p1');
    expect(p2Result).toBeUndefined();
    expect(productsApi.deleteProduct.calls.count()).toBe(1);

    resolveDelete();
    await p1Promise;
    expect(vm.publishingId).toBeNull();
  });

  it('21. evaluates canPublish for draft, unpublished, and published states', () => {
    // draft + image -> true
    expect(
      vm.canPublish(mockProduct({ state: 'draft', primary_image_path: 'https://img.com/1.png' }))
    ).toBe(true);

    // draft + no image -> false
    expect(vm.canPublish(mockProduct({ state: 'draft', primary_image_path: null }))).toBe(false);

    // unpublished + image -> true
    expect(
      vm.canPublish(
        mockProduct({ state: 'unpublished', primary_image_path: 'https://img.com/1.png' })
      )
    ).toBe(true);

    // unpublished + no image -> false
    expect(vm.canPublish(mockProduct({ state: 'unpublished', primary_image_path: null }))).toBe(
      false
    );

    // published -> false
    expect(
      vm.canPublish(
        mockProduct({ state: 'published', primary_image_path: 'https://img.com/1.png' })
      )
    ).toBe(false);

    // archived -> false
    expect(
      vm.canPublish(mockProduct({ state: 'archived', primary_image_path: 'https://img.com/1.png' }))
    ).toBe(false);
  });

  it('22. counts unpublished products accurately in kpis', () => {
    vm.products = [
      mockProduct({ id: '1', state: 'draft' }),
      mockProduct({ id: '2', state: 'published' }),
      mockProduct({ id: '3', state: 'unpublished' }),
      mockProduct({ id: '4', state: 'archived' }),
    ];

    expect(vm.kpis.unpublished).toBe(1);
    expect(vm.kpis.total).toBe(4);
    expect(vm.kpis.published).toBe(1);
    expect(vm.kpis.drafts).toBe(1);
  });

  it('23. setFilter("unpublished") calls load with status "unpublished"', async () => {
    await vm.setFilter('unpublished');

    expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'unpublished',
    });
    expect(vm.filterStatus).toBe('unpublished');
  });
});
