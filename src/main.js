import 'bulma/css/bulma.css';
import './views/styles/tokens/tokens.css';
import './views/styles/semantic.css';
import './views/styles/fonts.css';
import './views/styles/bulma-overrides.css';
import './views/styles/main.css';

import './views/components/header.css';
import './views/components/navbar.css';
import './views/components/hero.css';
import './views/components/categories.css';
import './views/components/featured-products.css';
import './views/components/featured-stores.css';
import './views/components/footer.css';
import './views/components/auth.css';
import './views/pages/catalog.css';

import { AuthApi } from './models/api/AuthApi.js';
import { Router } from './router/Router.js';
import { authStore } from './store/authStore.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { AuthPageView } from './views/pages/AuthPageView.js';
import { CatalogView } from './views/pages/CatalogView.js';
import { HomeView } from './views/pages/HomeView.js';

const app = document.getElementById('app');

if (app) {
  app.className = 'q-app';

  // Persistent shell
  const header = new HeaderView();
  header.mount(app);

  const mainEl = document.createElement('main');
  mainEl.className = 'q-main';
  app.appendChild(mainEl);

  const footer = new FooterView();
  footer.mount(app);

  const authApi = new AuthApi();

  let currentPageView = null;
  let activeAuth = null;

  const clearCurrentView = () => {
    if (currentPageView && typeof currentPageView.destroy === 'function') {
      currentPageView.destroy();
    }
    currentPageView = null;
    activeAuth = null;
    mainEl.innerHTML = '';
  };

  const renderHome = () => {
    clearCurrentView();
    currentPageView = new HomeView({
      onAddToCart: () => {
        header.viewModel.setCartCount(header.viewModel.cartCount + 1);
      },
    });
    currentPageView.mount(mainEl);
  };

  const renderCatalog = () => {
    clearCurrentView();
    currentPageView = new CatalogView();
    currentPageView.mount(mainEl);
  };

  const renderAuth = (mode) => {
    // Preserve sliding animation: if we are already on an auth page,
    // switch mode in place instead of remounting.
    if (activeAuth && activeAuth.mode !== mode) {
      activeAuth.setMode(mode);
      return;
    }
    if (activeAuth && activeAuth.mode === mode) {
      return;
    }

    clearCurrentView();
    const view = new AuthPageView({
      mode,
      authApi,
      authStore,
      onNavigate: (path) => router.navigate(path),
      onModeChange: (newMode) => {
        const targetPath = newMode === 'register' ? '/register' : '/login';
        if (window.location.pathname !== targetPath) {
          router.navigate(targetPath, { replace: true });
        }
      },
    });
    view.mount(mainEl);
    currentPageView = view;
    activeAuth = view;
  };

  const router = new Router();
  router.addRoute('/', () => renderHome());
  router.addRoute('/products', () => renderCatalog());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));

  header.viewModel.onLoginClick = () => router.navigate('/login');
  header.viewModel.onLogoClick = () => router.navigate('/');

  authStore.subscribe((store) => {
    header.viewModel.setUser(store.getUser());
  });

  router.start();
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
