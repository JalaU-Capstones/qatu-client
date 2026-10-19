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
import './views/styles/main.css';
import './views/components/navbar.css';
import './views/components/header.css';
import './views/components/footer.css';
import { renderCategoriesSection } from './views/components/CategoriesSection.js';
import { renderFeaturedStoresSection } from './views/components/FeaturedStoresSection.js';

import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';

const categoriesData = [
  { name: 'Artesanías', productCount: 45 },
  { name: 'Moda', productCount: 120 },
  { name: 'Hogar', productCount: 85 },
  { name: 'Alimentos', productCount: 32 },
  { name: 'Tecnología', productCount: 14 },
  { name: 'Belleza', productCount: 50 },
];

const storesData = [
  { name: 'Artesanías Andinas', category: 'Artesanías', rating: 4.8, reviewCount: 124 },
  { name: 'Café Orgánico Local', category: 'Alimentos', rating: 4.9, reviewCount: 98 },
  { name: 'Moda Sostenible', category: 'Moda', rating: 4.7, reviewCount: 56 },
];

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

  main.appendChild(renderCategoriesSection(categoriesData));
  main.appendChild(renderFeaturedStoresSection(storesData));

  app.appendChild(main);

  const footer = new FooterView();
  footer.mount(app);
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');

app.appendChild(renderCategoriesSection());
app.appendChild(renderFeaturedStoresSection());
