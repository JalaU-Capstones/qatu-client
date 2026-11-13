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
import './views/pages/orders.css';
import './views/pages/seller-orders.css';
import './views/pages/profile.css';
import './views/components/product-card.css';
import './views/components/quantity-selector.css';
import './views/components/recommendation-card.css';
import './views/pages/product-detail.css';
import './views/pages/cart.css';
import './views/pages/checkout.css';

import { AuthApi } from './models/api/AuthApi.js';
import { ProfilesApi } from './models/api/ProfilesApi.js';
import { getSellerRouteAccess } from './router/guards.js';
import { Router } from './router/Router.js';
import { AuthBootstrapService } from './services/AuthBootstrapService.js';
import { cartService } from './services/CartService.js';
import { authRedirectStore } from './store/authRedirectStore.js';
import { authStore } from './store/authStore.js';
import { cartStore } from './store/cartStore.js';
import { pendingCartActionStore } from './store/pendingCartActionStore.js';
import { themeStore } from './store/themeStore.js';
import { CatalogViewModel } from './viewmodels/pages/CatalogViewModel.js';
import { ProductDetailViewModel } from './viewmodels/pages/ProductDetailViewModel.js';
import { ProfileViewModel } from './viewmodels/pages/ProfileViewModel.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { AuthCallbackView } from './views/pages/AuthCallbackView.js';
import { AuthPageView } from './views/pages/AuthPageView.js';
import { CartView } from './views/pages/CartView.js';
import { CatalogView } from './views/pages/CatalogView.js';
import { CheckoutView } from './views/pages/CheckoutView.js';
import { HomeView } from './views/pages/HomeView.js';
import { OrderConfirmationView } from './views/pages/OrderConfirmationView.js';
import { OrdersPageView } from './views/pages/OrdersPageView.js';
import { ProductDetailView } from './views/pages/ProductDetailView.js';
import { ProfileView } from './views/pages/ProfileView.js';
import { SellerOrdersPageView } from './views/pages/SellerOrdersPageView.js';

const app = document.getElementById('app');

if (app) {
  app.className = 'q-app';
  themeStore.init();

  const authApi = new AuthApi();
  const profilesApi = new ProfilesApi();

  const buildHeaderUser = (store) => {
    const user = store.getUser();
    if (!user) return null;
    const profile = store.getProfile();
    return profile ? { ...user, ...profile } : user;
  };

  authStore.loadFromStorage();

  const header = new HeaderView();
  header.viewModel.setIsSeller(authStore.isSeller());
  header.viewModel.setUser(buildHeaderUser(authStore));
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

  const bootstrapService = new AuthBootstrapService({ authApi, authStore });
  // Never rejects. Role-gated routes await it: in a new tab the roles only exist once
  // `GET /auth/me` answers, and deciding earlier would bounce a legitimate seller.
  const sessionReady = bootstrapService.bootstrap();

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
      onCheckout: () => router.navigate('/checkout'),
    });
    currentPageView.mount(mainEl);
  };

  const renderCheckout = () => {
    clearCurrentView();
    currentPageView = new CheckoutView({
      onLogin: () => {
        authRedirectStore.setReturnTo('/checkout');
        router.navigate('/login');
      },
      onOrderPlaced: (order) =>
        router.navigate(`/orders/${order.id}/confirmation`, { replace: true }),
    });
    currentPageView.mount(mainEl);
  };

  const renderOrderConfirmation = (orderId) => {
    clearCurrentView();
    currentPageView = new OrderConfirmationView({
      orderId,
      onNavigate: (path) => router.navigate(path),
      onLogin: () => {
        authRedirectStore.setReturnTo(window.location.pathname);
        router.navigate('/login');
      },
    });
    currentPageView.mount(mainEl);
  };

  const renderOrders = () => {
    clearCurrentView();
    currentPageView = new OrdersPageView({
      onNavigate: (path) => router.navigate(path),
    });
    currentPageView.mount(mainEl);
  };

  const renderSellerOrders = async () => {
    clearCurrentView();
    await sessionReady;
    // The user may have navigated elsewhere (or this route resolved twice) while waiting.
    if (currentPageView || router.currentPath !== '/seller/orders') return;

    const access = getSellerRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo('/seller/orders');
      router.navigate('/login', { replace: true });
      return;
    }
    if (access === 'home') {
      router.navigate('/', { replace: true });
      return;
    }

    currentPageView = new SellerOrdersPageView({
      onNavigate: (path) => router.navigate(path),
    });
    currentPageView.mount(mainEl);
  };

  const renderProfile = () => {
    clearCurrentView();
    if (!authStore.isAuthenticated()) {
      authRedirectStore.setReturnTo('/profile');
      router.navigate('/login');
      return;
    }

    const profileViewModel = new ProfileViewModel({
      profilesApi,
      authStore,
      onUnauthorized: () => {
        authRedirectStore.setReturnTo('/profile');
        router.navigate('/login');
      },
    });
    currentPageView = new ProfileView(profileViewModel);
    currentPageView.mount(mainEl);
  };

  const renderAuth = (mode) => {
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
   * Product-card "Añadir" handler: delegates to CartService; guests are
   * redirected to /login and their intent is queued for replay after login.
   *
   * @param {Object} product
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
  router.addRoute('/checkout', () => renderCheckout());
  router.addRoute('/orders/:orderId/confirmation', (_path, params) =>
    renderOrderConfirmation(params.orderId)
  );
  router.addRoute('/orders', () => renderOrders());
  router.addRoute('/seller/orders', () => renderSellerOrders());
  router.addRoute('/profile', () => renderProfile());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));

  router.addRoute('/auth/callback', () => {
    clearCurrentView();
    const view = new AuthCallbackView();
    mainEl.appendChild(view.render());
    currentPageView = view;
  });

  header.viewModel.onLoginClick = () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    router.navigate('/login');
  };
  header.viewModel.onLogoClick = () => router.navigate('/');
  header.viewModel.onCartClick = () => router.navigate('/cart');
  header.viewModel.onOrdersClick = () => router.navigate('/orders');
  header.viewModel.onSellerOrdersClick = () => router.navigate('/seller/orders');
  header.viewModel.onProfileClick = () => router.navigate('/profile');

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
    cartStore.clear();
    pendingCartActionStore.clear();
    router.navigate('/login');
  };

  window.addEventListener('qatu:auth-expired', () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    router.navigate('/login');
  });

  /**
   * Keeps the local cart in sync with the backend for the current session:
   * authenticated sessions replay queued actions and hydrate the cart;
   * guests clear the in-memory mirror (no server cart exists).
   * @param {Object} store authStore snapshot
   */
  const syncCartWithSession = (store) => {
    if (store.isAuthenticated()) {
      void cartService
        .processPending()
        // eslint-disable-next-line no-console
        .catch((err) => console.error('[main] Failed to replay pending cart action:', err))
        .then(() => cartService.loadCart())
        // eslint-disable-next-line no-console
        .catch((err) => console.error('[main] Failed to load user cart:', err));
    } else {
      cartStore.clear();
    }
  };

  authStore.subscribe((store) => {
    header.viewModel.setIsSeller(store.isSeller());
    header.viewModel.setUser(buildHeaderUser(store));
    syncCartWithSession(store);
  });

  syncCartWithSession(authStore);

  cartStore.subscribe((store) => {
    header.viewModel.setCartCount(store.getCount());
  });

  router.start();
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
