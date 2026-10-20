// src/main.js

// 1. Base CSS framework
import 'bulma/css/bulma.css';

// 2. Design tokens (generated from Figma)
import './views/styles/tokens/tokens.css';

// 3. Semantic tokens and theme definitions
import './views/styles/semantic.css';

// 4. Font definitions
import './views/styles/fonts.css';

// 5. Bulma overrides mapped to tokens
import './views/styles/bulma-overrides.css';

// 6. Custom project styles
import './views/styles/main.css';

// 7. Component styles
import './views/components/navbar.css';
import './views/components/header.css';
import './views/components/footer.css';
import './views/components/featured-products.css';

import { FeaturedProductsView } from './views/components/FeaturedProductsView.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';

const app = document.getElementById('app');
if (app) {
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  app.style.minHeight = '100vh';

  const header = new HeaderView();
  header.mount(app);

  const main = document.createElement('main');
  main.className = 'q-main-content';
  main.style.flex = '1';
  app.appendChild(main);

  const featuredProducts = new FeaturedProductsView();
  featuredProducts.viewModel.onAddToCart = () => {
    header.viewModel.setCartCount(header.viewModel.cartCount + 1);
  };
  featuredProducts.mount(main);
  featuredProducts.viewModel.load();

  const footer = new FooterView();
  footer.mount(app);
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
