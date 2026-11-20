/* global process, console, window, document, setTimeout */
/**
 * Visual matrix E2E — routes × 2 themes × 3 viewports.
 *
 * For each combination:
 *   - Screenshot to /tmp/qatu-matrix/{route}-{theme}-{viewport}.png
 *   - Validate: no PAGEERROR, no console.error, no horizontal overflow,
 *     key elements present, no visible alt-text leak in product cards.
 *
 * Usage:
 *   pnpm dev &              # in another terminal
 *   node scripts/visual-matrix.mjs
 *
 * Environment:
 *   MATRIX_BASE_URL          Target base URL (default: http://localhost:5173)
 *   MATRIX_SKIP_AUTH_ROUTES  Set to "1" to skip routes that require authentication
 *   MATRIX_ROUTES            Comma-separated route names to run (default: all),
 *                            e.g. MATRIX_ROUTES=seller-orders,orders
 *
 * Requires: puppeteer (already a devDependency).
 */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.MATRIX_BASE_URL || 'http://localhost:5173';
const SKIP_AUTH_ROUTES = process.env.MATRIX_SKIP_AUTH_ROUTES === '1';
const BASE_LABEL = process.env.MATRIX_BASE_URL ? 'containerized' : 'local-host';

console.log(`Running visual matrix against ${BASE} (${BASE_LABEL})`);
if (SKIP_AUTH_ROUTES) console.log('MATRIX_SKIP_AUTH_ROUTES=1: skipping authenticated routes');

const OUT_DIR = '/tmp/qatu-matrix';
mkdirSync(OUT_DIR, { recursive: true });

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'catalog', path: '/products' },
  { name: 'product-detail', path: '/products/stainless-steel-kitchen-knife-set' },
  { name: 'cart', path: '/cart' },
  { name: 'search', path: '/products?q=the' },
  { name: 'orders', path: '/orders', authenticated: true },
  { name: 'profile', path: '/profile', authenticated: true },
  // Seller dashboard: needs the seller role (the route guard redirects everyone else).
  { name: 'seller-orders', path: '/seller/orders', authenticated: true, roles: ['seller'] },
  {
    name: 'seller-products',
    path: '/seller/products',
    authenticated: true,
    roles: ['seller'],
  },
  {
    name: 'seller-product-new',
    path: '/seller/products/new',
    authenticated: true,
    roles: ['seller'],
  },
  { name: 'admin-reports', path: '/admin/reports', authenticated: true, roles: ['admin'] },
];

const ADMIN_REPORTS = {
  sales: {
    currency: 'BOB',
    total_revenue: 184320,
    total_orders: 128,
    revenue_by_currency: [{ currency: 'BOB', revenue: 184320, order_count: 128 }],
    period_breakdown: [
      { period: '2026-06', revenue: 12000, order_count: 10 },
      { period: '2026-07', revenue: 18000, order_count: 14 },
      { period: '2026-08', revenue: 22000, order_count: 16 },
      { period: '2026-09', revenue: 26000, order_count: 20 },
      { period: '2026-10', revenue: 31000, order_count: 24 },
      { period: '2026-11', revenue: 34000, order_count: 28 },
    ],
    top_products: [{ product_id: 'p1', title: 'Manta de alpaca', revenue: 4200, units_sold: 18 }],
    top_sellers: [{ seller_id: 's1', display_name: 'Taller Illimani', revenue: 9000 }],
  },
  users: {
    total_users: 40,
    new_registrations: 6,
    buyer_count: 40,
    seller_count: 8,
    active_buyers: 12,
    active_sellers: 5,
    pending_seller_applications: 2,
  },
  products: {
    total_products: 24,
    published_products: 16,
    draft_products: 5,
    unpublished_products: 2,
    archived_products: 1,
    new_listings: 3,
    top_selling_products: [{ product_id: 'p1', title: 'Manta de alpaca', units_sold: 18 }],
    top_categories: [{ category_id: 'c1', name: 'Textiles', product_count: 9 }],
    top_rated_products: [],
  },
};

function adminReportBody(url) {
  const meta = { timestamp: '2026-11-18T12:00:00.000Z' };
  if (url.includes('/admin/reports/users')) return { data: ADMIN_REPORTS.users, meta };
  if (url.includes('/admin/reports/products')) return { data: ADMIN_REPORTS.products, meta };
  return { data: ADMIN_REPORTS.sales, meta };
}

