import 'bulma/css/bulma.css';
import './views/styles/tokens/tokens.css';
import './views/styles/semantic.css';
import './views/styles/fonts.css';
import './views/styles/bulma-overrides.css';
import './views/styles/main.css';
import './views/components/header.css';
import './views/components/brand-logo.css';
import './views/components/navbar.css';
import './views/components/hero.css';
import './views/components/categories.css';
import './views/components/featured-products.css';
import './views/components/featured-stores.css';
import './views/components/shipping-banner.css';
import './views/components/footer.css';
import './views/components/recommendation-card.css';
import './views/components/auth.css';
import './views/pages/catalog.css';
import './views/pages/orders.css';
import './views/pages/seller-orders.css';
import './views/pages/seller-products.css';
import './views/pages/seller-product-form.css';
import './views/pages/seller-apply.css';
import './views/pages/admin-reports.css';
import './views/pages/admin-seller-applications.css';
import './views/pages/profile.css';
import './views/pages/about.css';
import './views/components/product-card.css';
import './views/components/quantity-selector.css';
import './views/pages/product-detail.css';
import './views/pages/cart.css';
import './views/pages/checkout.css';
import './views/styles/modal.css';
import './views/pages/edit-product-modal.css';
import './views/pages/admin-categories.css';
import './views/pages/categories.css';
import './views/pages/conversations.css';

import { AuthApi } from './models/api/AuthApi.js';
import { CategoriesApi } from './models/api/CategoriesApi.js';
import { ConversationsApi } from './models/api/ConversationsApi.js';
import { ProductsApi } from './models/api/ProductsApi.js';
import { ProfilesApi } from './models/api/ProfilesApi.js';
import { getAdminRouteAccess, getSellerRouteAccess } from './router/guards.js';
import { Router } from './router/Router.js';
import { AuthBootstrapService } from './services/AuthBootstrapService.js';
import { cartService } from './services/CartService.js';
import { authRedirectStore } from './store/authRedirectStore.js';
import { authStore } from './store/authStore.js';
import { cartStore } from './store/cartStore.js';
import { pendingCartActionStore } from './store/pendingCartActionStore.js';
import { themeStore } from './store/themeStore.js';
import { AdminCategoriesViewModel } from './viewmodels/pages/AdminCategoriesViewModel.js';
import { CatalogViewModel } from './viewmodels/pages/CatalogViewModel.js';
import { ProductDetailViewModel } from './viewmodels/pages/ProductDetailViewModel.js';
import { ProfileViewModel } from './viewmodels/pages/ProfileViewModel.js';
import { SellerProductFormViewModel } from './viewmodels/pages/SellerProductFormViewModel.js';
import { SellerProductsViewModel } from './viewmodels/pages/SellerProductsViewModel.js';
import { DeleteConfirmModal } from './views/components/DeleteConfirmModal.js';
import { FooterView } from './views/components/FooterView.js';
import { HeaderView } from './views/components/HeaderView.js';
import { AboutView } from './views/pages/AboutView.js';
import { AdminCategoriesPageView } from './views/pages/AdminCategoriesPageView.js';
import { AdminReportsPageView } from './views/pages/AdminReportsPageView.js';
import { AdminSellerApplicationsPageView } from './views/pages/AdminSellerApplicationsPageView.js';
import { AuthCallbackView } from './views/pages/AuthCallbackView.js';
import { AuthPageView } from './views/pages/AuthPageView.js';
import { CartView } from './views/pages/CartView.js';
import { CatalogView } from './views/pages/CatalogView.js';
import { CategoriesPageView } from './views/pages/CategoriesView.js';
import { CheckoutView } from './views/pages/CheckoutView.js';
import { ConversationsPageView } from './views/pages/ConversationsPageView.js';
import { EditProductView } from './views/pages/EditProductView.js';
import { HomeView } from './views/pages/HomeView.js';
import { OrderConfirmationView } from './views/pages/OrderConfirmationView.js';
import { OrdersPageView } from './views/pages/OrdersPageView.js';
import { ProductDetailView } from './views/pages/ProductDetailView.js';
import { ProfileView } from './views/pages/ProfileView.js';
import { SellerApplyPageView } from './views/pages/SellerApplyPageView.js';
import { SellerOrdersPageView } from './views/pages/SellerOrdersPageView.js';
import { SellerProductFormView } from './views/pages/SellerProductFormView.js';
import { SellerProductsPageView } from './views/pages/SellerProductsPageView.js';

const app = document.getElementById('app');

