import { createImageWithFallback } from './ImageWithFallback.js';

describe('ImageWithFallback', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('1. returns an <img> when src is a truthy string', () => {
    const el = createImageWithFallback({ src: 'https://example.com/item.png' });
    expect(el).toBeInstanceOf(HTMLImageElement);
    expect(el.tagName).toBe('IMG');
  });

  it('2. the returned <img> has .src matching the input', () => {
    const src = 'https://example.com/item.png';
    const el = createImageWithFallback({ src });
    expect(el.src.startsWith(src) || el.src.includes(src)).toBe(true);
  });

  it('3. alt is set on the returned <img>', () => {
    const el = createImageWithFallback({
      src: 'https://example.com/item.png',
      alt: 'Test Alt Description',
    });
    expect(el.alt).toBe('Test Alt Description');
  });

  it('4. imageClassName is applied to the <img>', () => {
    const el = createImageWithFallback({
      src: 'https://example.com/item.png',
      imageClassName: 'q-custom-image-class',
    });
    expect(el.classList.contains('q-custom-image-class')).toBe(true);
  });

  it('5. loading === "lazy" on the returned <img>', () => {
    const el = createImageWithFallback({ src: 'https://example.com/item.png' });
    expect(el.loading).toBe('lazy');
  });

  it('6. src === null returns placeholder, NOT an <img> element at the root', () => {
    const el = createImageWithFallback({ src: null });
    expect(el.tagName).toBe('DIV');
    expect(el).not.toBeInstanceOf(HTMLImageElement);
  });

  it('7. src === "" returns placeholder (empty string is falsy)', () => {
    const el = createImageWithFallback({ src: '' });
    expect(el.tagName).toBe('DIV');
    expect(el).not.toBeInstanceOf(HTMLImageElement);
  });

  it('8. placeholder is a <div> with placeholderClassName applied', () => {
    const el = createImageWithFallback({
      src: null,
      placeholderClassName: 'q-custom-placeholder-wrap',
    });
    expect(el.tagName).toBe('DIV');
    expect(el.classList.contains('q-custom-placeholder-wrap')).toBe(true);
  });

  it('9. placeholder contains an inner <img> with placeholderSrc and size width/height', () => {
    const el = createImageWithFallback({
      src: null,
      size: 32,
    });
    const innerImg = el.querySelector('img');
    expect(innerImg).not.toBeNull();
    expect(innerImg.getAttribute('width')).toBe('32');
    expect(innerImg.getAttribute('height')).toBe('32');
    expect(innerImg.src).toContain('placeholder-mark.svg');
    expect(innerImg.alt).toBe('');
  });

  it('10. placeholder contains a <p class="q-image-fallback__label"> with the label text', () => {
    const el = createImageWithFallback({
      src: null,
      label: 'Foto no disponible',
    });
    const labelEl = el.querySelector('p.q-image-fallback__label');
    expect(labelEl).not.toBeNull();
    expect(labelEl.textContent).toBe('Foto no disponible');
  });

  it('11. on <img> error, replaces the <img> in its parent by the placeholder', () => {
    const el = createImageWithFallback({
      src: 'https://example.com/broken-image.png',
      placeholderClassName: 'q-replaced-placeholder',
      label: 'Falló la imagen',
      size: 28,
    });

    container.appendChild(el);
    expect(container.firstElementChild).toBe(el);
    expect(el.tagName).toBe('IMG');

    el.dispatchEvent(new Event('error'));

    const placeholder = container.firstElementChild;
    expect(placeholder).not.toBe(el);
    expect(placeholder.tagName).toBe('DIV');
    expect(placeholder.classList.contains('q-replaced-placeholder')).toBe(true);

    const innerImg = placeholder.querySelector('img');
    expect(innerImg).not.toBeNull();
    expect(innerImg.getAttribute('width')).toBe('28');
    expect(innerImg.getAttribute('height')).toBe('28');

    const labelEl = placeholder.querySelector('p.q-image-fallback__label');
    expect(labelEl).not.toBeNull();
    expect(labelEl.textContent).toBe('Falló la imagen');
  });

  it('12. placeholderSrc override is honored in the placeholder inner <img>', () => {
    const customPlaceholder = 'https://example.com/custom-fallback.svg';
    const el = createImageWithFallback({
      src: null,
      placeholderSrc: customPlaceholder,
    });
    const innerImg = el.querySelector('img');
    expect(innerImg).not.toBeNull();
    expect(innerImg.src).toContain(customPlaceholder);
  });
});
