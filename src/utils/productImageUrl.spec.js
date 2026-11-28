import { getProductImageUrl } from './productImageUrl.js';

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000/v1';
const ASSET_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin;

describe('productImageUrl', () => {
  it('keeps absolute http and https URLs unchanged', () => {
    expect(getProductImageUrl({ primary_image_path: 'https://cdn.example.com/img/a.jpg' })).toBe(
      'https://cdn.example.com/img/a.jpg'
    );
    expect(getProductImageUrl({ primary_image_path: 'http://cdn.example.com/img/b.jpg' })).toBe(
      'http://cdn.example.com/img/b.jpg'
    );
  });

  it('resolves storage-relative paths against the API origin', () => {
    expect(
      getProductImageUrl({ primary_image_path: '/product-images/productos/taqueria.png' })
    ).toBe(`${ASSET_ORIGIN}/product-images/productos/taqueria.png`);
    expect(getProductImageUrl({ primary_image_path: 'product-images/taqueria.png' })).toBe(
      `${ASSET_ORIGIN}/product-images/taqueria.png`
    );
  });

  it('uses the first gallery fallback in order', () => {
    expect(getProductImageUrl({ images: [{ url: 'https://cdn.example.com/gallery.jpg' }] })).toBe(
      'https://cdn.example.com/gallery.jpg'
    );
    expect(getProductImageUrl({ images: [{ image_path: 'product-images/gallery.png' }] })).toBe(
      `${ASSET_ORIGIN}/product-images/gallery.png`
    );
    expect(getProductImageUrl({ images: [{ path: 'product-images/gallery.webp' }] })).toBe(
      `${ASSET_ORIGIN}/product-images/gallery.webp`
    );
  });

  it('prefers primary_image_path over any gallery entry', () => {
    expect(
      getProductImageUrl({
        primary_image_path: 'product-images/main.png',
        images: [{ url: 'https://cdn.example.com/gallery.jpg' }],
      })
    ).toBe(`${ASSET_ORIGIN}/product-images/main.png`);
  });

  it('skips blank and non-string candidates before choosing a usable path', () => {
    expect(
      getProductImageUrl({
        primary_image_path: '   ',
        images: [{ url: null, image_path: 'product-images/fallback.png', path: '  ' }],
      })
    ).toBe(`${ASSET_ORIGIN}/product-images/fallback.png`);
  });

  it('trims the selected path before building the URL', () => {
    expect(getProductImageUrl({ primary_image_path: '  /product-images/a.png  ' })).toBe(
      `${ASSET_ORIGIN}/product-images/a.png`
    );
  });

  it('returns null when the product has no usable image', () => {
    expect(getProductImageUrl(null)).toBeNull();
    expect(getProductImageUrl(undefined)).toBeNull();
    expect(getProductImageUrl({})).toBeNull();
    expect(getProductImageUrl({ images: [] })).toBeNull();
    expect(getProductImageUrl({ primary_image_path: '', images: [{ url: ' ' }] })).toBeNull();
    expect(getProductImageUrl({ primary_image_path: null, images: null })).toBeNull();
  });

  it('returns null when the candidate path cannot be parsed as a URL', () => {
    expect(getProductImageUrl({ primary_image_path: 'http://[invalid-host' })).toBeNull();
  });
});