/** Orders returned for `GET /v1/orders?view=seller` (long names exercise the mobile layout). */
const SELLER_SAMPLE_ORDERS = [
  {
    id: 'b1111111-1111-4111-8111-111111111111',
    order_number: 'ORD-00100001',
    buyer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    status: 'pending',
    currency: 'USD',
    created_at: '2026-10-14T11:00:00.000Z',
    items: [{ product_name: 'Poncho de alpaca tejido a mano', quantity: 2, subtotal: 120 }],
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    order_number: 'ORD-00100002',
    buyer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    status: 'confirmed',
    currency: 'USD',
    created_at: '2026-10-13T09:30:00.000Z',
    items: [
      { product_name: 'Manta andina', quantity: 1, subtotal: 45.5 },
      { product_name: 'Chullo de lana', quantity: 3, subtotal: 30 },
    ],
  },
  {
    id: 'b3333333-3333-4333-8333-333333333333',
    order_number: 'ORD-00100003',
    buyer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    status: 'delivered',
    currency: 'USD',
    created_at: '2026-10-10T16:45:00.000Z',
    items: [{ product_name: 'Cuchillos de cocina de acero inoxidable', quantity: 1, subtotal: 79 }],
  },
];

/** Categories for `GET /v1/categories` (header dropdown + wizard step 1). */
const SAMPLE_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electrónica', slug: 'electronics' },
  { id: 'cat-clothing', name: 'Ropa y Moda', slug: 'clothing' },
  { id: 'cat-home', name: 'Hogar y Jardín', slug: 'home-and-garden' },
  { id: 'cat-sports', name: 'Deportes', slug: 'sports' },
  { id: 'cat-books', name: 'Libros', slug: 'books' },
];

/** Products returned for `GET /v1/seller/products`. */
const SAMPLE_SELLER_PRODUCTS = [
  {
    id: 'p-draft-with-img',
    seller_id: 'seller-1',
    category_id: 'cat-electronics',
    name: 'Borrador',
    slug: 'borrador',
    description: 'Producto listo para publicar.',
    price: 29.99,
    currency: 'USD',
    stock: 10,
    attributes: { color: 'azul' },
    primary_image_path: 'http://localhost:8080/product-images/p-draft-with-img/thumb.webp',
    state: 'draft',
    average_rating: 0,
    ratings_count: 0,
    published_at: null,
    created_at: '2026-11-14T12:00:00.000Z',
    updated_at: '2026-11-14T12:00:00.000Z',
  },
  {
    id: 'p-draft-no-img',
    seller_id: 'seller-1',
    category_id: 'cat-books',
    name: 'Sin imagen',
    slug: 'sin-imagen',
    description: 'Aún sin imagen para publicar.',
    price: 15.5,
    currency: 'USD',
    stock: 5,
    primary_image_path: null,
    state: 'draft',
    average_rating: 0,
    ratings_count: 0,
    published_at: null,
    created_at: '2026-11-14T11:00:00.000Z',
    updated_at: '2026-11-14T11:00:00.000Z',
  },
  {
    id: 'p-published',
    seller_id: 'seller-1',
    category_id: 'cat-home',
    name: 'Publicado',
    slug: 'publicado',
    description: 'Visible en la tienda.',
    price: 99.99,
    currency: 'USD',
    stock: 3,
    primary_image_path: 'http://localhost:8080/product-images/p-published/thumb.webp',
    state: 'published',
    average_rating: 4.5,
    ratings_count: 12,
    published_at: '2026-11-10T09:00:00.000Z',
    created_at: '2026-11-09T08:00:00.000Z',
    updated_at: '2026-11-10T09:00:00.000Z',
  },
  {
    id: 'p-unpublished',
    seller_id: 'seller-1',
    category_id: 'cat-clothing',
    name: 'No publicado',
    slug: 'no-publicado',
    description: 'Guardado y oculto.',
    price: 49.5,
    currency: 'USD',
    stock: 7,
    primary_image_path: 'http://localhost:8080/product-images/p-unpublished/thumb.webp',
    state: 'unpublished',
    average_rating: 0,
    ratings_count: 0,
    published_at: null,
    created_at: '2026-11-12T10:00:00.000Z',
    updated_at: '2026-11-13T08:30:00.000Z',
  },
];

