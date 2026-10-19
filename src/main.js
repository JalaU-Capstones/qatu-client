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

import './views/styles/main.css';
import { renderCategoriesSection } from './views/components/CategoriesSection.js';
import { renderFeaturedStoresSection } from './views/components/FeaturedStoresSection.js';

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');

const app = document.querySelector('#app') || document.body;

app.appendChild(renderCategoriesSection());
app.appendChild(renderFeaturedStoresSection());
