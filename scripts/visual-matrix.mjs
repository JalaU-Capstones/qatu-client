/* global process, console, window, document, setTimeout, URL, getComputedStyle */
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
  { name: 'cart', path: '/cart', authenticated: true },
  { name: 'checkout', path: '/checkout', authenticated: true },
  {
    name: 'order-confirmation',
    path: '/order-confirmation/ORD-00100042',
    authenticated: true,
  },
  { name: 'search', path: '/products?q=the' },
  { name: 'orders', path: '/orders', authenticated: true },
  { name: 'order-detail', path: '/orders/ORD-00100001', authenticated: true },
  { name: 'profile', path: '/profile', authenticated: true },
  { name: 'apply-seller', path: '/apply-seller', authenticated: true },
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
  {
    name: 'seller-product-edit',
    path: '/seller/products/p-draft-with-img/edit',
    authenticated: true,
    roles: ['seller'],
  },
  { name: 'admin-reports', path: '/admin/reports', authenticated: true, roles: ['admin'] },
  {
    name: 'seller-applications',
    path: '/admin/seller-applications',
    authenticated: true,
    roles: ['admin'],
  },
  { name: 'reports', path: '/reports', authenticated: true, roles: ['admin'] },
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

const ADMIN_SELLER_APPLICATIONS = [
  {
    id: 'matrix-app-pending',
    business_name: 'Taller Illimani',
    business_description: 'Textiles y artesanía andina hechos a mano.',
    contact_email: 'taller@example.com',
    contact_phone: '+591 700 12345',
    created_at: '2026-11-18T12:00:00.000Z',
    status: 'pending',
  },
  {
    id: 'matrix-app-approved',
    business_name: 'Café Altura',
    business_description: 'Café de altura de origen local.',
    contact_email: 'cafe@example.com',
    contact_phone: '+591 700 67890',
    created_at: '2026-11-16T12:00:00.000Z',
    status: 'approved',
  },
  {
    id: 'matrix-app-rejected',
    business_name: 'Cerámica del Valle',
    business_description: 'Piezas utilitarias y decorativas de cerámica.',
    contact_email: 'ceramica@example.com',
    contact_phone: '+591 700 54321',
    created_at: '2026-11-14T12:00:00.000Z',
    status: 'rejected',
    rejection_reason: 'Completa la información comercial.',
  },
];

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

const ORDER_CONFIRMATION_SAMPLE = {
  id: 'b4444444-4444-4444-8444-444444444444',
  order_number: 'ORD-00100042',
  buyer_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  status: 'pending',
  currency: 'USD',
  created_at: '2026-10-14T11:00:00.000Z',
  subtotal: 40,
  shipping_cost: 4.99,
  tax: 0,
  total: 44.99,
  shipping_address: {
    full_name: 'Camila Morales',
    phone: '71234567',
    street: 'Av. Arce #123',
    city: 'La Paz',
    state: 'La Paz',
    country: 'BO',
  },
  items: [{ id: 'oi-matrix-1', product_name: 'Manta andina', quantity: 1, subtotal: 40 }],
};

const ORDER_DETAIL_SAMPLE = {
  ...ORDER_CONFIRMATION_SAMPLE,
  id: 'b5555555-5555-4555-8555-555555555555',
  order_number: 'ORD-00100001',
  status: 'shipped',
  subtotal: 104.98,
  total: 109.97,
  items: [
    {
      id: 'oi-matrix-2',
      product_id: 'c1111111-1111-4111-8111-111111111111',
      product_name: 'Manta andina tejida a mano en lana de alpaca',
      quantity: 2,
      unit_price: 39.99,
      subtotal: 79.98,
    },
    {
      id: 'oi-matrix-3',
      product_id: 'c2222222-2222-4222-8222-222222222222',
      product_name: 'Chullo artesanal de lana con diseño tradicional',
      quantity: 1,
      unit_price: 25,
      subtotal: 25,
    },
  ],
};

/** Categories for `GET /v1/categories` (header dropdown + wizard step 1). */
const SAMPLE_CATEGORIES = [
  { id: 'cat-electronics', name: 'Electrónica', slug: 'electronics' },
  { id: 'cat-clothing', name: 'Ropa y Moda', slug: 'clothing' },
  { id: 'cat-home', name: 'Hogar y Jardín', slug: 'home-and-garden' },
  { id: 'cat-sports', name: 'Deportes', slug: 'sports' },
  { id: 'cat-books', name: 'Libros', slug: 'books' },
];

