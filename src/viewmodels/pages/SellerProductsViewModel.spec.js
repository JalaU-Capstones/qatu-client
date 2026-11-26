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

  it('24. applyProductUpdate replaces the product in-place and notifies', () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);
    const original = mockProduct({ id: 'p1', name: 'Old', state: 'draft' });
    vm.products = [original];

    const updated = { ...mockProduct({ id: 'p1', name: 'New', state: 'published' }) };
    vm.applyProductUpdate(updated);

    expect(vm.products[0].name).toBe('New');
    expect(vm.products[0]).not.toBe(original);
    expect(notifySpy).toHaveBeenCalled();
  });

  it('25. applyProductUpdate is a no-op when product not in current page list', () => {
    const notifySpy = jasmine.createSpy('notify');
    vm.subscribe(notifySpy);
    vm.products = [mockProduct({ id: 'p1' })];

    vm.applyProductUpdate({ id: 'p2', name: 'Ghost' });

    expect(vm.products.length).toBe(1);
    expect(vm.products[0].id).toBe('p1');
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('26. calculates global KPIs across pages and keeps them stable when filtering', async () => {
    const inventory = Array.from({ length: 25 }, (_, index) =>
      mockProduct({
        id: `product-${index}`,
        state: index < 12 ? 'published' : index < 20 ? 'draft' : 'unpublished',
        primary_image_path: index % 2 === 0 ? `https://example.com/${index}.png` : null,
      })
    );
    productsApi.getSellerProducts.and.callFake(async ({ page = 1, limit = 20, status } = {}) => {
      const matching = status ? inventory.filter((product) => product.state === status) : inventory;
      const start = (page - 1) * limit;
      return {
        data: matching.slice(start, start + limit),
        meta: {
          page,
          per_page: limit,
          total: matching.length,
          total_pages: Math.ceil(matching.length / limit),
        },
      };
    });

    await vm.load();

    const catalogTotals = {
      total: 25,
      published: 12,
      drafts: 8,
      unpublished: 5,
      withImage: 13,
    };
    expect(vm.kpis).toEqual(catalogTotals);
    expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
    });
    expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 1,
      status: 'published',
    });

    await vm.setFilter('published');

    expect(vm.kpis).toEqual(catalogTotals);
  });

  it('27. falls back to the available single-page products when metadata is omitted', async () => {
    const products = [
      mockProduct({ id: 'published', state: 'published' }),
      mockProduct({ id: 'draft', state: 'draft', primary_image_path: null }),
    ];
    productsApi.getSellerProducts.and.resolveTo({ data: products });

    await vm.load();

    expect(vm.meta).toEqual({ page: 1, per_page: 20, total: 2, total_pages: 1 });
    expect(vm.kpis).toEqual({
      total: 2,
      published: 1,
      drafts: 1,
      unpublished: 0,
      withImage: 1,
    });
  });

  it('28. adjusts catalog KPIs after state, image, and delete mutations', async () => {
    const products = [
      mockProduct({ id: 'draft', state: 'draft' }),
      mockProduct({ id: 'published', state: 'published', primary_image_path: null }),
      mockProduct({ id: 'unpublished', state: 'unpublished' }),
    ];
    productsApi.getSellerProducts.and.resolveTo({
      data: products,
      meta: { page: 1, per_page: 20, total: 3, total_pages: 1 },
    });

    await vm.load();
    expect(vm.kpis).toEqual({
      total: 3,
      published: 1,
      drafts: 1,
      unpublished: 1,
      withImage: 2,
    });

    productsApi.publishProduct.and.resolveTo({ data: { id: 'draft', state: 'published' } });
    await vm.publishProduct('draft');
    expect(vm.kpis.published).toBe(2);
    expect(vm.kpis.drafts).toBe(0);

    productsApi.unpublishProduct.and.resolveTo({
      data: { id: 'published', state: 'unpublished' },
    });
    await vm.unpublishProduct('published');
    expect(vm.kpis.published).toBe(1);
    expect(vm.kpis.unpublished).toBe(2);

    vm.applyProductUpdate({
      ...products[2],
      state: 'draft',
      primary_image_path: null,
    });
    expect(vm.kpis.drafts).toBe(1);
    expect(vm.kpis.unpublished).toBe(1);
    expect(vm.kpis.withImage).toBe(1);

    await vm.deleteProduct('draft');
    expect(vm.kpis).toEqual({
      total: 2,
      published: 0,
      drafts: 1,
      unpublished: 1,
      withImage: 0,
    });
  });

  it('29. refreshes catalog KPIs after a new product is added', async () => {
    productsApi.getSellerProducts.and.resolveTo({
      data: [],
      meta: { page: 1, per_page: 20, total: 0, total_pages: 0 },
    });
    await vm.load();
    expect(vm.kpis.total).toBe(0);

    const createdProduct = mockProduct({ id: 'created-product' });
    productsApi.getSellerProducts.and.resolveTo({
      data: [createdProduct],
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    });
    await vm.load();

    expect(vm.kpis).toEqual({
      total: 1,
      published: 0,
      drafts: 1,
      unpublished: 0,
      withImage: 1,
    });
  });
});

