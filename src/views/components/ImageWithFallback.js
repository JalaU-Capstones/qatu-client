const DEFAULT_PLACEHOLDER_SRC = new URL(
  '../../assets/icons/product-placeholder.svg',
  import.meta.url
).href;

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
 * @param {string} [opts.alt=''] - Alt text for the loaded image
 * @param {number} [opts.size=24] - Size in pixels applied to placeholder mark width/height
 * @param {string} [opts.imageClassName=''] - Class(es) on the <img> element
 * @param {string} [opts.placeholderImageClassName=''] - Class(es) on a direct placeholder <img>;
 *   when provided, no wrapper, mark, or label is rendered.
 * @param {string} [opts.placeholderAlt] - Alt text for a direct placeholder <img>
 * @param {string} [opts.placeholderClassName=''] - Class(es) on the placeholder wrapper
 * @param {string} [opts.markClassName=''] - Optional wrapper around the inner <img>.
 *   When absent, <img> is rendered directly (current behavior).
 * @param {string} [opts.label] - Optional placeholder text. When falsy, no <p> is rendered.
 * @param {string} [opts.labelClassName=''] - Additional class on the <p> (if label present).
 * @param {string} [opts.placeholderSrc] - Optional override for placeholder SVG URL
 * @returns {HTMLElement} The loaded <img>, direct placeholder <img>, or placeholder wrapper.
 */
export function createImageWithFallback(opts = {}) {
  const {
    src,
    alt = '',
    size = 24,
    imageClassName = '',
    placeholderImageClassName = '',
    placeholderAlt = alt,
    placeholderClassName = '',
    markClassName = '',
    label,
    labelClassName = '',
    placeholderSrc = DEFAULT_PLACEHOLDER_SRC,
  } = opts;

  const createPlaceholder = () => {
    if (placeholderImageClassName) {
      const placeholder = document.createElement('img');
      placeholder.src = placeholderSrc;
      placeholder.alt = placeholderAlt || '';
      placeholder.className = placeholderImageClassName;
      placeholder.loading = 'lazy';
      return placeholder;
    }

    const wrapper = document.createElement('div');
    if (placeholderClassName) {
      wrapper.className = placeholderClassName;
    }

    const markImg = document.createElement('img');
    markImg.src = placeholderSrc;
    markImg.alt = '';
    markImg.setAttribute('width', String(size));
    markImg.setAttribute('height', String(size));

    if (markClassName) {
      const mark = document.createElement('span');
      mark.className = markClassName;
      mark.appendChild(markImg);
      wrapper.appendChild(mark);
    } else {
      wrapper.appendChild(markImg);
    }

    if (label) {
      const labelEl = document.createElement('p');
      labelEl.className = labelClassName
        ? `q-image-fallback__label ${labelClassName}`
        : 'q-image-fallback__label';
      labelEl.textContent = label;
      wrapper.appendChild(labelEl);
    }

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
