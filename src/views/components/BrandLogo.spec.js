import { createBrandLogo } from './BrandLogo.js';

describe('BrandLogo', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates an SVG element with the expected namespace, viewBox and accessibility attributes', () => {
    const logo = createBrandLogo();

    expect(logo).toBeInstanceOf(SVGElement);
    expect(logo.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(logo.tagName.toLowerCase()).toBe('svg');
    expect(logo.getAttribute('viewBox')).toBe('0 0 142 40');
    expect(logo.getAttribute('role')).toBe('img');
    expect(logo.getAttribute('aria-label')).toBe('Q’atu');
  });

  it('applies the base and default md size classes', () => {
    const logo = createBrandLogo();

    expect(Array.from(logo.classList)).toEqual([
      'q-brand-logo',
      'q-brand-logo-svg',
      'q-brand-logo--md',
    ]);
  });

  it('defaults to md for no argument, an empty object and undefined size', () => {
    expect(createBrandLogo().classList.contains('q-brand-logo--md')).toBe(true);
    expect(createBrandLogo({}).classList.contains('q-brand-logo--md')).toBe(true);
    expect(createBrandLogo({ size: undefined }).classList.contains('q-brand-logo--md')).toBe(true);
  });

  it('applies sm, lg and unknown size values as pass-through modifier classes', () => {
    expect(createBrandLogo({ size: 'sm' }).classList.contains('q-brand-logo--sm')).toBe(true);
    expect(createBrandLogo({ size: 'lg' }).classList.contains('q-brand-logo--lg')).toBe(true);
    expect(createBrandLogo({ size: 'xl' }).classList.contains('q-brand-logo--xl')).toBe(true);
    expect(createBrandLogo({ size: 'xl' }).classList.contains('q-brand-logo--md')).toBe(false);
  });

  it('gives each logo a unique clip id and links the group to it', () => {
    const first = createBrandLogo();
    const second = createBrandLogo();
    const firstId = first.querySelector('defs').firstElementChild.id;
    const secondId = second.querySelector('defs').firstElementChild.id;

    expect(firstId).toMatch(/^qatu-brand-logo-clip-\d+$/);
    expect(secondId).toMatch(/^qatu-brand-logo-clip-\d+$/);
    expect(firstId).not.toBe(secondId);
    expect(first.querySelector('g').getAttribute('clip-path')).toBe(`url(#${firstId})`);
    expect(second.querySelector('g').getAttribute('clip-path')).toBe(`url(#${secondId})`);
  });

  it('defines the clip rectangle with the exact geometry', () => {
    const rect = createBrandLogo().querySelector('defs').firstElementChild.querySelector('rect');

    expect(rect.getAttribute('x')).toBe('1');
    expect(rect.getAttribute('y')).toBe('1');
    expect(rect.getAttribute('width')).toBe('38');
    expect(rect.getAttribute('height')).toBe('38');
    expect(rect.getAttribute('rx')).toBe('10');
  });

  it('renders the four colored stripes in order', () => {
    const stripes = createBrandLogo().querySelectorAll('g[clip-path] rect');

    expect(stripes.length).toBe(4);
    expect(Array.from(stripes, (rect) => rect.getAttribute('fill'))).toEqual([
      '#ef6b73',
      '#f3a5bd',
      '#91b5ed',
      '#f2d47b',
    ]);
    expect(Array.from(stripes, (rect) => rect.getAttribute('y'))).toEqual([
      '1',
      '10.5',
      '20',
      '29.5',
    ]);
    expect(Array.from(stripes, (rect) => rect.getAttribute('height'))).toEqual([
      '38',
      '9.5',
      '9.5',
      '9.5',
    ]);
  });

  it('renders the white diamond polygon', () => {
    const polygon = createBrandLogo().querySelector('polygon');

    expect(polygon.getAttribute('points')).toBe('20,11.5 28.5,20 20,28.5 11.5,20');
    expect(polygon.getAttribute('fill')).toBe('#fff');
  });

  it('renders the wordmark with its typography and accented tspan', () => {
    const text = createBrandLogo().querySelector('text');

    expect(text.textContent).toBe('Q’atu');
    expect(text.getAttribute('fill')).toBe('currentColor');
    expect(text.getAttribute('x')).toBe('49');
    expect(text.getAttribute('y')).toBe('29');
    expect(text.getAttribute('font-family')).toBe('GeistSans, Inter, system-ui, sans-serif');
    expect(text.getAttribute('font-size')).toBe('29');
    expect(text.getAttribute('font-weight')).toBe('700');
    expect(text.getAttribute('letter-spacing')).toBe('-1.1');

    const tspan = text.querySelector('tspan');
    expect(tspan.textContent).toBe('’');
    expect(tspan.getAttribute('fill')).toBe('var(--q-accent, #e11d74)');
  });

  it('can be mounted into and removed from a container', () => {
    const logo = createBrandLogo();
    container.appendChild(logo);

    expect(container.querySelector('svg.q-brand-logo')).toBe(logo);

    logo.remove();
    expect(container.querySelector('svg.q-brand-logo')).toBeNull();
  });

  it('throws a TypeError when explicitly passed null', () => {
    expect(() => createBrandLogo(null)).toThrowError(TypeError);
  });
});
