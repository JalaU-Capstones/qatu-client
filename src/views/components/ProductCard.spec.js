import { ProductCard } from './ProductCard.js';

describe('ProductCard', () => {
  const product = {
    id: 'product-1',
    slug: 'woven-bag',
    name: 'Woven bag',
    price: 42.5,
    currency: 'USD',
    stock: 5,
    average_rating: 4.5,
    ratings_count: 12,
    category: { name: 'Accessories' },
    images: [{ url: 'https://example.test/bag.jpg' }],
  };

  it('renders title, formatted price, category, and rating', () => {
    const card = new ProductCard({ product }).render();

    expect(card.querySelector('h3').textContent).toBe('Woven bag');
    expect(card.textContent).toContain('US$ 42.50');
    expect(card.textContent).toContain('Accessories');
    expect(card.querySelector('.product-card__rating').textContent).toContain('4.5');
    expect(card.querySelector('.product-card__rating').textContent).toContain('12');
  });

  it('uses the default Bolivian currency when no currency is supplied', () => {
    const card = new ProductCard({ product: { name: 'Bag', price: 2 } }).render();

    expect(card.querySelector('.product-card__price').textContent).toBe('Bs 2.00');
  });

  it('hides the rating block when there is no average rating', () => {
    const card = new ProductCard({ product: { ...product, average_rating: undefined } }).render();

    expect(card.querySelector('.product-card__rating')).toBeNull();
  });

  it('uses the SVG placeholder when the product has no images', () => {
    const card = new ProductCard({ product: { ...product, images: [] } }).render();
    const image = card.querySelector('img');

    expect(image.src).toContain('product-placeholder.svg');
    expect(image.alt).toBe('Woven bag');
  });

  it('uses a generic alt label when the product name is empty', () => {
    const card = new ProductCard({ product: { images: [] } }).render();

    expect(card.querySelector('img').alt).toBe('Imagen del producto');
  });

  it('uses the seller thumbnail placeholder class for seller cards', () => {
    const card = new ProductCard({
      product: { ...product, images: [] },
      variant: 'seller',
    }).render();

    expect(card.querySelector('.q-seller-products__thumb-wrap')).not.toBeNull();
    expect(card.querySelector('.q-seller-products__thumb-placeholder-img')).not.toBeNull();
  });

  it('shows the out-of-stock badge and disables the add button', () => {
    const card = new ProductCard({ product: { ...product, stock: 0 } }).render();

    expect(card.textContent).toContain('Agotado');
    expect(card.querySelector('button[aria-label^="Añadir"]').disabled).toBe(true);
  });

  it('shows edit and delete controls only for the seller variant', () => {
    const seller = new ProductCard({ product, variant: 'seller' }).render();
    const regular = new ProductCard({ product }).render();

    expect(seller.textContent).toContain('Editar');
    expect(seller.textContent).toContain('Eliminar');
    expect(regular.textContent).not.toContain('Editar');
    expect(regular.textContent).not.toContain('Eliminar');
  });

  it('disables the add button while awaiting and re-enables it after rejection', async () => {
    let rejectAdd;
    const card = new ProductCard({
      product,
      onAddToCart: () =>
        new Promise((resolve, reject) => {
          rejectAdd = reject;
        }),
    }).render();
    const button = card.querySelector('button[aria-label^="Añadir"]');

    button.click();
    expect(button.disabled).toBe(true);
    expect(button.classList.contains('is-loading')).toBe(true);
    rejectAdd(new Error('Add failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(button.disabled).toBe(false);
    expect(button.classList.contains('is-loading')).toBe(false);
  });

  it('calls onView with the product when the linked title is clicked', () => {
    const onView = jasmine.createSpy('onView');
    const card = new ProductCard({ product, onView }).render();
    const link = card.querySelector('.product-card__title a');

    expect(link.getAttribute('href')).toBe('/products/woven-bag');
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    link.click();
    expect(onView).toHaveBeenCalledOnceWith(product);
  });
});
