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
import { AuthBootstrapService } from './services/AuthBootstrapService.js';
import { cartService } from './services/CartService.js';
import { authRedirectStore } from './store/authRedirectStore.js';
import { authStore } from './store/authStore.js';
import { cartStore } from './store/cartStore.js';
import { themeStore } from './store/themeStore.js';
import { CatalogViewModel } from './viewmodels/pages/CatalogViewModel.js';
import { ProductDetailViewModel } from './viewmodels/pages/ProductDetailViewModel.js';
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

  // Persistent shell — mount BEFORE async boot so the page is interactive
  // while /me resolves. The header renders from `authStore.getUser()` (which
  // was just hydrated from cache).
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

  // Boot step 2: async /me hydration. Fire-and-forget — must never block
  // the UI. On success, updates authStore (and thus the header via the
  // subscription below). On 401, clears cache. On network/5xx, keeps cache.
  const bootstrapService = new AuthBootstrapService({ authApi, authStore });
  void bootstrapService.bootstrap();

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
      onSearch: (term) => {
        const query = term.trim();
        router.navigate(query ? `/products?q=${encodeURIComponent(query)}` : '/products');
      },
    });
    currentPageView.mount(mainEl);
  };

  const renderCatalog = () => {
    clearCurrentView();
    // Each applied filter gets a history entry; Back re-renders the catalog from the URL.
    const catalogViewModel = new CatalogViewModel({
      onFiltersChange: (query) => window.history.pushState({}, '', `/products${query}`),
    });
    catalogViewModel.setFiltersFromQuery(window.location.search);
    currentPageView = new CatalogView(catalogViewModel, {
      onAddToCart: onAddToCartHandler,
    });
    currentPageView.mount(mainEl);
  };

  const renderProductDetail = (productSlug) => {
    clearCurrentView();
    const productDetailViewModel = new ProductDetailViewModel({
      cartService,
    });
    currentPageView = new ProductDetailView({
      viewModel: productDetailViewModel,
      productSlug,
      onBuyNow: () => router.navigate('/cart'),
      onAuthRequired: () => {
        authRedirectStore.setReturnTo(window.location.pathname);
        router.navigate('/login');
      },
    });
    currentPageView.mount(mainEl);
  };

  const renderCart = () => {
    clearCurrentView();
    currentPageView = new CartView({
      onLogin: () => {
        authRedirectStore.setReturnTo(window.location.pathname);
        router.navigate('/login');
      },
    });
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
   * Delegates to `CartService`: authenticated users are synced with the
   * backend (POST /v1/cart/items) and guests get a prompt to log in — the
   * intent is queued in `pendingCartActionStore` and replayed after login.
   *
   * @param {Object} product Product snapshot (id, name, price, currency, ...).
   * @param {number} [quantity=1]
   * @returns {Promise<{ status: 'added'|'auth-required'|'error', item?: Object, error?: Error }>}
   */
  const onAddToCartHandler = async (product, quantity = 1) => {
    if (!product) {
      return {
        status: 'error',
        error: new Error('Producto no disponible'),
      };
    }

    const result = await cartService.addToCart(product.id, quantity);

    if (result.status === 'auth-required') {
      authRedirectStore.setReturnTo(window.location.pathname);
      router.navigate('/login');
    }

    return result;
  };

  const router = new Router();
  router.addRoute('/', () => renderHome());
  router.addRoute('/products', () => renderCatalog());
  router.addRoute('/products/:slug', (_path, params) => renderProductDetail(params.slug));
  router.addRoute('/cart', () => renderCart());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));

  header.viewModel.onLoginClick = () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    router.navigate('/login');
  };
  header.viewModel.onLogoClick = () => router.navigate('/');
  header.viewModel.onCartClick = () => router.navigate('/cart');

  // Logout: best-effort server invalidation, THEN local clear, THEN navigate.
  // The API call is wrapped in try/catch so a backend hiccup does not leave
  // the user stuck logged in locally.
  header.viewModel.onLogoutClick = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[main] logout API call failed; clearing local state anyway:',
        err?.message || err
      );
    }
    authStore.clearSession();
    router.navigate('/login');
  };

  // 401 on a non-auth request: client.js#_handleHardAuthFailure already
  // cleared the store and dispatched this event. Here we only redirect +
  // preserve the return path. No clearSession (avoids double-clear).
  window.addEventListener('qatu:auth-expired', () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    router.navigate('/login');
  });

  /**
   * Keeps the local cart in sync with the backend for the current session:
   *  - authenticated → replay any queued guest action, then hydrate the cart
   *    from GET /v1/cart (badge + cart page depend on this).
   *  - guest → the API cart does not exist; clear the local mirror so the
   *    UI never shows products that are not in the server cart.
   * @param {Object} store authStore snapshot
   */
  const syncCartWithSession = (store) => {
    if (store.isAuthenticated()) {
      void cartService
        .processPending()
        .catch((err) => console.error('[main] Failed to replay pending cart action:', err))
        .then(() => cartService.loadCart())
        .catch((err) => console.error('[main] Failed to load user cart:', err));
    } else {
      cartStore.clear();
    }
  };

  authStore.subscribe((store) => {
    header.viewModel.setUser(store.getUser());
    syncCartWithSession(store);
  });

  // Boot: the session may already be hydrated from cache (loadFromStorage
  // fired no listeners because the header is mounted before this point).
  syncCartWithSession(authStore);

  cartStore.subscribe((store) => {
    header.viewModel.setCartCount(store.getCount());
  });

  router.start();
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
