const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/v1';
const PAGE_ORIGIN = globalThis.location?.origin || 'http://localhost';

const ASSET_ORIGIN = new URL(API_BASE_URL, PAGE_ORIGIN).origin;

/**
 * Returns the preferred product image URL, resolving backend-relative paths
 * against the API host.
 * @param {Object} product
 * @returns {string|null}
 */
export function getProductImageUrl(product) {
  const gallery = product?.images?.[0];
  const imagePath = [
    product?.primary_image_path,
    gallery?.url,
    gallery?.image_path,
    gallery?.path,
  ].find((path) => typeof path === 'string' && path.trim() !== '');

  if (!imagePath) return null;

  try {
    return new URL(imagePath.trim(), `${ASSET_ORIGIN}/`).href;
  } catch {
    return null;
  }
}
