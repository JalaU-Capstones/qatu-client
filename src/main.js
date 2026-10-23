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

import { AuthApi } from './models/api/AuthApi.js';
import { Router } from './router/Router.js';
import { authStore } from './store/authStore.js';
import { AuthViewModel } from './viewmodels/components/AuthViewModel.js';
import { AuthView } from './views/components/AuthView.js';
import { CategoriesView } from './views/components/CategoriesView.js';
import { FeaturedProductsView } from './views/components/FeaturedProductsView.js';
import { FeaturedStoresView } from './views/components/FeaturedStoresView.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { HeroView } from './views/components/HeroView.js';
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
  app.className = 'q-app';

  const header = new HeaderView();
  header.mount(app);

  const main = document.createElement('main');
  main.className = 'q-main';
  app.appendChild(main);

  const authApi = new AuthApi();
  const router = new Router();

  header.viewModel.onLoginClick = () => {
    router.navigate('/login');
  };

  header.viewModel.onLogoClick = () => {
    router.navigate('/');
  };

  authStore.subscribe((store) => {
    header.viewModel.setUser(store.getUser());
  });

  let currentViewCleanup = null;
  let activeAuth = null;

  const renderHome = () => {
    if (typeof currentViewCleanup === 'function') {
      currentViewCleanup();
      currentViewCleanup = null;
    }
    main.innerHTML = '';

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

    currentViewCleanup = () => {
      hero.destroy();
      categories.destroy();
      featuredProducts.destroy();
      stores.destroy();
    };
  };

  const renderAuth = (mode = 'register') => {
    if (activeAuth && activeAuth.viewModel) {
      if (activeAuth.viewModel.mode !== mode) {
        activeAuth.viewModel.setMode(mode);
      }
      return;
    }

    if (typeof currentViewCleanup === 'function') {
      currentViewCleanup();
      currentViewCleanup = null;
    }
    main.innerHTML = '';

    const authViewModel = new AuthViewModel({
      initialMode: mode,
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

    const authView = new AuthView(authViewModel);
    authView.mount(main);

    activeAuth = { view: authView, viewModel: authViewModel };

    currentViewCleanup = () => {
      authView.destroy();
      activeAuth = null;
    };
  };

  router.addRoute('/', () => renderHome());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));

  router.start();

  const footer = new FooterView();
  footer.mount(app);
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
