const DEFAULT_PLACEHOLDER_SRC = new URL('../../assets/icons/placeholder-mark.svg', import.meta.url)
  .href;

/**
 * Renders an <img> that falls back to the project placeholder when the
 * source is missing or fails to load. Stateless pure function — no
 * lifecycle, no class. Returns the DOM node ready to append.
 *
 * Note on error handling: when `src` fails to load, the error listener
 * replaces the `<img>` in-place inside its parent (`parentNode.replaceChild`).
 * The returned `<img>` must therefore be attached to a parent node before the
 * `error` event fires for replacement to succeed. If the element is detached
 * when the error fires, replacement cannot occur automatically.
 *
 * @param {Object} [opts={}]
 * @param {string|null|undefined} [opts.src] - Image source URL; falsy returns placeholder directly
 * @param {string} [opts.alt=''] - Alt text for <img> (ignored by placeholder)
 * @param {number} [opts.size=24] - Size in pixels applied to placeholder mark width/height
 * @param {string} [opts.imageClassName=''] - Class(es) on the <img> element
 * @param {string} [opts.placeholderClassName=''] - Class(es) on the placeholder wrapper
 * @param {string} [opts.label='Imagen del producto'] - Placeholder text
 * @param {string} [opts.placeholderSrc] - Optional override for placeholder SVG URL
 * @returns {HTMLElement} The <img> when src is valid, or the placeholder
 *   wrapper when src is missing/empty/error.
 */
export function createImageWithFallback(opts = {}) {
  const {
    src,
    alt = '',
    size = 24,
    imageClassName = '',
    placeholderClassName = '',
    label = 'Imagen del producto',
    placeholderSrc = DEFAULT_PLACEHOLDER_SRC,
  } = opts;

  const createPlaceholder = () => {
    const wrapper = document.createElement('div');
    if (placeholderClassName) {
      wrapper.className = placeholderClassName;
    }

    const markImg = document.createElement('img');
    markImg.src = placeholderSrc;
    markImg.alt = '';
    markImg.setAttribute('width', String(size));
    markImg.setAttribute('height', String(size));
    wrapper.appendChild(markImg);

    const labelEl = document.createElement('p');
    labelEl.className = 'q-image-fallback__label';
    labelEl.textContent = label;
    wrapper.appendChild(labelEl);

    return wrapper;
  };

  if (!src) {
    return createPlaceholder();
  }

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  if (imageClassName) {
    img.className = imageClassName;
  }
  img.loading = 'lazy';

  img.addEventListener(
    'error',
    () => {
      if (img.parentNode) {
        img.parentNode.replaceChild(createPlaceholder(), img);
      }
    },
    { once: true }
  );

  return img;
}