const ROUTE_FILTER = (process.env.MATRIX_ROUTES || '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const activeRoutes = ROUTES.filter(
  (r) =>
    (!SKIP_AUTH_ROUTES || !r.authenticated) &&
    (ROUTE_FILTER.length === 0 || ROUTE_FILTER.includes(r.name))
);

const THEMES = ['light', 'dark'];

const VIEWPORTS = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

/** @type {{route:string, theme:string, viewport:string, status:'PASS'|'FAIL', errors:string[]}[]} */
const results = [];

const browser = await puppeteer.launch({ headless: 'new' });

for (const route of activeRoutes) {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const combo = { route: route.name, theme, viewport: vp.name, status: 'PASS', errors: [] };
      const page = await browser.newPage();
      const pageErrors = [];
      const rateLimitedEndpoints = [];
      const notFoundEndpoints = [];
      page.on('response', (res) => {
        if (res.status() === 429) {
          rateLimitedEndpoints.push(res.url());
        } else if (res.status() === 404) {
          notFoundEndpoints.push(res.url());
        }
      });
      page.on('pageerror', (e) => pageErrors.push('PAGEERROR: ' + e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') {
          const text = m.text();
          // Ignore the expected 401 from the boot /auth/me call.
          // Anonymous visitors always trigger this.
          if (text.includes('401') && text.includes('Unauthorized')) {
            return;
          }
          pageErrors.push('CONSOLE-ERR: ' + text);
        }
      });

      await page.setViewport({ width: vp.width, height: vp.height });

      // Per-route mocked session: the role set and the orders the API would return.
      const sessionRoles = (route.roles || ['buyer']).map((name) => ({ name }));
      const sessionOrders = route.name === 'seller-orders' ? SELLER_SAMPLE_ORDERS : [];
      const sessionSellerProducts = route.name === 'seller-products' ? SAMPLE_SELLER_PRODUCTS : [];

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        const corsHeaders = {
          'Access-Control-Allow-Origin': req.headers().origin || BASE,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, Authorization',
        };

        if (url.includes('/product-images/') || url.includes('picsum.photos')) {
          if (req.method() === 'OPTIONS') {
            return req.respond({ status: 204, headers: corsHeaders });
          }
          return req.respond({
            status: 200,
            contentType: 'image/svg+xml',
            headers: corsHeaders,
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#e2e8f0"/></svg>',
          });
        }

        if (
          route.authenticated &&
          (url.includes('/v1/auth/me') ||
            url.includes('/v1/profiles/') ||
            url.includes('/v1/cart') ||
            url.includes('/v1/orders') ||
            url.includes('/v1/seller/products') ||
            url.includes('/v1/categories') ||
            url.includes('/v1/admin/reports'))
        ) {
          if (req.method() === 'OPTIONS') {
            return req.respond({
              status: 204,
              headers: corsHeaders,
            });
          }

          const sampleProfile = {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            username: 'camila_m',
            full_name: 'Camila Morales',
            avatar_path: null,
            bio: 'Coleccionista de artesanía y textiles andinos.',
            locale: 'es-PE',
            created_at: '2026-10-01T00:00:00.000Z',
            updated_at: '2026-10-01T00:00:00.000Z',
          };

          let body;
          if (url.includes('/v1/auth/me')) {
            body = {
              data: {
                user: {
                  id: sampleProfile.id,
                  username: sampleProfile.username,
                  full_name: sampleProfile.full_name,
                },
                profile: sampleProfile,
                roles: sessionRoles,
              },
              meta: { timestamp: '2026-10-14T12:00:00.000Z' },
            };
          } else if (url.includes('/v1/cart')) {
            body = {
              data: { id: 'cart-1', items: [], subtotal: 0, item_count: 0 },
              meta: { timestamp: '2026-10-14T12:00:00.000Z' },
            };
          } else if (url.includes('/v1/seller/products') && !url.includes('/images/')) {
            body = {
              data: sessionSellerProducts,
              meta: {
                page: 1,
                per_page: 20,
                total: sessionSellerProducts.length,
                total_pages: sessionSellerProducts.length ? 1 : 0,
              },
            };
          } else if (url.includes('/v1/categories') && req.method() === 'GET') {
            body = {
              data: SAMPLE_CATEGORIES,
              meta: { timestamp: '2026-11-14T12:00:00.000Z' },
            };
          } else if (url.includes('/v1/orders')) {
            body = {
              data: sessionOrders,
              meta: {
                page: 1,
                per_page: 10,
                total: sessionOrders.length,
                total_pages: sessionOrders.length ? 1 : 0,
                timestamp: '2026-10-14T12:00:00.000Z',
              },
            };
          } else if (url.includes('/v1/admin/reports')) {
            body = adminReportBody(url);
          } else {
            body = {
              data: sampleProfile,
              meta: { timestamp: '2026-10-14T12:00:00.000Z' },
            };
          }

          return req.respond({
            status: 200,
            contentType: 'application/json',
            headers: corsHeaders,
            body: JSON.stringify(body),
          });
        }
        return req.continue();
      });

      // Set theme and optional authenticated session before navigation so first paint is themed
      await page.evaluateOnNewDocument(
        (t, isAuth, roles, ordersData, sellerProductsData, categoriesData) => {
          try {
            window.localStorage.setItem('qatu.theme', t);
            if (isAuth) {
              const profile = {
                id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                username: 'camila_m',
                full_name: 'Camila Morales',
                avatar_path: null,
                bio: 'Coleccionista de artesanía y textiles andinos.',
                locale: 'es-PE',
                created_at: '2026-10-01T00:00:00.000Z',
                updated_at: '2026-10-01T00:00:00.000Z',
              };
              window.sessionStorage.setItem(
                'qatu.auth.session',
                JSON.stringify({
                  v: 2,
                  user: {
                    id: profile.id,
                    username: profile.username,
                    full_name: profile.full_name,
                  },
                  profile,
                  roles,
                  savedAt: new Date().toISOString(),
                })
              );

              const originalFetch = window.fetch.bind(window);
              window.fetch = async (input, init) => {
                const url = typeof input === 'string' ? input : input?.url || '';
                if (
                  url.includes('/v1/auth/me') ||
                  url.includes('/v1/profiles/') ||
                  url.includes('/v1/cart') ||
                  url.includes('/v1/seller/products') ||
                  url.includes('/v1/categories') ||
                  url.includes('/v1/orders') ||
                  url.includes('/v1/admin/reports')
                ) {
                  let body;
                  if (url.includes('/v1/auth/me')) {
                    body = {
                      data: {
                        user: {
                          id: profile.id,
                          username: profile.username,
                          full_name: profile.full_name,
                        },
                        profile,
                        roles,
                      },
                      meta: { timestamp: '2026-10-14T12:00:00.000Z' },
                    };
                  } else if (url.includes('/v1/cart')) {
                    body = {
                      data: { id: 'cart-1', items: [], subtotal: 0, item_count: 0 },
                      meta: { timestamp: '2026-10-14T12:00:00.000Z' },
                    };
                  } else if (url.includes('/v1/seller/products') && !url.includes('/images/')) {
                    body = {
                      data: sellerProductsData,
                      meta: {
                        page: 1,
                        per_page: 20,
                        total: sellerProductsData.length,
                        total_pages: sellerProductsData.length ? 1 : 0,
                      },
                    };
                  } else if (url.includes('/v1/categories')) {
                    body = {
                      data: categoriesData,
                      meta: { timestamp: '2026-11-14T12:00:00.000Z' },
                    };
                  } else if (url.includes('/v1/orders')) {
                    body = {
                      data: ordersData,
                      meta: {
                        page: 1,
                        per_page: 10,
                        total: ordersData.length,
                        total_pages: ordersData.length ? 1 : 0,
                        timestamp: '2026-10-14T12:00:00.000Z',
                      },
                    };
                  } else if (url.includes('/v1/admin/reports')) {
                    body = adminReportBody(url);
                  } else {
                    body = {
                      data: profile,
                      meta: { timestamp: '2026-10-14T12:00:00.000Z' },
                    };
                  }

                  return new window.Response(JSON.stringify(body), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  });
                }
                return originalFetch(input, init);
              };
            }
          } catch {
            /* ignore */
          }
        },
        theme,
        Boolean(route.authenticated),
        sessionRoles,
        sessionOrders,
        sessionSellerProducts,
        SAMPLE_CATEGORIES
      );

      try {
        await page.goto(BASE + route.path, { waitUntil: 'networkidle0', timeout: 15000 });
        // Give dynamic content (products, stores) a moment to hydrate
        await new Promise((r) => setTimeout(r, 400));

        // ── Validation 1: no horizontal overflow
        const overflow = await page.evaluate(() => {
          return {
            docScrollWidth: document.documentElement.scrollWidth,
            docClientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
          };
        });
        if (overflow.docScrollWidth > overflow.docClientWidth + 2) {
          combo.errors.push(
            `HORIZONTAL_OVERFLOW: doc ${overflow.docScrollWidth} > client ${overflow.docClientWidth}`
          );
        }

        // ── Validation 2: key elements per route
        const keyCheck = await page.evaluate((routeName) => {
          const check = (selector) => !!document.querySelector(selector);
          switch (routeName) {
            case 'home':
              return {
                header: check('.q-header'),
                hero: check('.q-hero'),
                categories: check('.q-categories'),
                featured: check('.q-featured'),
                shippingBanner: check('.q-shipping-banner'),
                featuredStores: check('.q-featured-stores'),
                footer: check('.q-footer'),
              };
            case 'login':
            case 'register':
              return {
                header: check('.q-header'),
                authPage: check('.q-auth-page'),
                card: check('.q-auth-card'),
                footer: check('.q-footer'),
              };
            case 'about':
              return {
                header: check('.q-header'),
                aboutPage: check('.q-about'),
                team: check('.q-about__member'),
                repositories: check('.q-about__repository'),
                footer: check('.q-footer'),
              };
            case 'catalog':
              return {
                header: check('.q-header'),
                catalogSection: check('.q-catalog'),
                grid: check('.q-catalog__grid'),
                footer: check('.q-footer'),
              };
            case 'search':
              return {
                header: check('.q-header'),
                catalogSection: check('.q-catalog'),
                grid: check('.q-catalog__grid'),
                footer: check('.q-footer'),
              };
            case 'product-detail':
              return {
                header: check('.q-header'),
                detailSection: check('.q-product-detail'),
                breadcrumb: check('.q-breadcrumb'),
                title: check('.q-product-detail__title'),
                gallery: check('.q-product-detail__main-image'),
                quantity: check('.q-quantity-selector'),
                addToCart: check('.q-product-detail__add'),
                tabs: check('.q-product-detail__tablist'),
                recommendations: check('.q-product-detail__similar-grid .q-product-card'),
                footer: check('.q-footer'),
              };
            case 'cart':
              return {
                header: check('.q-header'),
                cartSection: check('.q-cart'),
                title: check('.q-cart__title'),
                emptyState: check('.q-cart__empty'),
                continueShopping: check('.q-cart__continue'),
                footer: check('.q-footer'),
              };
            case 'orders':
              return {
                header: check('.q-header'),
                ordersPage: check('.q-orders-page'),
                title: check('.q-orders-page__title'),
                // The matrix runs anonymous, so the page shows the unauthenticated
                // prompt. `.q-orders-empty` matches both the empty state and the
                // unauthenticated state, so it's a safe positive check.
                emptyOrPrompt: check('.q-orders-empty'),
                footer: check('.q-footer'),
              };
            case 'profile':
              return {
                header: check('.q-header'),
                profileSection: check('.q-profile'),
                summaryCard: check('.q-profile-summary-card'),
                formCard: check('.q-profile-form-card'),
                footer: check('.q-footer'),
              };
            case 'seller-orders':
              return {
                header: check('.q-header'),
                sellerPage: check('.q-seller-orders-page'),
                title: check('.q-seller-orders-page__title'),
                kpis: check('.q-seller-orders-kpi'),
                table: check('.q-seller-orders-table'),
                row: check('.q-seller-orders-table tbody tr'),
                statusSelector: check('.q-seller-orders-table tbody select'),
                footer: check('.q-footer'),
              };
            case 'seller-products':
              return {
                header: check('.q-header'),
                sellerPage: check('.q-seller-products'),
                breadcrumb: check('.q-seller-products__breadcrumb'),
                title: check('.q-seller-products__title'),
                createButton: check('.q-seller-products__create-btn'),
                kpis: check('.q-seller-products__kpi'),
                filterTabs: check('.q-seller-products__filter'),
                grid: check('.q-seller-products__grid'),
                cards: check('.product-card--seller'),
                footer: check('.q-footer'),
              };
            case 'seller-product-new':
              return {
                header: check('.q-header'),
                formPage: check('.q-seller-product-form'),
                stepper: check('.q-seller-product-form__stepper'),
                stepOneActive: check('.q-seller-product-form__step.is-active'),
                nameInput: check('input[name="name"]'),
                priceInput: check('input[name="price"]'),
                categorySelect: check('select[name="categoryId"]'),
                submitBtn: check('.q-seller-product-form__footer .q-btn--primary'),
                footer: check('.q-footer'),
              };
            default:
              return {};
          }
        }, route.name);

        const missing = Object.entries(keyCheck)
          .filter(([, ok]) => !ok)
          .map(([k]) => k);
        if (missing.length > 0) {
          combo.errors.push('MISSING_ELEMENTS: ' + missing.join(','));
        }

        // ── Validation 3: failed images must not expose their alt text
        const altLeak = await page.evaluate(() => {
          const imgs = document.querySelectorAll('.q-product-card-photo');
          return Array.from(imgs).filter(
            (img) =>
              img.complete && img.naturalWidth === 0 && (img.getAttribute('alt') || '').length > 0
          ).length;
        });
        if (altLeak > 0) {
          combo.errors.push(`ALT_TEXT_LEAK: ${altLeak} failed img with non-empty alt`);
        }

        // ── Validation 4: theme actually applied
        const appliedTheme = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme')
        );
        if (appliedTheme !== theme) {
          combo.errors.push(`THEME_NOT_APPLIED: expected ${theme}, got ${appliedTheme}`);
        }

        // ── Screenshot
        const file = join(OUT_DIR, `${route.name}-${theme}-${vp.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
      } catch (err) {
        combo.errors.push('EXCEPTION: ' + err.message);
      } finally {
        // Any pageerror / console.error collected during the run
        if (pageErrors.length > 0) {
          const filtered = pageErrors.filter((err) => {
            // Ignore 429 console errors from boot /auth/me call (authLimiter has 20 req/15min)
            if (
              err.includes('429') &&
              err.includes('Too Many Requests') &&
              rateLimitedEndpoints.length > 0 &&
              rateLimitedEndpoints.every((url) => url.includes('/auth/me'))
            ) {
              return false;
            }
            if (
              err.includes('404') &&
              err.includes('Not Found') &&
              notFoundEndpoints.length > 0 &&
              notFoundEndpoints.every((url) => url.endsWith('/favicon.ico'))
            ) {
              return false;
            }
            return true;
          });
          if (filtered.length > 0) {
            combo.errors.push(...filtered);
          }
        }
        await page.close();
      }

      if (combo.errors.length > 0) combo.status = 'FAIL';
      results.push(combo);
      console.log(
        `[${combo.status}] ${route.name.padEnd(14)} ${theme.padEnd(5)} ${vp.name.padEnd(8)}` +
          (combo.errors.length ? ' → ' + combo.errors.join(' | ') : '')
      );

      // Wait 2 seconds between iterations to respect the backend rate limit (100 req/min).
      // Without this, the fast consecutive requests trigger 429s and break data fetching.
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

await browser.close();

// ── Executive summary
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;

console.log('\n══════════════════════════════════════════');
console.log(`  MATRIX SUMMARY: ${pass}/${results.length} PASS, ${fail} FAIL`);
console.log(`  Target: ${BASE}`);
console.log('══════════════════════════════════════════');
if (fail > 0) {
  console.log('\nFailures:');
  results
    .filter((r) => r.status === 'FAIL')
    .forEach((r) => {
      console.log(`  - ${r.route} / ${r.theme} / ${r.viewport}: ${r.errors.join(' | ')}`);
    });
}
console.log('\nScreenshots saved to: ' + OUT_DIR);
console.log('  ' + results.length + ' files');

// Write machine-readable report
writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
console.log('  report.json written');

// Exit code 1 if any failure — CI-friendly
if (fail > 0) process.exit(1);
console.log(`\n[MATRIX] OK — ${results.length} screenshots from ${BASE}`);