const CART_SAMPLE_ITEMS = [
  {
    id: 'cart-item-aguayo',
    product_id: 'p-cart-aguayo',
    quantity: 1,
    seller: 'Tejidos Illimani · Bolivia',
    product: {
      id: 'p-cart-aguayo',
      slug: 'aguayo-tradicional',
      name: 'Aguayo tradicional de Tarabuco',
      price: 14,
      currency: 'USD',
      primary_image_path: 'http://localhost:5173/product-images/cart-aguayo.webp',
    },
  },
  {
    id: 'cart-item-cafe',
    product_id: 'p-cart-cafe',
    quantity: 1,
    seller: 'Café Altura Cusco · Perú',
    product: {
      id: 'p-cart-cafe',
      slug: 'cafe-cusco',
      name: 'Café de especialidad de Cusco 500 g',
      price: 12,
      currency: 'USD',
      primary_image_path: 'http://localhost:5173/product-images/cart-cafe.webp',
    },
  },
  {
    id: 'cart-item-jarron',
    product_id: 'p-cart-jarron',
    quantity: 1,
    seller: 'Barro Negro Oaxaca · México',
    product: {
      id: 'p-cart-jarron',
      slug: 'jarron-barro-negro',
      name: 'Jarrón de barro negro de Oaxaca',
      price: 18,
      currency: 'USD',
      primary_image_path: 'http://localhost:5173/product-images/cart-jarron.webp',
    },
  },
];