// Recovered coverage from backup/pre-rebase-tests
(() => {
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

  describe('SellerProductsViewModel (recovered 1)', () => {
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

  (() => {
    function mockProduct(overrides = {}) {
      return {
        id: 'prod-1',
        name: 'Sample Product',
        price: 49.99,
        state: 'draft',
        primary_image_path: 'https://example.com/img.png',
        ...overrides,
      };
    }

    function apiMock() {
      return {
        getSellerProducts: jasmine.createSpy('getSellerProducts').and.resolveTo({
          data: [mockProduct()],
          meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
        }),
        publishProduct: jasmine
          .createSpy('publishProduct')
          .and.resolveTo({ data: { id: 'prod-1', state: 'published' } }),
        unpublishProduct: jasmine
          .createSpy('unpublishProduct')
          .and.resolveTo({ data: { id: 'prod-1', state: 'unpublished' } }),
        deleteProduct: jasmine.createSpy('deleteProduct').and.resolveTo(),
      };
    }

    function statusAwareApi(catalog, statuses) {
      const getSellerProducts = jasmine
        .createSpy('getSellerProducts')
        .and.callFake(async ({ status } = {}) => {
          if (status) return statuses[status] || { data: [], meta: {} };
          return catalog;
        });
      return { ...apiMock(), getSellerProducts };
    }

    describe('SellerProductsViewModel additional branches (recovered 2)', () => {
      let productsApi;
      let vm;
      let unsubscribes;

      beforeEach(() => {
        unsubscribes = [];
        productsApi = apiMock();
        vm = new SellerProductsViewModel({ productsApi });
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

      it('notifies the constructor onChange for loads but not after unsubscribe', async () => {
        const onChange = jasmine.createSpy('onChange');
        vm = new SellerProductsViewModel({ productsApi, onChange });
        const listener = watch(vm);

        await vm.load();
        expect(onChange).toHaveBeenCalledWith(vm);
        expect(listener).toHaveBeenCalledWith(vm);

        onChange.calls.reset();
        listener.calls.reset();
        unsubscribes[unsubscribes.length - 1]();
        await vm.load();
        expect(listener).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalled();
      });

      it('skips the summary refresh when refreshSummary is false and KPIs already exist', async () => {
        await vm.load();
        const existing = { ...vm.kpis };
        productsApi.getSellerProducts.calls.reset();

        await vm.load({ refreshSummary: false });

        expect(productsApi.getSellerProducts).toHaveBeenCalledTimes(1);
        expect(vm.kpis).toEqual(existing);
        expect(productsApi.getSellerProducts).not.toHaveBeenCalledWith(
          jasmine.objectContaining({ status: 'published' })
        );
      });

      it('still loads KPIs with refreshSummary false on a fresh instance', async () => {
        productsApi.getSellerProducts.calls.reset();

        await vm.load({ refreshSummary: false });

        expect(vm._catalogKpis).not.toBeNull();
        expect(productsApi.getSellerProducts).toHaveBeenCalledWith(
          jasmine.objectContaining({ status: 'published' })
        );
      });

      it('derives the request limit from meta.per_page and falls back to 20', async () => {
        vm.meta = null;
        await vm.load();
        expect(productsApi.getSellerProducts.calls.first().args[0].limit).toBe(20);

        productsApi.getSellerProducts.calls.reset();
        vm = new SellerProductsViewModel({ productsApi });
        vm.meta = { per_page: 7 };
        await vm.load();
        expect(productsApi.getSellerProducts.calls.first().args[0].limit).toBe(7);
      });

      it('treats a non-array data payload as an empty page', async () => {
        productsApi.getSellerProducts.and.resolveTo({ data: 'bad', meta: { per_page: 5 } });

        await vm.load({ page: 3 });

        expect(vm.products).toEqual([]);
        expect(vm.meta).toEqual({ page: 3, per_page: 5, total: 0, total_pages: 0 });
      });

      it('clears the filter when setFilter receives null', async () => {
        await vm.setFilter('draft');
        productsApi.getSellerProducts.calls.reset();

        await vm.setFilter(null);

        expect(vm.filterStatus).toBe(null);
        expect(productsApi.getSellerProducts).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          status: undefined,
        });
      });

      it('allows setPage(1) and out-of-range pages when total_pages is zero', async () => {
        productsApi.getSellerProducts.and.resolveTo({
          data: [],
          meta: { page: 99, per_page: 20, total: 0, total_pages: 0 },
        });
        await vm.load();
        expect(vm.meta.total_pages).toBe(0);

        productsApi.getSellerProducts.calls.reset();
        await vm.setPage(0);
        expect(productsApi.getSellerProducts).not.toHaveBeenCalled();

        await vm.setPage(1);
        expect(productsApi.getSellerProducts).toHaveBeenCalledWith(
          jasmine.objectContaining({ page: 1 })
        );

        productsApi.getSellerProducts.calls.reset();
        await vm.setPage(99);
        expect(productsApi.getSellerProducts).toHaveBeenCalledWith(
          jasmine.objectContaining({ page: 99 })
        );
        expect(vm.currentPage).toBe(99);
      });

      it('formats empty and compact page ranges and hasNextPage', () => {
        vm.currentPage = 1;
        vm.meta = { page: 1, per_page: 20, total: 0, total_pages: 0 };
        expect(vm.pageRangeLabel).toBe('Mostrando 0\u20130 de 0');
        expect(vm.compactPageRangeLabel).toBe('0\u20130 / 0');
        expect(vm.hasNextPage).toBe(false);

        vm.currentPage = 2;
        vm.meta = { page: 2, per_page: 20, total: 27, total_pages: 2 };
        expect(vm.pageRangeLabel).toBe('Mostrando 21\u201327 de 27');
        expect(vm.compactPageRangeLabel).toBe('21\u201327 / 27');
        expect(vm.hasNextPage).toBe(false);

        vm.currentPage = 1;
        expect(vm.hasNextPage).toBe(true);
        vm.meta = null;
        expect(vm.hasNextPage).toBe(false);
      });

      it('falls back to local counts for non-array and mismatched status responses', async () => {
        const catalog = {
          data: [
            mockProduct({ id: 'p1', state: 'draft' }),
            mockProduct({ id: 'p2', state: 'published', primary_image_path: null }),
            mockProduct({ id: 'p3', state: 'archived', primary_image_path: null }),
          ],
          meta: { page: 1, per_page: 20, total: 3, total_pages: 1 },
        };
        const statuses = {
          draft: { data: [mockProduct({ id: 'x', state: 'published' })], meta: { total: 99 } },
          published: { data: 'bad', meta: {} },
          unpublished: { data: [], meta: { total: 7 } },
        };
        const api = statusAwareApi(catalog, statuses);
        vm = new SellerProductsViewModel({ productsApi: api });

        await vm.load();

        expect(vm.kpis).toEqual({
          total: 3,
          published: 1,
          drafts: 1,
          unpublished: 7,
          withImage: 1,
        });
      });

      it('currently treats an explicit null status total as zero', async () => {
        const catalog = {
          data: [mockProduct({ id: 'p1', state: 'draft' })],
          meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
        };
        const statuses = { published: { data: [], meta: { total: null } } };
        const api = statusAwareApi(catalog, statuses);
        vm = new SellerProductsViewModel({ productsApi: api });

        await vm.load();

        expect(vm.kpis.published).toBe(0);
      });

      it('batches catalog pages, skips non-array pages and dedupes products', async () => {
        const pages = {
          1: {
            data: [mockProduct({ id: 'dup', name: 'first' })],
            meta: { per_page: 2, total: 14, total_pages: 7 },
          },
          2: {
            data: [
              mockProduct({ id: 'dup', name: 'second' }),
              mockProduct({ id: undefined, name: 'no-id-1' }),
            ],
          },
          3: { data: null },
          4: { data: [mockProduct({ id: 'p4' })] },
          5: { data: [] },
          6: { data: [mockProduct({ id: undefined, name: 'no-id-2' })] },
          7: { data: [mockProduct({ id: 'p7' })] },
        };
        const getSellerProducts = jasmine
          .createSpy('getSellerProducts')
          .and.callFake(async ({ page = 1 } = {}) => pages[page] || { data: [], meta: {} });
        vm = new SellerProductsViewModel({ productsApi: { ...apiMock(), getSellerProducts } });

        const result = await vm._loadCatalogProducts({
          response: pages[1],
          shouldReuseResponse: false,
        });

        expect(getSellerProducts).toHaveBeenCalledWith({ page: 1, limit: 100 });
        for (let page = 2; page <= 7; page += 1) {
          expect(getSellerProducts).toHaveBeenCalledWith({ page, limit: 2 });
        }
        expect(getSellerProducts).toHaveBeenCalledTimes(7);
        expect(result.products.map((product) => product.id)).toEqual([
          'dup',
          'p4',
          'p7',
          undefined,
          undefined,
        ]);
        expect(result.products[0].name).toBe('second');
        expect(result.products[3].name).toBe('no-id-1');
        expect(result.products[4].name).toBe('no-id-2');
      });

      it('reuses the current response without an extra catalog request', async () => {
        const getSellerProducts = jasmine
          .createSpy('getSellerProducts')
          .and.resolveTo({ data: [], meta: {} });
        vm = new SellerProductsViewModel({ productsApi: { ...apiMock(), getSellerProducts } });
        vm.meta = { page: 1, per_page: 7, total: 1, total_pages: 1 };

        const result = await vm._loadCatalogProducts({
          response: { data: [mockProduct({ id: 'reused' })], meta: { total: 1 } },
          shouldReuseResponse: true,
        });

        expect(getSellerProducts).not.toHaveBeenCalled();
        expect(result.products.map((product) => product.id)).toEqual(['reused']);
      });

      it('guards _adjustCatalogKpis and clamps image counts', () => {
        vm._catalogKpis = { total: 1, published: 1, drafts: 0, unpublished: 0, withImage: 1 };
        expect(() => vm._adjustCatalogKpis(null, mockProduct())).not.toThrow();
        expect(() => vm._adjustCatalogKpis(mockProduct(), null)).not.toThrow();
        vm._catalogKpis = null;
        expect(() => vm._adjustCatalogKpis(mockProduct(), mockProduct())).not.toThrow();

        vm._catalogKpis = { total: 1, published: 0, drafts: 1, unpublished: 0, withImage: 1 };
        vm._adjustCatalogKpis(
          mockProduct({ state: 'draft', primary_image_path: 'img.png' }),
          mockProduct({ state: 'draft', primary_image_path: 'img.png', name: 'renamed' })
        );
        expect(vm.kpis).toEqual({
          total: 1,
          published: 0,
          drafts: 1,
          unpublished: 0,
          withImage: 1,
        });

        vm._catalogKpis = { total: 1, published: 0, drafts: 0, unpublished: 0, withImage: 0 };
        vm._adjustCatalogKpis(
          mockProduct({ state: 'archived', primary_image_path: 'img.png' }),
          mockProduct({ state: 'archived', primary_image_path: null })
        );
        expect(vm.kpis.withImage).toBe(0);
      });

      it('applies an update to a product that only exists in the current page', () => {
        vm.products = [mockProduct({ id: 'p1', state: 'draft' })];
        vm._catalogKpis = { total: 1, published: 0, drafts: 1, unpublished: 0, withImage: 1 };
        const listener = watch(vm);

        expect(vm._applyProductUpdate({ id: 'p1', state: 'published', name: 'Renamed' })).toBe(
          true
        );
        expect(vm.products[0].name).toBe('Renamed');
        expect(vm.products[0].state).toBe('published');
        expect(vm.kpis).toEqual({
          total: 1,
          published: 1,
          drafts: 0,
          unpublished: 0,
          withImage: 1,
        });
        expect(vm._applyProductUpdate({ id: 'ghost' })).toBe(false);
        expect(listener).not.toHaveBeenCalled();
      });

      it('guards _removeProductFromCatalogKpis and handles unknown states', () => {
        vm._catalogKpis = null;
        expect(() => vm._removeProductFromCatalogKpis(mockProduct())).not.toThrow();

        vm._catalogKpis = { total: 3, published: 1, drafts: 1, unpublished: 1, withImage: 2 };
        vm._removeProductFromCatalogKpis(
          mockProduct({ state: 'archived', primary_image_path: null })
        );
        expect(vm.kpis).toEqual({
          total: 2,
          published: 1,
          drafts: 1,
          unpublished: 1,
          withImage: 2,
        });

        vm._removeProductFromCatalogKpis(
          mockProduct({ state: 'draft', primary_image_path: 'img.png' })
        );
        expect(vm.kpis).toEqual({
          total: 1,
          published: 1,
          drafts: 0,
          unpublished: 1,
          withImage: 1,
        });

        vm._catalogKpis = { total: 0, published: 0, drafts: 0, unpublished: 0, withImage: 0 };
        vm._removeProductFromCatalogKpis(
          mockProduct({ state: 'published', primary_image_path: 'img.png' })
        );
        expect(vm.kpis.total).toBe(0);
        expect(vm.kpis.withImage).toBe(0);
      });

      it('handles publish and unpublish without a previous product or response data', async () => {
        await expectAsync(vm.publishProduct('ghost')).toBeResolvedTo({ status: 'success' });
        await expectAsync(vm.unpublishProduct('ghost')).toBeResolvedTo({ status: 'success' });
        expect(productsApi.publishProduct).toHaveBeenCalledWith('ghost');
        expect(productsApi.unpublishProduct).toHaveBeenCalledWith('ghost');
        expect(vm.products).toEqual([]);

        productsApi.publishProduct.and.resolveTo(undefined);
        vm.products = [mockProduct({ id: 'p1', state: 'draft' })];
        await expectAsync(vm.publishProduct('p1')).toBeResolvedTo({ status: 'success' });
        expect(vm.products[0].state).toBe('published');
      });

      it('uses exact fallback messages for action errors without a message', async () => {
        vm.products = [mockProduct({ id: 'p1', state: 'draft' })];

        productsApi.publishProduct.and.rejectWith({});
        await vm.publishProduct('p1');
        expect(vm.publishErrors.p1).toBe('Error al publicar.');

        productsApi.unpublishProduct.and.rejectWith({});
        await vm.unpublishProduct('p1');
        expect(vm.publishErrors.p1).toBe('Error al despublicar.');

        productsApi.deleteProduct.and.rejectWith({});
        await vm.deleteProduct('p1');
        expect(vm.publishErrors.p1).toBe('Error al eliminar.');
        expect(vm.publishingId).toBeNull();
      });

      it('currently decrements KPIs and meta total when deleting an unknown id', async () => {
        vm.products = [mockProduct({ id: 'p1' })];
        vm.meta = { page: 1, per_page: 20, total: 1, total_pages: 1 };
        vm._catalogKpis = { total: 1, published: 0, drafts: 1, unpublished: 0, withImage: 1 };

        await expectAsync(vm.deleteProduct('ghost')).toBeResolvedTo({ status: 'success' });

        expect(productsApi.deleteProduct).toHaveBeenCalledWith('ghost');
        expect(vm.products.map((product) => product.id)).toEqual(['p1']);
        expect(vm.kpis.total).toBe(0);
        expect(vm.meta.total).toBe(0);
        expect(vm.meta.total_pages).toBe(0);
      });

      it('deletes a product when meta is missing and recalculates a remaining total', async () => {
        vm.products = [mockProduct({ id: 'p1' })];
        vm.meta = null;
        vm._catalogKpis = { total: 1, published: 0, drafts: 1, unpublished: 0, withImage: 1 };

        await expectAsync(vm.deleteProduct('p1')).toBeResolvedTo({ status: 'success' });
        expect(vm.products).toEqual([]);
        expect(vm.kpis.total).toBe(0);

        vm = new SellerProductsViewModel({ productsApi });
        vm.products = [mockProduct({ id: 'p1' }), mockProduct({ id: 'p2' })];
        vm.meta = { page: 1, per_page: 20, total: 27, total_pages: 2 };
        vm._catalogKpis = { total: 27, published: 0, drafts: 2, unpublished: 0, withImage: 2 };

        await expectAsync(vm.deleteProduct('p1')).toBeResolvedTo({ status: 'success' });
        expect(vm.meta).toEqual({ page: 1, per_page: 20, total: 26, total_pages: 2 });
        expect(vm.kpis.total).toBe(26);
      });

      it('ignores null and id-less external updates', () => {
        const listener = watch(vm);
        vm.products = [mockProduct({ id: 'p1' })];

        vm.applyProductUpdate(null);
        vm.applyProductUpdate(undefined);
        vm.applyProductUpdate({ name: 'no id' });

        expect(vm.products[0].id).toBe('p1');
        expect(listener).not.toHaveBeenCalled();
      });

      it('falls back to local KPIs and exposes the publish tooltip', () => {
        expect(vm.kpis).toEqual({
          total: 0,
          published: 0,
          drafts: 0,
          unpublished: 0,
          withImage: 0,
        });
        expect(vm.publishTooltip).toBe('Sube al menos una imagen para publicar este producto.');
      });
    });
  })();
})();
