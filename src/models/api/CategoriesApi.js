const BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:3000/v1';

export class CategoriesApi {
  /**
   * Fetches the active categories, ordered by position and name.
   * @param {Object} [params]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=100] The API accepts at most 100
   * @returns {Promise<{ data: Array<Object>, meta: Object }>}
   * @throws {Error} When the server responds with a non-2xx status
   */
  async getCategories({ page = 1, limit = 100 } = {}) {
    const url = `${BASE_URL}/categories?page=${page}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
