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

import { AuthApi } from './models/api/AuthApi.js';
import { CartApi } from './models/api/CartApi.js';
import { Router } from './router/Router.js';
import { CartService } from './services/CartService.js';
import { authRedirectStore } from './store/authRedirectStore.js';
import { authStore } from './store/authStore.js';
import { cartStore } from './store/cartStore.js';
import { pendingCartActionStore } from './store/pendingCartActionStore.js';
import { themeStore } from './store/themeStore.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { AuthPageView } from './views/pages/AuthPageView.js';
import { CatalogView } from './views/pages/CatalogView.js';
import { HomeView } from './views/pages/HomeView.js';

const app = document.getElementById('app');

if (app) {
  app.className = 'q-app';
  themeStore.init();

  const authApi = new AuthApi();
  const cartApi = new CartApi();
  const cartService = new CartService({
    cartApi,
    cartStore,
    authStore,
    pendingCartActionStore,
  });

  // Hydrate session from localStorage before mounting anything that reads user state
  authStore.loadFromStorage();
  cartStore.setUser(authStore.getUser()?.id ?? null);

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

        // Fire-and-forget: process any pending cart add queued before login.
        // Not awaited — we want the user to land on their return route immediately.
        // The cartStore notification will update the header badge ~200ms later.
        cartService.processPending().catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[main] processPending failed:', err?.message || err);
        });

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
   * Called by ProductCardView when the user clicks "Añadir".
   * Returns the CartService result union (added | auth-required | error).
   * Handles the two redirect triggers:
   *   - auth-required: user not logged in at click time → queue + redirect
   *   - SESSION_EXPIRED mid-request: token expired during the API call → queue
   *     the pending defensively (the qatu:auth-expired listener already redirected)
   */
  const onAddToCartHandler = async (productId) => {
    const result = await cartService.addToCart(productId, 1);

    if (result.status === 'auth-required') {
      // CartService already queued pendingCartActionStore internally
      // (skipPendingWrite: false default). Capture return path + redirect.
      authRedirectStore.setReturnTo(window.location.pathname);
      router.navigate('/login');
      return result;
    }

    if (result.status === 'error' && result.error?.code === 'SESSION_EXPIRED') {
      // Rare: user was authenticated at click time but the JWT expired
      // between the auth check and the API response. The qatu:auth-expired
      // listener already fired synchronously (during apiFetch) and did the
      // redirect + setReturnTo. We only need to preserve the intent.
      pendingCartActionStore.set({ productId, quantity: 1 });
    }

    return result;
  };

  const router = new Router();
  router.addRoute('/', () => renderHome());
  router.addRoute('/products', () => renderCatalog());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));

  header.viewModel.onLoginClick = () => {
    authRedirectStore.setReturnTo(window.location.pathname);
    router.navigate('/login');
  };
  header.viewModel.onLogoClick = () => router.navigate('/');

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
    cartStore.setUser(store.getUser()?.id ?? null);
    // cartStore.setUser(null) clears the items + localStorage (per-user scope).
    // On login, it hydrates from localStorage for that user.
  });

  cartStore.subscribe((store) => {
    header.viewModel.setCartCount(store.getCount());
  });

  router.start();
}

// eslint-disable-next-line no-console
console.log('Qatu Marketplace client initialized.');