if (app) {
  app.className = 'q-app';
  themeStore.init();

  const authApi = new AuthApi();
  const profilesApi = new ProfilesApi();
  const conversationsApi = new ConversationsApi();

  const buildHeaderUser = (store) => {
    const user = store.getUser();
    if (!user) return null;
    const profile = store.getProfile();
    return profile ? { ...user, ...profile } : user;
  };

  authStore.loadFromStorage();

  const header = new HeaderView();
  header.viewModel.setIsSeller(authStore.isSeller());
  header.viewModel.setIsAdmin(authStore.isAdmin());
  header.viewModel.setUser(buildHeaderUser(authStore));
  header.viewModel.setCartCount(cartStore.getCount());
  header.mount(app);
  themeStore.subscribe((store) => {
    header.viewModel.setTheme(store.getResolved());
  });
  header.viewModel.setTheme(themeStore.getResolved());
  header.viewModel.onThemeToggleClick = () => themeStore.cycle();

  let categories = [];
  const categoriesApi = new CategoriesApi();
  const productsApi = new ProductsApi();
  const categoriesReady = categoriesApi
    .getCategories()
    .then((res) => {
      categories = res.data || [];
      header.viewModel.setCategories(categories);
      return categories;
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[main] failed to fetch categories for header:', err?.message || err);
      return [];
    });

  const mainEl = document.createElement('main');
  mainEl.className = 'q-main';
  app.appendChild(mainEl);

  const footer = new FooterView();
  footer.mount(app);

  const bootstrapService = new AuthBootstrapService({ authApi, authStore });
  const sessionReady = bootstrapService.bootstrap();

  let currentPageView = null;
  let activeAuth = null;

  const clearCurrentView = (route = 'default') => {
    document.body.dataset.route = route;
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
    clearCurrentView('catalog');
    const catalogViewModel = new CatalogViewModel({
      onFiltersChange: (query) => window.history.pushState({}, '', `/products${query}`),
    });
    catalogViewModel.setFiltersFromQuery(window.location.search);
    currentPageView = new CatalogView(catalogViewModel, {
      onAddToCart: onAddToCartHandler,
    });
    currentPageView.mount(mainEl);
  };

  const renderCategories = () => {
    clearCurrentView('categories');
    currentPageView = new CategoriesPageView();
    currentPageView.mount(mainEl);
  };

  const renderAbout = () => {
    clearCurrentView('about');
    currentPageView = new AboutView();
    currentPageView.mount(mainEl);
  };

  const renderProductDetail = (productSlug) => {
    clearCurrentView();
    const productDetailViewModel = new ProductDetailViewModel({
      cartService,
      authStore,
      authRedirectStore,
      router,
    });
    currentPageView = new ProductDetailView({
      viewModel: productDetailViewModel,
      productSlug,
      onBuyNow: () => router.navigate('/cart'),
      onEditProduct: (productId) => router.navigate(`/seller/products/${productId}/edit`),
      onDeleteProduct: (productId) => {
        const product = productDetailViewModel.product;
        const modal = new DeleteConfirmModal({
          productId,
          productName: product?.name || 'este producto',
          onConfirm: () => productDetailViewModel.deleteProduct(),
        });
        void modal.open().then(({ confirmed }) => {
          if (confirmed) router.navigate('/seller/products');
        });
      },
      onAuthRequired: () => {
        authRedirectStore.setReturnTo(window.location.pathname);
        router.navigate('/login');
      },
      onAddToCart: onAddToCartHandler,
      onNavigate: (path) => router.navigate(path),
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
        router.navigate(`/order-confirmation/${encodeURIComponent(order.order_number)}`, {
          replace: true,
        }),
    });
    currentPageView.mount(mainEl);
  };

  const renderOrderConfirmation = (orderNumber) => {
    clearCurrentView();
    currentPageView = new OrderConfirmationView({
      orderNumber,
      onNavigate: (path) => router.navigate(path),
      onLogin: () => {
        authRedirectStore.setReturnTo(window.location.pathname);
        router.navigate('/login');
      },
    });
    currentPageView.mount(mainEl);
  };

  const renderOrders = (orderNumber = null) => {
    clearCurrentView();
    currentPageView = new OrdersPageView({
      onNavigate: (path) => router.navigate(path),
      orderNumber,
    });
    currentPageView.mount(mainEl);
  };

  const renderSellerOrders = async () => {
    clearCurrentView('seller');
    await sessionReady;
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

  const renderSellerProducts = async () => {
    clearCurrentView('seller');
    await sessionReady;
    if (currentPageView || router.currentPath !== '/seller/products') return;

    const access = getSellerRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo('/seller/products');
      router.navigate('/login', { replace: true });
      return;
    }
    if (access === 'home') {
      router.navigate('/', { replace: true });
      return;
    }

    const sellerProductsViewModel = new SellerProductsViewModel();
    currentPageView = new SellerProductsPageView({
      viewModel: sellerProductsViewModel,
      onNavigate: (path) => router.navigate(path),
      onCreate: () => router.navigate('/seller/products/new'),
      onViewProduct: (slug) => router.navigate(`/products/${slug}`),
      onEditProduct: (productId) => router.navigate(`/seller/products/${productId}/edit`),
      onDeleteProduct: (productId) => {
        const product = sellerProductsViewModel.products.find((p) => p.id === productId);
        const modal = new DeleteConfirmModal({
          productId,
          productName: product?.name || 'este producto',
          onConfirm: () => sellerProductsViewModel.deleteProduct(productId),
        });
        void modal.open();
      },
    });
    currentPageView.mount(mainEl);
  };

  const renderSellerProductEdit = async (productId) => {
    clearCurrentView('seller');
    await sessionReady;
    const routePath = `/seller/products/${productId}/edit`;
    if (currentPageView || router.currentPath !== routePath) return;

    const access = getSellerRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo(routePath);
      router.navigate('/login', { replace: true });
      return;
    }
    if (access === 'home') {
      router.navigate('/', { replace: true });
      return;
    }
    if (categories.length === 0) {
      await categoriesReady;
      if (router.currentPath !== routePath) return;
    }

    const view = new EditProductView({
      productId,
      productsApi,
      categoriesApi,
      onNavigate: (path) => router.navigate(path),
      onDeleteProduct: (product) => {
        const modal = new DeleteConfirmModal({
          productId: product.id,
          productName: product.name,
          onConfirm: async () => {
            await productsApi.deleteProduct(product.id);
            return { status: 'success' };
          },
        });
        void modal.open().then(({ confirmed }) => {
          if (confirmed) router.navigate('/seller/products');
        });
      },
    });
    view.mount(mainEl);
    currentPageView = view;
  };

  const renderSellerProductNew = async () => {
    clearCurrentView('seller');
    await sessionReady;
    if (currentPageView || router.currentPath !== '/seller/products/new') return;

    const access = getSellerRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo('/seller/products/new');
      router.navigate('/login', { replace: true });
      return;
    }
    if (access === 'home') {
      router.navigate('/', { replace: true });
      return;
    }

    if (categories.length === 0) {
      await categoriesReady;
    }

    const viewModel = new SellerProductFormViewModel({
      productsApi,
      categories,
    });
    const view = new SellerProductFormView({
      viewModel,
      categories,
      onNavigate: (path) => router.navigate(path),
    });
    view.mount(mainEl);
    currentPageView = view;
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

  const renderConversations = async () => {
    clearCurrentView();
    await sessionReady;
    if (currentPageView || router.currentPath !== '/conversations') return;

    if (!authStore.isAuthenticated()) {
      authRedirectStore.setReturnTo(window.location.pathname + window.location.search);
      router.navigate('/login', { replace: true });
      return;
    }

    currentPageView = new ConversationsPageView({
      conversationsApi,
      profilesApi,
      productsApi,
      authStore,
      onNavigate: (path) => router.navigate(path),
    });
    currentPageView.mount(mainEl);
  };

  const renderAuth = (mode) => {
    document.body.dataset.route = 'auth';
    // ADR-012 / Discovery D1: authenticated users must not reach the auth
    // form. `loadFromStorage()` is synchronous (runs before router.start()),
    // so `isAuthenticated()` is reliable here — no race condition.
    if (authStore.isAuthenticated()) {
      router.navigate('/', { replace: true });
      return;
    }

    if (activeAuth && activeAuth.mode !== mode) {
      activeAuth.setMode(mode);
      return;
    }
    if (activeAuth && activeAuth.mode === mode) {
      return;
    }

    clearCurrentView('auth');
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

  const renderSellerApply = async () => {
    clearCurrentView();
    await sessionReady;
    if (currentPageView || !['/seller/apply', '/apply-seller'].includes(router.currentPath)) return;

    if (!authStore.isAuthenticated()) {
      authRedirectStore.setReturnTo(router.currentPath);
      router.navigate('/login', { replace: true });
      return;
    }

    currentPageView = new SellerApplyPageView({
      onNavigate: (path) => router.navigate(path),
    });
    currentPageView.mount(mainEl);
  };

  const renderAdminReports = async () => {
    clearCurrentView();
    await sessionReady;
    if (currentPageView || !['/admin/reports', '/reports'].includes(router.currentPath)) return;

    const access = getAdminRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo(router.currentPath);
      router.navigate('/login', { replace: true });
      return;
    }

    currentPageView = new AdminReportsPageView({
      onNavigate: (path) => router.navigate(path),
    });

    if (access === 'forbidden') {
      currentPageView.render();
      mainEl.appendChild(currentPageView.element);
      currentPageView._renderForbidden();
      return;
    }

    currentPageView.mount(mainEl);
  };

  const renderAdminSellerApplications = async () => {
    clearCurrentView();
    await sessionReady;
    if (currentPageView || router.currentPath !== '/admin/seller-applications') return;

    const access = getAdminRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo('/admin/seller-applications');
      router.navigate('/login', { replace: true });
      return;
    }

    currentPageView = new AdminSellerApplicationsPageView({
      onNavigate: (path) => router.navigate(path),
    });

    if (access === 'forbidden') {
      currentPageView.render();
      mainEl.appendChild(currentPageView.element);
      currentPageView._renderForbidden();
      return;
    }

    currentPageView.mount(mainEl);
  };

  const renderAdminCategories = async () => {
    clearCurrentView();
    await sessionReady;
    if (currentPageView || router.currentPath !== '/admin/categories') return;

    const access = getAdminRouteAccess(authStore);
    if (access === 'login') {
      authRedirectStore.setReturnTo('/admin/categories');
      router.navigate('/login', { replace: true });
      return;
    }

    const viewModel = new AdminCategoriesViewModel({
      onCategoriesChanged: (updated) => {
        categories = updated;
        header.viewModel.setCategories(updated);
      },
    });

    currentPageView = new AdminCategoriesPageView({
      viewModel,
      onNavigate: (path) => router.navigate(path),
    });

    if (access === 'forbidden') {
      currentPageView.render();
      mainEl.appendChild(currentPageView.element);
      currentPageView._renderForbidden();
      return;
    }

    currentPageView.mount(mainEl);
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
  router.addRoute('/about', () => renderAbout());
  router.addRoute('/products', () => renderCatalog());
  router.addRoute('/categories', () => renderCategories());
  router.addRoute('/products/:slug', (_path, params) => renderProductDetail(params.slug));
  router.addRoute('/cart', () => renderCart());
  router.addRoute('/checkout', () => renderCheckout());
  router.addRoute('/order-confirmation/:orderNumber', (_path, params) =>
    renderOrderConfirmation(params.orderNumber)
  );
  router.addRoute('/orders', () => renderOrders());
  router.addRoute('/orders/:orderNumber', (_path, params) => renderOrders(params.orderNumber));
  router.addRoute('/seller/orders', () => renderSellerOrders());
  router.addRoute('/seller/products', () => renderSellerProducts());
  router.addRoute('/seller/products/new', () => renderSellerProductNew());
  router.addRoute('/seller/products/:productId/edit', (_path, params) =>
    renderSellerProductEdit(params.productId)
  );
  router.addRoute('/profile', () => renderProfile());
  router.addRoute('/conversations', () => renderConversations());
  router.addRoute('/register', () => renderAuth('register'));
  router.addRoute('/login', () => renderAuth('login'));
  router.addRoute('/seller/apply', () => renderSellerApply());
  router.addRoute('/apply-seller', () => renderSellerApply());
  router.addRoute('/admin/reports', () => renderAdminReports());
  router.addRoute('/reports', () => renderAdminReports());
  router.addRoute('/admin/seller-applications', () => renderAdminSellerApplications());
  router.addRoute('/admin/categories', () => renderAdminCategories());

  router.addRoute('/auth/callback', () => {
    clearCurrentView();
    const view = new AuthCallbackView();
    mainEl.appendChild(view.render());
    currentPageView = view;
  });

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
  header.viewModel.onConversations = () => router.navigate('/conversations');
  header.viewModel.onSellerOrdersClick = () => router.navigate('/seller/orders');
  header.viewModel.onSellerProductsClick = () => router.navigate('/seller/products');
  header.viewModel.onProfileClick = () => router.navigate('/profile');
  header.viewModel.onSearch = (term) => router.navigate('/products?q=' + encodeURIComponent(term));
  header.viewModel.onCategoryClick = (categoryId) =>
    router.navigate('/products?category=' + encodeURIComponent(categoryId));
  header.viewModel.onSellerApplyClick = () => router.navigate('/seller/apply');
  header.viewModel.onAdminReportsClick = () => router.navigate('/admin/reports');
  header.viewModel.onAdminCategoriesClick = () => router.navigate('/admin/categories');
  header.viewModel.onAdminSellerApplicationsClick = () =>
    router.navigate('/admin/seller-applications');

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
    header.viewModel.setIsAdmin(store.isAdmin());
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
