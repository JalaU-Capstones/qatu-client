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
import './views/components/shipping-banner.css';
import './views/components/footer.css';
import './views/components/auth.css';
import './views/pages/catalog.css';
import './views/components/product-card.css';
import './views/components/quantity-selector.css';
import './views/components/recommendation-card.css';
import './views/pages/product-detail.css';
import './views/pages/cart.css';

import { AuthApi } from './models/api/AuthApi.js';
import { Router } from './router/Router.js';
import { authRedirectStore } from './store/authRedirectStore.js';
import { authStore } from './store/authStore.js';
import { cartStore } from './store/cartStore.js';
import { themeStore } from './store/themeStore.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { AuthPageView } from './views/pages/AuthPageView.js';
import { CartView } from './views/pages/CartView.js';
import { CatalogView } from './views/pages/CatalogView.js';
import { HomeView } from './views/pages/HomeView.js';
import { ProductDetailView } from './views/pages/ProductDetailView.js';

const app = document.getElementById('app');

if (app) {
  app.className = 'q-app';
  themeStore.init();

  const authApi = new AuthApi();

  // Hydrate session from localStorage before mounting anything that reads user state.
  // The local cart hydrates itself in the CartStore constructor, so it survives
  // page reloads for anonymous visitors too.
  authStore.loadFromStorage();

  // Persistent shell
  const header = new HeaderView();
  header.viewModel.setUser(authStore.getUser());
  header.viewModel.setCartCount(cartStore.getCount());
  header.mount(app);
  themeStore.subscribe((store) => {
    header.viewModel.setTheme(store.getResolved());
  });
  header.viewModel.setTheme(themeStore.getResolved());
  header.viewModel.onThemeToggleClick = () => themeStore.cycle();

  const mainEl = document.createElement('main');
  mainEl.className = 'q-main';
  app.appendChild(mainEl);

  const footer = new FooterView();
  footer.mount(app);

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
      onAddToCart: onAddToCartHandler,
    });
    currentPageView.mount(mainEl);
  };

  const renderCatalog = () => {
    clearCurrentView();
    currentPageView = new CatalogView(undefined, {
      onAddToCart: onAddToCartHandler,
    });
    currentPageView.mount(mainEl);
  };

  const renderProductDetail = (productId) => {
    clearCurrentView();
    currentPageView = new ProductDetailView({
      productId,
      onBuyNow: () => router.navigate('/cart'),
    });
    currentPageView.mount(mainEl);
  };

  const renderCart = () => {
    clearCurrentView();
    currentPageView = new CartView();
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
      onNavigate: (path) => {
        const returnTo = authRedirectStore.getReturnTo();
        authRedirectStore.clearReturnTo();
        router.navigate(returnTo || path || '/');
      },
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

  /**
   * Called by the product cards on Home/Catalog when the user clicks "Añadir".
   * The current lab is frontend-only: the product snapshot is written straight
   * into the local cart, so no authentication or backend call is required.
   *
   * @param {Object} product Product snapshot (id, name, price, currency, ...).
   * @param {number} [quantity=1]
   * @returns {Promise<{ status: 'added'|'error', item?: Object, error?: Error }>}
   */
  const onAddToCartHandler = (product, quantity = 1) => {
    if (!product) {
      return Promise.resolve({
        status: 'error',
        error: new Error('Producto no disponible'),
      });
    }

    const item = cartStore.addItem(product, quantity);
    return Promise.resolve({ status: 'added', item });
  };

  const router = new Router();
  router.addRoute('/', () => renderHome());
  router.addRoute('/products', () => renderCatalog());
  router.addRoute('/products/:id', (_path, params) => renderProductDetail(params.id));
  router.addRoute('/cart', () => renderCart());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));

  header.viewModel.onLoginClick = () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    router.navigate('/login');
  };
  header.viewModel.onLogoClick = () => router.navigate('/');
  header.viewModel.onCartClick = () => router.navigate('/cart');

  // Wire logout: clear session and redirect to /login
  header.viewModel.onLogoutClick = () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    authStore.clearSession();
    router.navigate('/login');
  };

  // Wire 401 expiry event dispatched by apiFetch on expired JWT
  window.addEventListener('qatu:auth-expired', () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    authStore.clearSession();
    router.navigate('/login');
  });

  authStore.subscribe((store) => {
    header.viewModel.setUser(store.getUser());
    // The local cart is intentionally not scoped per user: logging in or out
    // must not discard the products the shopper already selected.
  });

  cartStore.subscribe((store) => {
    header.viewModel.setCartCount(store.getCount());
  });

  router.start();
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
