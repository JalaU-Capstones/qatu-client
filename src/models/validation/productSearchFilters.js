/**
 * Client-side rules for the catalog search and filters
 */

/** Same limit as the API `search` param. */
export const SEARCH_MAX_LENGTH = 200;

/**
 * @typedef {Object} ProductSearchFilters
 * @property {string} search      Trimmed keyword, empty when not searching.
 * @property {string} category    Category slug, empty for all categories.
 * @property {number|null} minPrice
 * @property {number|null} maxPrice
 */

/** @returns {ProductSearchFilters} */
export function createEmptyFilters() {
  return { search: '', category: '', minPrice: null, maxPrice: null };
}

/**
 * Converts a raw input value into a price.
 * @param {string|number|null|undefined} value
 * @returns {number|null} `null` when empty, `NaN` when it is not a number.
 */
export function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  return Number(text);
}

/**
 * Normalizes raw form values and validates them.
 * @param {Object} [raw]
 * @param {string} [raw.search]
 * @param {string} [raw.category]
 * @param {string|number|null} [raw.minPrice]
 * @param {string|number|null} [raw.maxPrice]
 * @returns {{ filters: ProductSearchFilters, error: string }} `error` is empty when valid.
 */
export function validateSearchFilters(raw = {}) {
  const filters = {
    search: typeof raw.search === 'string' ? raw.search.trim() : '',
    category: typeof raw.category === 'string' ? raw.category.trim() : '',
    minPrice: parsePrice(raw.minPrice),
    maxPrice: parsePrice(raw.maxPrice),
  };

  const isValidPrice = (price) => price === null || (Number.isFinite(price) && price >= 0);

  let error = '';
  if (filters.search.length > SEARCH_MAX_LENGTH) {
    error = `La búsqueda puede tener como máximo ${SEARCH_MAX_LENGTH} caracteres.`;
  } else if (!isValidPrice(filters.minPrice)) {
    error = 'El precio mínimo debe ser un número mayor o igual a 0.';
  } else if (!isValidPrice(filters.maxPrice)) {
    error = 'El precio máximo debe ser un número mayor o igual a 0.';
  } else if (
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.maxPrice < filters.minPrice
  ) {
    error = 'El precio máximo debe ser mayor o igual al precio mínimo.';
  }

  return { filters, error };
}
