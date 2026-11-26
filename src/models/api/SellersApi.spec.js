import { SellersApi } from './SellersApi.js';

describe('SellersApi', () => {
  const product = (seller_id) => ({ seller_id });
  const profile = (id, fields = {}) => ({
    id,
    username: id,
    full_name: id,
    avatar_path: null,
    bio: null,
    ...fields,
  });

  it('requests the first 100 products using getProducts', async () => {
    const productsApi = { getProducts: jasmine.createSpy().and.resolveTo({ data: [] }) };
    const sellersApi = new SellersApi({ productsApi, profilesApi: {} });

    await sellersApi.listSellers();

    expect(productsApi.getProducts).toHaveBeenCalledOnceWith({ page: 1, limit: 100 });
  });

  it('groups products, deduplicates profiles, and sorts by count then Spanish name', async () => {
    const productsApi = {
      getProducts: jasmine
        .createSpy()
        .and.resolveTo({ data: [product('b'), product('a'), product('b'), {}, product('c')] }),
    };
    const profilesApi = {
      getById: jasmine.createSpy().and.callFake(async (id) => ({
        data: profile(id, { full_name: { a: 'Árbol', b: 'Beta', c: 'alfa' }[id] }),
      })),
    };
    const sellers = await new SellersApi({ productsApi, profilesApi }).listSellers();

    expect(profilesApi.getById).toHaveBeenCalledTimes(3);
    expect(
      profilesApi.getById.calls
        .allArgs()
        .map(([id]) => id)
        .sort()
    ).toEqual(['a', 'b', 'c']);
    expect(sellers.map(({ fullName, productCount }) => [fullName, productCount])).toEqual([
      ['Beta', 2],
      ['alfa', 1],
      ['Árbol', 1],
    ]);
  });

  it('excludes profiles that fail and uses null ranking placeholders', async () => {
    const productsApi = {
      getProducts: jasmine.createSpy().and.resolveTo({ data: [product('ok'), product('missing')] }),
    };
    const profilesApi = {
      getById: jasmine.createSpy().and.callFake(async (id) => {
        if (id === 'missing') throw new Error('not found');
        return { data: profile('ok', { username: 'vendedora', full_name: 'Vendedora' }) };
      }),
    };

    await expectAsync(new SellersApi({ productsApi, profilesApi }).listSellers()).toBeResolvedTo([
      {
        id: 'ok',
        username: 'vendedora',
        fullName: 'Vendedora',
        bio: null,
        avatarPath: null,
        productCount: 1,
        rating: null,
        ratingCount: null,
      },
    ]);
  });

  it('returns an empty list when no products have sellers', async () => {
    const productsApi = {
      getProducts: jasmine.createSpy().and.resolveTo({ data: [product(null)] }),
    };
    const profilesApi = { getById: jasmine.createSpy() };

    await expectAsync(new SellersApi({ productsApi, profilesApi }).listSellers()).toBeResolvedTo(
      []
    );
    expect(profilesApi.getById).not.toHaveBeenCalled();
  });

  it('throws a descriptive error when products fail', async () => {
    const productsApi = { getProducts: jasmine.createSpy().and.rejectWith(new Error('offline')) };

    await expectAsync(
      new SellersApi({ productsApi, profilesApi: {} }).listSellers()
    ).toBeRejectedWithError('No se pudieron cargar las tiendas');
  });
});
