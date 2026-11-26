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

// Recovered coverage from backup/pre-rebase-tests
(() => {
  (() => {
    describe('ImageWithFallback additional branches (recovered 1)', () => {
      let container;

      beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
      });

      afterEach(() => {
        container.remove();
      });

      it('returns the wrapper placeholder for missing, empty and zero sources', () => {
        const placeholders = [
          createImageWithFallback(),
          createImageWithFallback({}),
          createImageWithFallback({ src: undefined }),
          createImageWithFallback({ src: '' }),
          createImageWithFallback({ src: 0 }),
        ];

        placeholders.forEach((placeholder) => {
          expect(placeholder.tagName.toLowerCase()).toBe('div');
          const mark = placeholder.querySelector('img');
          expect(mark).not.toBeNull();
          expect(mark.getAttribute('src')).toContain('product-placeholder.svg');
          expect(mark.getAttribute('width')).toBe('24');
          expect(mark.getAttribute('height')).toBe('24');
        });
      });

      it('treats a whitespace-only source as a truthy src and renders an img', () => {
        const image = createImageWithFallback({ src: '   ', alt: '' });

        expect(image).toBeInstanceOf(HTMLImageElement);
        expect(image.getAttribute('src')).toBe('   ');
        expect(image.alt).toBe('');
        expect(image.loading).toBe('lazy');
      });

      it('applies wrapper, size, mark and label options to the placeholder wrapper', () => {
        const placeholder = createImageWithFallback({
          src: null,
          placeholderClassName: 'custom-wrapper',
          size: 48,
          markClassName: 'custom-mark',
          label: 'Sin imagen',
          labelClassName: 'custom-label',
        });

        expect(placeholder.tagName.toLowerCase()).toBe('div');
        expect(placeholder.className).toBe('custom-wrapper');

        const mark = placeholder.querySelector('.custom-mark > img');
        expect(mark).not.toBeNull();
        expect(mark.getAttribute('width')).toBe('48');
        expect(mark.getAttribute('height')).toBe('48');

        const label = placeholder.querySelector('p');
        expect(label.textContent).toBe('Sin imagen');
        expect(label.className).toBe('q-image-fallback__label custom-label');
      });

      it('direct placeholder images ignore wrapper, mark, label and size options', () => {
        const placeholder = createImageWithFallback({
          src: null,
          placeholderImageClassName: 'direct-placeholder',
          placeholderClassName: 'custom-wrapper',
          markClassName: 'custom-mark',
          label: 'Sin imagen',
          labelClassName: 'custom-label',
          size: 99,
          alt: 'Fallback',
        });

        expect(placeholder).toBeInstanceOf(HTMLImageElement);
        expect(placeholder.className).toBe('direct-placeholder');
        expect(placeholder.alt).toBe('Fallback');
        expect(placeholder.getAttribute('width')).toBeNull();
        expect(placeholder.getAttribute('height')).toBeNull();
        expect(placeholder.querySelector('span')).toBeNull();
        expect(placeholder.querySelector('p')).toBeNull();
      });

      it('replaces a failed image with the wrapper placeholder inside its parent', () => {
        const image = createImageWithFallback({ src: 'https://example.com/broken.png', alt: 'x' });
        container.appendChild(image);

        // Non-bubbling: Jasmine treats any 'error' event reaching window as an uncaught error.
        image.dispatchEvent(new Event('error'));

        expect(container.children.length).toBe(1);
        const wrapper = container.firstElementChild;
        expect(wrapper.tagName.toLowerCase()).toBe('div');
        expect(wrapper.querySelector('img').getAttribute('src')).toContain(
          'product-placeholder.svg'
        );
      });

      it('replaces the image only once when the error event fires twice', () => {
        const image = createImageWithFallback({ src: 'https://example.com/broken.png' });
        container.appendChild(image);

        image.dispatchEvent(new Event('error'));
        image.dispatchEvent(new Event('error'));

        expect(container.children.length).toBe(1);
        expect(container.querySelectorAll('img').length).toBe(1);
        expect(container.querySelector('img')).not.toBe(image);
      });

      it('does not replace a detached image when the error event fires', () => {
        const image = createImageWithFallback({ src: 'https://example.com/detached.png' });

        image.dispatchEvent(new Event('error', { bubbles: true }));

        expect(image).toBeInstanceOf(HTMLImageElement);
        expect(image.parentNode).toBeNull();
        expect(image.getAttribute('src')).toBe('https://example.com/detached.png');
      });

      it('normalizes a null alt to an empty string for images and placeholders', () => {
        expect(createImageWithFallback({ src: '/img.png', alt: null }).alt).toBe('');
        expect(
          createImageWithFallback({
            src: null,
            alt: null,
            placeholderImageClassName: 'direct-placeholder',
          }).alt
        ).toBe('');
        expect(createImageWithFallback({ src: null, alt: null }).querySelector('img').alt).toBe('');
      });

      it('applies imageClassName to loaded images and the default label class without a suffix', () => {
        const image = createImageWithFallback({
          src: 'https://example.com/valid.png',
          imageClassName: 'loaded-image',
        });

        expect(image.className).toBe('loaded-image');

        const placeholder = createImageWithFallback({ src: null, label: 'Sin imagen' });
        expect(placeholder.querySelector('p').className).toBe('q-image-fallback__label');
      });
    });
  })();
})();
