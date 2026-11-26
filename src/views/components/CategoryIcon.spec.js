import { CategoryIcon, normalizeCategoryKey } from './CategoryIcon.js';

describe('CategoryIcon', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('normalizes names and renders the mapped icon locally', () => {
    globalThis.fetch = jasmine.createSpy('fetch');
    const wrapper = new CategoryIcon({ name: 'Tecnología', size: 30 }).render();

    expect(normalizeCategoryKey('Tecnología')).toBe('tecnologia');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(wrapper.getAttribute('role')).toBe('img');
    expect(wrapper.querySelector('svg')).not.toBeNull();
    expect(wrapper.querySelector('svg').namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(wrapper.querySelector('svg').dataset.icon).toBe('laptop');
  });

  it('matches compound Spanish names and prioritizes an exact category key', () => {
    const compound = new CategoryIcon({ name: 'Electrónica y Tecnología' }).render();
    const keyed = new CategoryIcon({ name: 'Casa', key: 'hogar-y-jardin' }).render();

    expect(compound.querySelector('svg').dataset.icon).toBe('smartphone');
    expect(keyed.querySelector('svg').dataset.icon).toBe('home');
    expect(compound.querySelector('svg')).not.toBeNull();
    expect(keyed.querySelector('svg')).not.toBeNull();
  });

  it('renders the local placeholder for unknown categories', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
      ok: true,
      text: () => Promise.resolve('<svg viewBox="0 0 24 24"></svg>'),
    });

    const wrapper = new CategoryIcon({ name: 'Categoría desconocida' }).render();
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.className).toContain('q-category-icon--categoria-desconocida');
    expect(wrapper.getAttribute('aria-label')).toBe('Categoría desconocida');
    expect(wrapper.querySelector('svg')).not.toBeNull();
  });

  it('renders the placeholder without throwing when fetch rejects', async () => {
    globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('offline'));
    const wrapper = new CategoryIcon({ name: 'Categoría sin correspondencia' }).render();
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.getAttribute('aria-label')).toBe('Categoría sin correspondencia');
    expect(wrapper.className).toContain('q-category-icon');
  });
});