/** Products returned for `GET /v1/seller/products`. */
const SELLER_PRODUCT_TEMPLATES = [
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

const SAMPLE_SELLER_PRODUCTS = [
  ...SELLER_PRODUCT_TEMPLATES,
  ...Array.from({ length: 17 }, (_, index) => {
    const source = SELLER_PRODUCT_TEMPLATES[index % SELLER_PRODUCT_TEMPLATES.length];
    const suffix = index + SELLER_PRODUCT_TEMPLATES.length + 1;
    return {
      ...source,
      id: `p-matrix-${suffix}`,
      name: `${source.name} ${suffix}`,
      slug: `${source.slug}-${suffix}`,
    };
  }),
];

function sellerProductsResponse(url, products) {
  const query = new URL(url, BASE).searchParams;
  const page = Math.max(1, Number(query.get('page')) || 1);
  const limit = Math.max(1, Number(query.get('limit')) || 20);
  const status = query.get('status');
  const matchingProducts = status
    ? products.filter((product) => product.state === status)
    : products;
  const start = (page - 1) * limit;
  return {
    data: matchingProducts.slice(start, start + limit),
    meta: {
      page,
      per_page: limit,
      total: matchingProducts.length,
      total_pages: matchingProducts.length ? Math.ceil(matchingProducts.length / limit) : 0,
    },
  };
}

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
      const sessionOrders =
        route.name === 'order-detail'
          ? [ORDER_DETAIL_SAMPLE]
          : route.name === 'orders' || route.name === 'order-confirmation'
            ? [ORDER_CONFIRMATION_SAMPLE]
            : route.name === 'seller-orders'
              ? SELLER_SAMPLE_ORDERS
              : [];
      const sessionCartItems = ['cart', 'checkout'].includes(route.name) ? CART_SAMPLE_ITEMS : [];
      const sessionSellerProducts = ['seller-products', 'seller-product-edit'].includes(route.name)
        ? SAMPLE_SELLER_PRODUCTS
        : [];

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
          route.name === 'seller-product-new' &&
          req.method() === 'POST' &&
          url.includes('/v1/products')
        ) {
          const isImageUpload = url.includes('/images');
          return req.respond({
            status: 201,
            contentType: 'application/json',
            headers: corsHeaders,
            body: JSON.stringify({
              data: isImageUpload
                ? {
                    id: 'matrix-image-1',
                    product_id: 'matrix-product-1',
                    path: 'http://localhost:5173/product-images/matrix-image-1.png',
                    alt_text: 'matrix-image.png',
                    position: 0,
                    created_at: '2026-11-18T12:00:00.000Z',
                  }
                : {
                    id: 'matrix-product-1',
                    name: 'Producto de matriz',
                    slug: 'producto-de-matriz',
                    state: 'draft',
                  },
              meta: { timestamp: '2026-11-18T12:00:00.000Z' },
            }),
          });
        }

        if (
          route.authenticated &&
          (url.includes('/v1/auth/me') ||
            url.includes('/v1/profiles/') ||
            url.includes('/v1/cart') ||
            url.includes('/v1/orders') ||
            url.includes('/v1/admin/seller-applications') ||
            url.includes('/v1/seller-applications') ||
            url.includes('/v1/seller/products') ||
            url.includes('/v1/products/') ||
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
          } else if (
            url.includes('/v1/admin/seller-applications') ||
            url.includes('/v1/seller-applications')
          ) {
            body = {
              data: url.includes('/admin/seller-applications') ? ADMIN_SELLER_APPLICATIONS : null,
              meta: {
                page: 1,
                limit: 20,
                total: ADMIN_SELLER_APPLICATIONS.length,
                totalPages: 1,
                timestamp: '2026-11-18T12:00:00.000Z',
              },
            };
          } else if (url.includes('/v1/products/') && url.includes('/images')) {
            body = {
              data: [
                {
                  id: 'matrix-image-1',
                  product_id: 'p-draft-with-img',
                  path: 'http://localhost:5173/product-images/matrix-image-1.webp',
                  alt_text: 'Frente del producto',
                  position: 0,
                },
              ],
              meta: { timestamp: '2026-11-18T12:00:00.000Z' },
            };
          } else if (url.includes('/v1/products/')) {
            body = {
              data: SELLER_PRODUCT_TEMPLATES[0],
              meta: { timestamp: '2026-11-18T12:00:00.000Z' },
            };
          } else if (url.includes('/v1/cart')) {
            const method = req.method();
            if (method === 'GET') {
              body = {
                data: sessionCartItems,
                meta: { timestamp: '2026-10-14T12:00:00.000Z' },
              };
            } else if (method === 'PATCH') {
              const cartItemId = new URL(url).pathname.split('/').pop();
              const item = sessionCartItems.find((cartItem) => cartItem.id === cartItemId);
              const quantity = JSON.parse(req.postData() || '{}').quantity;
              body = {
                data: { ...item, quantity },
                meta: { timestamp: '2026-10-14T12:00:00.000Z' },
              };
            } else {
              return req.respond({ status: 204, headers: corsHeaders });
            }
          } else if (url.includes('/v1/seller/products') && !url.includes('/images/')) {
            body = sellerProductsResponse(url, sessionSellerProducts);
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
        (
          t,
          isAuth,
          roles,
          ordersData,
          cartItems,
          sellerProductsData,
          categoriesData,
          editProductData,
          reportData,
          sellerApplicationsData
        ) => {
          try {
            const getReportBody = (url) => {
              const data = url.includes('/admin/reports/users')
                ? reportData.users
                : url.includes('/admin/reports/products')
                  ? reportData.products
                  : reportData.sales;
              return { data, meta: { timestamp: '2026-11-18T12:00:00.000Z' } };
            };

            window.localStorage.setItem('qatu.theme', t);
            if (isAuth) {
              const profile = {
                id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                username: 'camila_m',
                full_name: 'Camila Morales',
                email: 'buyer@example.com',
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
                    email: profile.email,
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
                  url.includes('/v1/products/') ||
                  url.includes('/v1/categories') ||
                  url.includes('/v1/orders') ||
                  url.includes('/v1/admin/seller-applications') ||
                  url.includes('/v1/seller-applications') ||
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
                          email: profile.email,
                        },
                        profile,
                        roles,
                      },
                      meta: { timestamp: '2026-10-14T12:00:00.000Z' },
                    };
                  } else if (
                    url.includes('/v1/admin/seller-applications') ||
                    url.includes('/v1/seller-applications')
                  ) {
                    body = {
                      data: url.includes('/admin/seller-applications')
                        ? sellerApplicationsData
                        : null,
                      meta: {
                        page: 1,
                        limit: 20,
                        total: sellerApplicationsData.length,
                        totalPages: 1,
                        timestamp: '2026-11-18T12:00:00.000Z',
                      },
                    };
                  } else if (url.includes('/v1/products/') && url.includes('/images')) {
                    body = {
                      data: [
                        {
                          id: 'matrix-image-1',
                          product_id: 'p-draft-with-img',
                          path: 'http://localhost:5173/product-images/matrix-image-1.webp',
                          alt_text: 'Frente del producto',
                          position: 0,
                        },
                      ],
                      meta: { timestamp: '2026-11-18T12:00:00.000Z' },
                    };
                  } else if (url.includes('/v1/products/')) {
                    body = {
                      data: editProductData,
                      meta: { timestamp: '2026-11-18T12:00:00.000Z' },
                    };
                  } else if (url.includes('/v1/cart')) {
                    const method = (init?.method || 'GET').toUpperCase();
                    if (method === 'GET') {
                      body = {
                        data: cartItems,
                        meta: { timestamp: '2026-10-14T12:00:00.000Z' },
                      };
                    } else if (method === 'PATCH') {
                      const cartItemId = new URL(url, window.location.origin).pathname
                        .split('/')
                        .pop();
                      const item = cartItems.find((cartItem) => cartItem.id === cartItemId);
                      const quantity = JSON.parse(init?.body || '{}').quantity;
                      body = {
                        data: { ...item, quantity },
                        meta: { timestamp: '2026-10-14T12:00:00.000Z' },
                      };
                    } else {
                      return new window.Response(null, {
                        status: 204,
                        headers: { 'Content-Type': 'application/json' },
                      });
                    }
                  } else if (url.includes('/v1/seller/products') && !url.includes('/images/')) {
                    const query = new URL(url, window.location.origin).searchParams;
                    const page = Math.max(1, Number(query.get('page')) || 1);
                    const limit = Math.max(1, Number(query.get('limit')) || 20);
                    const status = query.get('status');
                    const matchingProducts = status
                      ? sellerProductsData.filter((product) => product.state === status)
                      : sellerProductsData;
                    const start = (page - 1) * limit;
                    body = {
                      data: matchingProducts.slice(start, start + limit),
                      meta: {
                        page,
                        per_page: limit,
                        total: matchingProducts.length,
                        total_pages: matchingProducts.length
                          ? Math.ceil(matchingProducts.length / limit)
                          : 0,
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
                    body = getReportBody(url);
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
        sessionCartItems,
        sessionSellerProducts,
        SAMPLE_CATEGORIES,
        SELLER_PRODUCT_TEMPLATES[0],
        ADMIN_REPORTS,
        ADMIN_SELLER_APPLICATIONS
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
                title: document.querySelector('.q-cart__title')?.textContent === 'Tu carrito',
                itemList: check('.q-cart__items'),
                products: document.querySelectorAll('.q-cart-item').length === 3,
                summary: check('.q-cart__summary'),
                shippingProgress: check('.q-cart__shipping-progress'),
                quantityControls: document.querySelectorAll('.q-quantity-selector').length === 3,
                removeControls: document.querySelectorAll('.q-cart-item__remove').length === 3,
                continueShopping: check('.q-cart__summary .q-cart__continue'),
                responsiveColumns: (() => {
                  const layout = document.querySelector('.q-cart__layout');
                  if (!layout) return false;
                  const columns = getComputedStyle(layout).gridTemplateColumns.split(' ').length;
                  return columns === (window.innerWidth <= 1023 ? 1 : 2);
                })(),
                footer: check('.q-footer'),
              };
            case 'checkout':
              return {
                header: check('.q-header'),
                checkoutPage: check('.q-checkout'),
                eyebrow:
                  document.querySelector('.q-checkout__eyebrow')?.textContent === 'Envío y pago',
                title:
                  document.querySelector('.q-checkout__title')?.textContent === 'Finalizar compra',
                currentStep:
                  document.querySelector('.q-checkout__step[aria-current="step"]')?.textContent ===
                  'PASO 1 DE 3 · ENVÍO',
                backToCart: check('.q-checkout__back[href="/cart"]'),
                shippingForm: check('.q-checkout__main'),
                orderSummary: check('.q-checkout__summary'),
                confirmButton: check('.q-checkout__submit'),
                responsiveColumns: (() => {
                  const layout = document.querySelector('.q-checkout__layout');
                  if (!layout) return false;
                  const columns = getComputedStyle(layout).gridTemplateColumns.split(' ').length;
                  return columns === (window.innerWidth <= 1023 ? 1 : 2);
                })(),
                summaryBelowForm: (() => {
                  if (window.innerWidth > 1023) return true;
                  const form = document.querySelector('.q-checkout__main');
                  const summary = document.querySelector('.q-checkout__summary');
                  return Boolean(
                    form &&
                    summary &&
                    summary.getBoundingClientRect().top >= form.getBoundingClientRect().bottom
                  );
                })(),
                backgroundReachesTop: (() => {
                  const checkout = document.querySelector('.q-checkout');
                  if (!checkout) return false;
                  const top = checkout.getBoundingClientRect().top;
                  const backgroundTop = Number.parseFloat(
                    getComputedStyle(checkout, '::before').top
                  );
                  return top + backgroundTop <= 1;
                })(),
                footer: check('.q-footer'),
              };
            case 'order-confirmation':
              return {
                header: check('.q-header'),
                confirmationPage: check('.q-order-confirmation'),
                canonicalPath: window.location.pathname === '/order-confirmation/ORD-00100042',
                greeting: document
                  .querySelector('.q-order-confirmation h1')
                  ?.textContent.includes('¡Gracias por tu compra'),
                confirmationCard: check('[data-testid="order-confirmation"]'),
                orderNumber:
                  document
                    .querySelector('[data-testid="order-confirmation-number"]')
                    ?.textContent.includes('ORD-00100042') ?? false,
                timeline: check('[data-testid="order-timeline"]'),
                summary: check('.q-order-confirmation__receipt'),
                summaryItem: check('[data-testid="receipt-item"]'),
                shippingAddress: check('[data-testid="receipt-address"]'),
                backgroundReachesTop: (() => {
                  const page = document.querySelector('.q-order-confirmation');
                  if (!page) return false;
                  const top = page.getBoundingClientRect().top;
                  const backgroundTop = Number.parseFloat(getComputedStyle(page, '::before').top);
                  return top + backgroundTop <= 1;
                })(),
                footer: check('.q-footer'),
              };
            case 'orders':
              return {
                header: check('.q-header'),
                ordersPage: check('.q-orders-page'),
                title: check('.q-orders-page__title'),
                orderCard: check('.q-order-card'),
                status: check('.q-order-status'),
                detailsButton: check('[data-testid="view-order-details-btn"]'),
                backgroundCoversTop: (() => {
                  const page = document.querySelector('.q-orders-page');
                  if (!page) return false;
                  const top = page.getBoundingClientRect().top;
                  const backgroundTop = Number.parseFloat(getComputedStyle(page, '::before').top);
                  return top + backgroundTop <= 1;
                })(),
                footer: check('.q-footer'),
              };
            case 'order-detail':
              return {
                header: check('.q-header'),
                orderDetail: check('[data-testid="order-detail"]'),
                orderTitle: check('[data-testid="order-detail-title"]'),
                tracker: check('[data-testid="order-tracker"]'),
                productLinks: check('a[data-testid="order-item-name"][data-route]'),
                summary: check('[data-testid="order-summary-card"]'),
                shippingAddress: check('[data-testid="order-shipping-card"]'),
                backgroundCoversTop: (() => {
                  const page = document.querySelector('.q-orders-page');
                  if (!page) return false;
                  const top = page.getBoundingClientRect().top;
                  const backgroundTop = Number.parseFloat(getComputedStyle(page, '::before').top);
                  return top + backgroundTop <= 1;
                })(),
                footer: check('.q-footer'),
              };
            case 'apply-seller':
              return {
                header: check('.q-header'),
                applicationSection: check('.q-seller-apply-page'),
                formCard: check('.q-seller-apply-card[data-role="form-card"]'),
                businessName: check('#q-apply-business-name'),
                description: check('#q-apply-business-description'),
                descriptionFitsCard: (() => {
                  const card = document.querySelector(
                    '.q-seller-apply-card[data-role="form-card"]'
                  );
                  const textarea = document.querySelector('#q-apply-business-description');
                  return Boolean(
                    card &&
                    textarea &&
                    textarea.getBoundingClientRect().right <= card.getBoundingClientRect().right + 1
                  );
                })(),
                countryCode: check('select[name="country_region"]'),
                phoneNumber: check('input[name="phone_number"]'),
                accountEmail: check('#q-apply-account-email[readonly]'),
                emailChoices: document.querySelectorAll('[name="email_option"]').length === 2,
                backgroundReachesTop: (() => {
                  const section = document.querySelector('.q-seller-apply-page');
                  if (!section) return false;
                  const top = section.getBoundingClientRect().top;
                  const backgroundTop = Number.parseFloat(
                    getComputedStyle(section, '::before').top
                  );
                  return top + backgroundTop <= 1;
                })(),
                cardFitsViewport: (() => {
                  const card = document.querySelector(
                    '.q-seller-apply-card[data-role="form-card"]'
                  );
                  if (!card) return false;
                  const rect = card.getBoundingClientRect();
                  return rect.left >= -1 && rect.right <= window.innerWidth + 1;
                })(),
                footer: check('.q-footer'),
              };
            case 'admin-reports':
            case 'reports':
              return {
                header: check('.q-header'),
                reportsPage: check('.q-reports-page'),
                title: check('.q-reports-title'),
                metrics: document.querySelectorAll('.q-reports-kpi').length === 6,
                chart: check('.q-reports-chart svg'),
                tables: document.querySelectorAll('.q-reports-table-block').length === 2,
                footer: check('.q-footer'),
              };
            case 'seller-applications':
              return {
                header: check('.q-header'),
                page: check('.q-admin-applications-page'),
                title:
                  document.querySelector('.q-admin-applications-title')?.textContent ===
                  'Solicitudes de vendedores',
                subtitle:
                  document.querySelector('.q-admin-applications-subtitle')?.textContent ===
                  "Revisa, aprueba o rechaza las postulaciones para vender en Q'atu",
                statusFilter: check('#admin-seller-app-status-filter'),
                table: check('.q-admin-applications-table'),
                rows:
                  document.querySelectorAll('.q-admin-applications-table tbody tr').length === 3,
                statusBadges:
                  document.querySelectorAll('.q-admin-applications-table .q-seller-app-badge')
                    .length === 3,
                pageBackgroundCoversTop: (() => {
                  const page = document.querySelector('.q-admin-applications-page');
                  if (!page) return false;
                  const style = getComputedStyle(page);
                  const headerZIndex = Number.parseInt(
                    getComputedStyle(document.querySelector('.q-header')).zIndex,
                    10
                  );
                  return (
                    page.getBoundingClientRect().top <= 1 &&
                    style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                    style.backgroundImage !== 'none' &&
                    Number.isFinite(headerZIndex) &&
                    headerZIndex > 0
                  );
                })(),
                noHorizontalOverflow:
                  document.documentElement.scrollWidth <= document.documentElement.clientWidth,
                desktopTableFits: (() => {
                  if (window.innerWidth < 1280) return true;
                  const table = document.querySelector('.q-admin-applications-table');
                  return table !== null && table.scrollWidth <= table.clientWidth;
                })(),
                mobileCards: (() => {
                  if (window.innerWidth > 767) return true;
                  const table = document.querySelector('.q-admin-applications-table');
                  const row = table?.querySelector('tbody tr');
                  const thead = table?.querySelector('thead');
                  const labels = [...(row?.querySelectorAll('td[data-label]') || [])].map(
                    (cell) => cell.dataset.label
                  );
                  return (
                    table !== null &&
                    row !== null &&
                    getComputedStyle(row).display === 'grid' &&
                    thead !== null &&
                    getComputedStyle(thead).display === 'none' &&
                    labels.join(',') === 'Negocio,Descripción,Contacto,Fecha,Estado,Acciones'
                  );
                })(),
                tabletTableScroll: (() => {
                  if (window.innerWidth < 768 || window.innerWidth >= 1280) return true;
                  const wrap = document.querySelector('.q-admin-applications-table-wrap');
                  return (
                    wrap !== null &&
                    getComputedStyle(wrap).overflowX === 'auto' &&
                    wrap.scrollWidth > wrap.clientWidth
                  );
                })(),
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
                title:
                  document.querySelector('.q-seller-orders-page__title')?.textContent ===
                  'Mis ventas',
                subtitle:
                  document.querySelector('.q-seller-orders-page__subtitle')?.textContent ===
                  'Pedidos que incluyen tus productos y control de estado',
                statusFilter: check('.q-seller-orders-page__filter #seller-order-status-filter'),
                kpiCount: document.querySelectorAll('.q-seller-orders-kpi').length === 4,
                kpiLayout: (() => {
                  const kpis = document.querySelector('.q-seller-orders-kpis');
                  if (!kpis) return false;
                  const columns = getComputedStyle(kpis).gridTemplateColumns.split(' ').length;
                  const expectedColumns =
                    window.innerWidth <= 420 ? 1 : window.innerWidth < 1280 ? 2 : 4;
                  return columns === expectedColumns;
                })(),
                table: check('.q-seller-orders-table'),
                row: check('.q-seller-orders-table tbody tr'),
                statusSelector: check('.q-seller-orders-table tbody select'),
                pageBackgroundCoversTop: (() => {
                  const page = document.querySelector('.q-seller-orders-page');
                  if (!page) return false;
                  const background = getComputedStyle(page);
                  return (
                    page.getBoundingClientRect().top <= 1 &&
                    background.backgroundColor !== 'rgba(0, 0, 0, 0)'
                  );
                })(),
                mobileCards: (() => {
                  if (window.innerWidth > 767) return true;
                  const row = document.querySelector('.q-seller-orders-table tbody tr');
                  return (
                    row !== null &&
                    getComputedStyle(row).display === 'grid' &&
                    row.querySelectorAll('td[data-label]').length === 7
                  );
                })(),
                tabletTableScroll: (() => {
                  if (window.innerWidth < 768 || window.innerWidth >= 1280) return true;
                  const wrap = document.querySelector('.q-seller-orders-table-wrap');
                  return (
                    wrap !== null &&
                    getComputedStyle(wrap).overflowX === 'auto' &&
                    wrap.scrollWidth > wrap.clientWidth
                  );
                })(),
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
                sellerActions: check('.q-seller-products__actions'),
                editAction: check('.q-seller-products__edit-btn'),
                deleteAction: check('.q-seller-products__delete-btn'),
                publishAction: check('.q-seller-products__publish-btn'),
                unpublishAction: check('.q-seller-products__unpublish-btn'),
                viewAction: check('.q-seller-products__view-btn'),
                pagination: check('.q-seller-products__pagination'),
                compactPaginationRange: check('.q-seller-products__pagination-compact'),
                paginationSingleRow: (() => {
                  const pagination = document.querySelector('.q-seller-products__pagination');
                  if (!pagination || window.innerWidth > 480) return Boolean(pagination);
                  const items = [
                    pagination.querySelector('.q-seller-products__pagination-prev'),
                    pagination.querySelector('.q-seller-products__pagination-range'),
                    pagination.querySelector('.q-seller-products__pagination-next'),
                  ];
                  const topEdges = items.map(
                    (item) => item?.getBoundingClientRect().top ?? Infinity
                  );
                  return Math.max(...topEdges) - Math.min(...topEdges) < 14;
                })(),
                compactPaginationVisible: (() => {
                  const label = document.querySelector('.q-seller-products__pagination-compact');
                  return window.innerWidth > 480 || getComputedStyle(label).display !== 'none';
                })(),
                footer: check('.q-footer'),
              };
            case 'seller-product-new':
              return {
                header: check('.q-header'),
                formPage: check('.q-seller-product-form'),
                singlePage: !check('.q-seller-product-form__stepper'),
                basicInformation: check('.q-seller-product-form__section-title'),
                statusBadge: check('.q-seller-product-form__status'),
                nameInput: check('input[name="name"]'),
                slugInput: check('input[name="slug"]'),
                priceInput: check('input[name="price"]'),
                categorySelect: check('select[name="categoryId"]'),
                imagesHiddenBeforeDraft: !check('.q-seller-product-form__images-panel'),
                submitBtn: check('.q-seller-product-form__submit-btn'),
                footer: check('.q-footer'),
              };
            case 'seller-product-edit':
              return {
                header: check('.q-header'),
                formPage: check('.q-edit-product'),
                breadcrumb: check('.q-edit-product__breadcrumb'),
                statusBadge: check('.q-edit-product__status'),
                nameInput: check('input[name="name"]'),
                categorySelect: check('select[name="categoryId"]'),
                priceInput: check('input[name="price"]'),
                descriptionCount: check('.q-edit-product__character-count'),
                descriptionResize: (() => {
                  const textarea = document.querySelector('textarea[name="description"]');
                  return textarea ? getComputedStyle(textarea).resize === 'vertical' : false;
                })(),
                descriptionMaxWidth: (() => {
                  const textarea = document.querySelector('textarea[name="description"]');
                  return textarea ? getComputedStyle(textarea).maxWidth === '100%' : false;
                })(),
                productImages: check('.q-edit-product__images-panel'),
                primaryImage: check('.q-edit-product__primary-badge'),
                cancelButton: check('.q-edit-product__cancel-btn'),
                updateButton: check('.q-edit-product__save-btn'),
                deleteButton: check('.q-edit-product__delete-btn'),
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

        if (route.name === 'reports' || route.name === 'admin-reports') {
          const background = await page.evaluate(() => {
            const section = document.querySelector('.q-reports-page');
            if (!section) return null;
            const style = getComputedStyle(section, '::before');
            return {
              top: section.getBoundingClientRect().top + Number.parseFloat(style.top),
              image: style.backgroundImage,
              headerZIndex: Number.parseInt(
                getComputedStyle(document.querySelector('.q-header')).zIndex,
                10
              ),
            };
          });
          if (!background || background.top > 1 || background.image === 'none') {
            combo.errors.push('BACKGROUND_GAP: reports background does not extend behind header');
          } else if (!Number.isFinite(background.headerZIndex) || background.headerZIndex <= 0) {
            combo.errors.push('HEADER_NOT_OVER_BACKGROUND: fixed header stacking order is invalid');
          }
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

        if (route.name === 'cart') {
          await page
            .locator('.q-cart-item:first-child .q-quantity-selector__btn--increase')
            .click();
          await page.waitForFunction(
            () => document.querySelector('.q-quantity-selector__input')?.value === '2',
            { timeout: 5000 }
          );
          const increasedTotals = await page.evaluate(() => ({
            subtotal: document.querySelector('.q-cart__summary-rows .q-cart__summary-value')
              ?.textContent,
            shipping: document.querySelectorAll('.q-cart__summary-rows .q-cart__summary-value')[1]
              ?.textContent,
            total: document.querySelector('.q-cart__summary-row--total .q-cart__summary-value')
              ?.textContent,
          }));
          if (increasedTotals.subtotal !== 'US$ 58.00')
            combo.errors.push(`QUANTITY_SUBTOTAL_NOT_UPDATED: ${increasedTotals.subtotal}`);
          if (increasedTotals.shipping !== 'Gratis')
            combo.errors.push(`FREE_SHIPPING_NOT_UPDATED: ${increasedTotals.shipping}`);
          if (increasedTotals.total !== 'US$ 58.00')
            combo.errors.push(`QUANTITY_TOTAL_NOT_UPDATED: ${increasedTotals.total}`);

          await page.locator('[data-product-id="p-cart-cafe"] .q-cart-item__remove').click();
          await page.waitForFunction(() => document.querySelectorAll('.q-cart-item').length === 2, {
            timeout: 5000,
          });
          const removedTotals = await page.evaluate(() => ({
            subtotal: document.querySelector('.q-cart__summary-rows .q-cart__summary-value')
              ?.textContent,
            shipping: document.querySelectorAll('.q-cart__summary-rows .q-cart__summary-value')[1]
              ?.textContent,
            total: document.querySelector('.q-cart__summary-row--total .q-cart__summary-value')
              ?.textContent,
          }));
          if (removedTotals.subtotal !== 'US$ 46.00')
            combo.errors.push(`REMOVE_SUBTOTAL_NOT_UPDATED: ${removedTotals.subtotal}`);
          if (removedTotals.shipping !== 'US$ 4.99')
            combo.errors.push(`REMOVE_SHIPPING_NOT_UPDATED: ${removedTotals.shipping}`);
          if (removedTotals.total !== 'US$ 50.99')
            combo.errors.push(`REMOVE_TOTAL_NOT_UPDATED: ${removedTotals.total}`);

          await page.locator('.q-cart__checkout').click();
          await page.waitForFunction(() => window.location.pathname === '/checkout', {
            timeout: 5000,
          });
          await page.goBack();
          await page.waitForSelector('.q-cart__clear', { timeout: 5000 });
          await page.locator('.q-cart__clear').click();
          await page.waitForSelector('.q-cart__empty', { timeout: 5000 });
          await page.locator('.q-cart__empty .q-cart__continue').click();
          await page.waitForFunction(() => window.location.pathname === '/products', {
            timeout: 5000,
          });
        } else if (route.name === 'seller-product-new') {
          await page.locator('input[name="name"]').fill('Producto de matriz');
          await page.locator('input[name="price"]').fill('24.99');
          await page.select('select[name="categoryId"]', 'cat-electronics');
          await page.locator('.q-seller-product-form__submit-btn').click();
          await page.waitForSelector('.q-seller-product-form__images-panel', { timeout: 5000 });

          const draftPhase = await page.evaluate(() => ({
            fieldsLocked: Array.from(
              document.querySelectorAll(
                '.q-seller-product-form__form input, .q-seller-product-form__form select, .q-seller-product-form__form textarea'
              )
            ).every((field) => field.disabled),
            imagesVisible: Boolean(document.querySelector('.q-seller-product-form__images-panel')),
            publishDisabled: document.querySelector('.q-seller-product-form__publish-btn')
              ?.disabled,
            horizontalOverflow:
              document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
          }));
          if (!draftPhase.fieldsLocked) combo.errors.push('DRAFT_PHASE_FIELDS_NOT_LOCKED');
          if (!draftPhase.imagesVisible) combo.errors.push('DRAFT_PHASE_IMAGES_NOT_VISIBLE');
          if (!draftPhase.publishDisabled)
            combo.errors.push('DRAFT_PHASE_PUBLISH_SHOULD_BE_DISABLED');
          if (draftPhase.horizontalOverflow) combo.errors.push('DRAFT_PHASE_HORIZONTAL_OVERFLOW');

          await page.evaluate(() => window.scrollTo(0, 0));
          const draftFile = join(OUT_DIR, `${route.name}-${theme}-${vp.name}-draft.png`);
          await page.screenshot({ path: draftFile, fullPage: true });

          await page.evaluate(() => {
            const input = document.querySelector('.q-seller-product-form__file-input');
            const transfer = new window.DataTransfer();
            transfer.items.add(
              new window.File(['matrix-image'], 'matrix.png', { type: 'image/png' })
            );
            input.files = transfer.files;
            input.dispatchEvent(new window.Event('change', { bubbles: true }));
          });
          await page.waitForSelector('.q-seller-product-form__primary-badge', { timeout: 5000 });
          await page.locator('.q-seller-product-form__image-remove').click();
          await page.waitForFunction(
            () => !document.querySelector('.q-seller-product-form__image-confirm')?.hidden,
            { timeout: 5000 }
          );
          const confirmBounds = await page.evaluate(() => {
            const thumb = document
              .querySelector('.q-seller-product-form__thumb')
              .getBoundingClientRect();
            const confirm = document
              .querySelector('.q-seller-product-form__image-confirm')
              .getBoundingClientRect();
            const buttons = Array.from(
              document.querySelectorAll('.q-seller-product-form__image-confirm button')
            ).map((button) => button.getBoundingClientRect());
            return {
              overlayFitsThumb:
                confirm.left >= thumb.left &&
                confirm.top >= thumb.top &&
                confirm.right <= thumb.right &&
                confirm.bottom <= thumb.bottom,
              buttonsFitOverlay: buttons.every(
                (button) =>
                  button.left >= confirm.left &&
                  button.top >= confirm.top &&
                  button.right <= confirm.right &&
                  button.bottom <= confirm.bottom
              ),
            };
          });
          if (!confirmBounds.overlayFitsThumb) combo.errors.push('DELETE_CONFIRM_OVERFLOWS_THUMB');
          if (!confirmBounds.buttonsFitOverlay)
            combo.errors.push('DELETE_CONFIRM_BUTTONS_OVERFLOW');
          await page.evaluate(() => window.scrollTo(0, 0));
          const confirmFile = join(OUT_DIR, `${route.name}-${theme}-${vp.name}-delete-confirm.png`);
          await page.screenshot({ path: confirmFile, fullPage: true });
        }
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
const screenshotCount =
  results.length + results.filter((result) => result.route === 'seller-product-new').length * 2;
console.log(`  ${screenshotCount} screenshots across ${results.length} matrix combinations`);

// Write machine-readable report
writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
console.log('  report.json written');

// Exit code 1 if any failure — CI-friendly
if (fail > 0) process.exit(1);
console.log(`\n[MATRIX] OK — ${results.length} combinations from ${BASE}`);
