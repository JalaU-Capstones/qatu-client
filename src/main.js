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
import './views/pages/catalog.css';

import { Router } from './router/router.js';
import { CatalogView } from './views/pages/CatalogView.js';
import { HomeView } from './views/pages/HomeView.js';

const app = document.getElementById('app');

if (app) {
  const router = new Router({
    '/': HomeView,
    '/products': CatalogView,
  });

  router.init(app);
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
