import { createImageWithFallback } from './ImageWithFallback.js';

describe('ImageWithFallback', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders the provided image source and alt text', () => {
    const image = createImageWithFallback({
      src: 'https://example.com/item.png',
      alt: 'Product image',
    });

    expect(image).toBeInstanceOf(HTMLImageElement);
    expect(image.src).toContain('https://example.com/item.png');
    expect(image.alt).toBe('Product image');
    expect(image.loading).toBe('lazy');
  });

  it('displays the polygon placeholder when the image source is missing', () => {
    const placeholder = createImageWithFallback({ src: null });
    const image = placeholder.querySelector('img');

    expect(image).not.toBeNull();
    expect(image.src).toContain('product-placeholder.svg');
  });

  it('returns a single accessible placeholder image when a class is provided', () => {
    const placeholder = createImageWithFallback({
      src: null,
      alt: '',
      placeholderImageClassName: 'q-product-card-placeholder-img',
      placeholderAlt: 'Imagen del producto',
    });

    expect(placeholder).toBeInstanceOf(HTMLImageElement);
    expect(placeholder.classList.contains('q-product-card-placeholder-img')).toBe(true);
    expect(placeholder.src).toContain('product-placeholder.svg');
    expect(placeholder.alt).toBe('Imagen del producto');
  });

  it('replaces a failed image with the polygon placeholder', () => {
    const image = createImageWithFallback({
      src: 'https://example.com/broken-image.png',
      alt: 'Product image',
      placeholderImageClassName: 'q-product-card-placeholder-img',
      placeholderAlt: 'Product image',
    });
    container.appendChild(image);

    image.dispatchEvent(new Event('error'));

    const placeholder = container.querySelector('img');
    expect(placeholder).not.toBe(image);
    expect(placeholder.src).toContain('product-placeholder.svg');
    expect(placeholder.alt).toBe('Product image');
  });

  it('supports a custom placeholder source', () => {
    const placeholder = createImageWithFallback({
      src: null,
      placeholderSrc: 'https://example.com/custom-fallback.svg',
      placeholderImageClassName: 'placeholder',
    });

    expect(placeholder.src).toContain('https://example.com/custom-fallback.svg');
  });
});
