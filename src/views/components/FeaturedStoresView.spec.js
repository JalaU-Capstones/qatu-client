import { FeaturedStoresViewModel } from '../../viewmodels/components/FeaturedStoresViewModel.js';
import { FeaturedStoresView } from './FeaturedStoresView.js';

describe('FeaturedStoresView', () => {
  let view;
  let viewModel;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    viewModel = new FeaturedStoresViewModel();
    view = new FeaturedStoresView(viewModel);
  });

  afterEach(() => {
    view.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should render a section element with class q-featured-stores and .q-section-container', () => {
    const el = view.render();
    expect(el.tagName.toLowerCase()).toBe('section');
    expect(el.classList.contains('q-featured-stores')).toBe(true);
    expect(el.getAttribute('aria-labelledby')).toBe('q-featured-stores-title');
    expect(el.querySelector('.q-section-container')).not.toBeNull();
  });

  it('should contain header with title, subtitle, and see-all link', () => {
    const el = view.render();
    const title = el.querySelector('#q-featured-stores-title');
    const subtitle = el.querySelector('.q-featured-stores__subtitle');
    const seeAll = el.querySelector('.q-featured-stores__see-all');

    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Tiendas destacadas');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toBe('Conoce a quienes crean');
    expect(seeAll).not.toBeNull();
    expect(seeAll.textContent).toContain('Ver tiendas');
    expect(seeAll.getAttribute('href')).toBe('/tiendas');
  });

  it('eyebrow renders above title in DOM order', () => {
    const el = view.render();
    const eyebrow = el.querySelector('.q-featured-stores__eyebrow');
    const title = el.querySelector('#q-featured-stores-title');

    expect(eyebrow).not.toBeNull();
    expect(eyebrow.textContent).toBe('Conoce a quienes crean');
    expect(eyebrow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should render exactly 3 store cards by default', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    expect(cards.length).toBe(3);
  });

  it('should render each store card with initials avatar, name, category, rating with star svg, and CTA button', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    const firstCard = cards[0];

    const avatar = firstCard.querySelector('.q-store-card__avatar');
    const initials = firstCard.querySelector('.q-store-card__initials');
    const name = firstCard.querySelector('.q-store-card__name');
    const category = firstCard.querySelector('.q-store-card__category');
    const rating = firstCard.querySelector('.q-store-card__rating');
    const star = firstCard.querySelector('.q-store-card__star');
    const cta = firstCard.querySelector('.q-store-card__cta');

    expect(avatar).not.toBeNull();
    expect(avatar.querySelector('img')).toBeNull();
    expect(initials).not.toBeNull();
    expect(initials.textContent).toBe('TI');
    expect(name).not.toBeNull();
    expect(name.textContent).toBe('Tejidos Illimani');
    expect(category).not.toBeNull();
    expect(category.textContent).toBe('Textiles artesanales');
    expect(rating).not.toBeNull();
    expect(star.querySelector('svg')).not.toBeNull();
    expect(rating.textContent).toContain('4.8 · 132 reseñas');
    expect(cta).not.toBeNull();
    expect(cta.textContent).toBe('Ver tienda');
    expect(cta.getAttribute('href')).toBe('/tiendas/tejidos-illimani');
  });

  it('card root has modifier q-store-card--{accent}', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    expect(cards[0].classList.contains('q-store-card--pink')).toBe(true);
    expect(cards[1].classList.contains('q-store-card--blue')).toBe(true);
    expect(cards[2].classList.contains('q-store-card--purple')).toBe(true);
  });

  it('avatar contains initials text, not an img', () => {
    const el = view.render();
    const cards = el.querySelectorAll('.q-store-card');
    cards.forEach((card) => {
      const avatar = card.querySelector('.q-store-card__avatar');
      expect(avatar.querySelector('img')).toBeNull();
      const initials = avatar.querySelector('.q-store-card__initials');
      expect(initials).not.toBeNull();
      expect(initials.textContent.length).toBeGreaterThan(0);
      expect(initials.textContent.length).toBeLessThanOrEqual(2);
    });
  });

  it('should prevent default navigation on CTA click', () => {
    const el = view.render();
    const cta = el.querySelector('.q-store-card__cta');
    const clickEvent = new MouseEvent('click', { cancelable: true, bubbles: true });

    cta.dispatchEvent(clickEvent);
    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it('should mount into container correctly', () => {
    view.mount(container);
    expect(container.querySelector('.q-featured-stores')).not.toBeNull();
  });

  it('should remove the element from DOM on destroy', () => {
    view.mount(container);
    expect(container.querySelector('.q-featured-stores')).not.toBeNull();

    view.destroy();
    expect(container.querySelector('.q-featured-stores')).toBeNull();
    expect(view.element).toBeNull();
  });

  it('should re-render only the grid when viewModel.setStores is called', () => {
    const el = view.mount(container);
    const headerBefore = el.querySelector('.q-featured-stores__header');

    viewModel.setStores([
      {
        id: 'nueva',
        name: 'Tienda Test',
        category: 'Categoría Test',
        rating: 5.0,
        reviewCount: 1,
        href: '/tiendas/test',
      },
    ]);

    const cards = el.querySelectorAll('.q-store-card');
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('.q-store-card__name').textContent).toBe('Tienda Test');
    expect(cards[0].querySelector('.q-store-card__category').textContent).toBe('Categoría Test');

    const headerAfter = el.querySelector('.q-featured-stores__header');
    expect(headerAfter).toBe(headerBefore);
  });
});
