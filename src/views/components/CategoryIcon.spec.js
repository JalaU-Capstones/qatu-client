import { CategoryIcon, normalizeCategoryKey } from './CategoryIcon.js';

describe('CategoryIcon', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('normalizes names and fetches the Lucide icon', async () => {
    const calls = [];
    globalThis.fetch = jasmine.createSpy('fetch').and.callFake((url) => {
      calls.push(url);
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<svg viewBox="0 0 24 24" stroke="currentColor"></svg>'),
      });
    });

    const wrapper = new CategoryIcon({ name: 'Tecnología', size: 30 }).render();
    await Promise.resolve();
    await Promise.resolve();

    expect(normalizeCategoryKey('Tecnología')).toBe('tecnologia');
    expect(calls[0]).toBe('https://api.iconify.design/lucide/laptop.svg');
    expect(wrapper.getAttribute('role')).toBe('img');
    expect(wrapper.querySelector('svg')).not.toBeNull();
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
    const wrapper = new CategoryIcon({ name: 'Electrónica' }).render();
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.getAttribute('aria-label')).toBe('Electrónica');
    expect(wrapper.className).toContain('q-category-icon');
  });
});
