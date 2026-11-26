import { ProductsApi } from './ProductsApi.js';
import { ProfilesApi } from './ProfilesApi.js';

/**
 * Builds a seller list from the public product and profile endpoints.
 */
export class SellersApi {
  constructor({
    apiFetchFn = null,
    productsApi = apiFetchFn ? new ProductsApi({ apiFetchFn }) : new ProductsApi(),
    profilesApi = new ProfilesApi(),
  } = {}) {
    this.productsApi = productsApi;
    this.profilesApi = profilesApi;
  }

  /**
   * @param {{ limit?: number }} [options]
   * @returns {Promise<Array<{
   *   id: string, username: string, fullName: string, bio: string|null,
   *   avatarPath: string|null, productCount: number, rating: null, ratingCount: null
   * }>>}
   */
  async listSellers({ limit = 100 } = {}) {
    let response;
    try {
      // Known limitation: sellers whose products fall outside the first 100
      // results will not appear. Backend follow-up: expose /v1/sellers with
      // sort=product_count when available.
      response = await this.productsApi.getProducts({ page: 1, limit });
    } catch (error) {
      throw new Error('No se pudieron cargar las tiendas', { cause: error });
    }

    const productsBySeller = new Map();
    for (const product of response?.data || []) {
      if (!product?.seller_id) continue;
      const products = productsBySeller.get(product.seller_id) || [];
      products.push(product);
      productsBySeller.set(product.seller_id, products);
    }

    const sellerIds = [...productsBySeller.keys()];
    const profiles = await Promise.all(
      sellerIds.map((id) =>
        this.profilesApi
          .getById(id)
          .then((result) => result.data)
          .catch(() => null)
      )
    );

    return profiles
      .map((profile, index) => {
        if (!profile) return null;
        const products = productsBySeller.get(sellerIds[index]);
        return {
          id: profile.id,
          username: profile.username || '',
          fullName: profile.full_name || profile.username || '',
          bio: profile.bio || null,
          avatarPath: profile.avatar_path || null,
          productCount: products.length,
          rating: null,
          ratingCount: null,
        };
      })
      .filter(Boolean)
      .sort(
        (left, right) =>
          right.productCount - left.productCount ||
          left.fullName.localeCompare(right.fullName, 'es', { sensitivity: 'base' })
      );
  }
}
