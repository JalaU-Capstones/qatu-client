// Styles (order matters — CSS cascade is load-order-sensitive)
import 'bulma/css/bulma.css';
import './views/styles/tokens/tokens.css';
import './views/styles/semantic.css';
import './views/styles/fonts.css';
import './views/styles/bulma-overrides.css';
import './views/styles/main.css';

// Component styles (load order follows page top-to-bottom composition)
import './views/components/header.css';
import './views/components/navbar.css';
import './views/components/hero.css';
import './views/components/categories.css';
import './views/components/featured-products.css';
import './views/components/featured-stores.css';
import './views/components/footer.css';

// Components
import { CategoriesView } from './views/components/CategoriesView.js';
import { FeaturedProductsView } from './views/components/FeaturedProductsView.js';
import { FeaturedStoresView } from './views/components/FeaturedStoresView.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { HeroView } from './views/components/HeroView.js';

const app = document.getElementById('app');

if (app) {
  app.className = 'q-app';

  const header = new HeaderView();
  header.mount(app);

  const main = document.createElement('main');
  main.className = 'q-main';

  const hero = new HeroView();
  hero.mount(main);

  const categories = new CategoriesView();
  categories.mount(main);

  const featuredProducts = new FeaturedProductsView();
  // Wire the "Add to cart" action to update the header badge
  featuredProducts.viewModel.onAddToCart = () => {
    header.viewModel.setCartCount(header.viewModel.cartCount + 1);
  };
  featuredProducts.mount(main);
  featuredProducts.viewModel.load();

  const stores = new FeaturedStoresView();
  stores.mount(main);

  app.appendChild(main);

  const footer = new FooterView();
  footer.mount(app);
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
