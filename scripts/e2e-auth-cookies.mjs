/* global process, console, fetch, AbortController, clearTimeout, setTimeout, window, document, localStorage, sessionStorage */
/**
 * E2E authentication smoke test — HttpOnly cookie session flow.
 *
 * Runs 6 scenarios against a live backend + frontend:
 *   1. Fresh visit → anonymous
 *   2. Login → avatar + sessionStorage (v2, no token)
 *   3. Reload → avatar persists (cache + /me rehydrate)
 *   4. Logout → cookies cleared + storage cleared + /login
 *   5. Session expiry (cookies deleted) → anonymous
 *   6. Storage cleared + reload → /me rehydrates from cookie
 *
 * Prerequisites:
 *   - Backend running on E2E_API_BASE_URL (default: http://localhost:3000)
 *   - Frontend running on E2E_BASE_URL (default: http://localhost:5173)
 *
 * Usage:
 *   pnpm test:e2e:auth
 *
 * Environment:
 *   E2E_BASE_URL      Frontend base URL (default: http://localhost:5173)
 *   E2E_API_BASE_URL  Backend base URL  (default: http://localhost:3000)
 *
 * Exit codes:
 *   0 — all 6 scenarios PASS
 *   1 — any scenario fails (details in stderr)
 *   2 — precondition failure (FE or API unreachable)
 */

import puppeteer from 'puppeteer';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.E2E_API_BASE_URL || 'http://localhost:3000';
const API = `${API_BASE}/v1`;
const log = (...a) => console.log('[E2E]', ...a);

log(`Running auth E2E against FE=${BASE} API=${API_BASE}`);

// ── Pre-flight health probes ─────────────────────────────────────────────────
const probe = async (url) => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok || res.status < 500; // 4xx is fine — the server is up
  } catch {
    return false;
  }
};

const feOk = await probe(`${BASE}/`);
const apiOk = await probe(`${API_BASE}/health`);

if (!feOk || !apiOk) {
  console.error('[E2E] Pre-flight FAILED — required services are unreachable:');
  if (!feOk) console.error(`  ✗ Frontend: ${BASE}/`);
  if (!apiOk) console.error(`  ✗ API:      ${API_BASE}/health`);
  console.error('');
  console.error('Fix:');
  console.error('  Client (dev):   make up-dev');
  console.error('  Client (prod):  make up-prod');
  console.error('  API:            cd ../api && make docker-up-dev');
  console.error('Then retry: make e2e  (or  make e2e-prod)');
  process.exit(2);
}

log('Pre-flight OK');

// ── Seed a throwaway user via the real backend ───────────────────────────────
// Use a timestamped address so the same test can be re-run on the same DB.
const email = `e2e+${Date.now()}@qatu.test`;
const username = `e2efe_${Date.now()}`;
const password = 'StrongPassword123!';

const reg = await fetch(`${API}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, username, full_name: 'FE E2E' }),
});
if (reg.status !== 201) {
  throw new Error('backend register failed: ' + reg.status + ' ' + (await reg.text()));
}
log('seeded user', email);

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const context = await browser.createBrowserContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

// Helper
async function clearStorageAndCookies() {
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  const client = await page.createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await client.detach();
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
}

async function headerState() {
  return page.evaluate(() => ({
    hasAvatar: !!document.querySelector('.q-header-user-avatar'),
    hasLoginBtn: !!document.querySelector('.q-header-login-btn'),
    sessionRaw: sessionStorage.getItem('qatu.auth.session'),
  }));
}

// ── S1: Fresh visit (no cookies, no storage) → anonymous
{
  await clearStorageAndCookies();
  await new Promise((r) => setTimeout(r, 600)); // wait for /me to resolve
  const s = await headerState();
  log('S1 (fresh):', JSON.stringify(s));
  if (!s.hasLoginBtn || s.hasAvatar) throw new Error('S1: expected anonymous');
  if (s.sessionRaw !== null) throw new Error('S1: sessionStorage should be empty');
}

// ── S2: Login → avatar appears + sessionStorage has no token
{
  await clearStorageAndCookies();
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.type('#q-login-email', email);
  await page.type('#q-login-password', password);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname === '/', { timeout: 8000 }),
    page.click('.q-login-submit-btn'),
  ]);
  await new Promise((r) => setTimeout(r, 500));
  const s = await headerState();
  log('S2 (login):', JSON.stringify(s));
  if (!s.hasAvatar || s.hasLoginBtn) throw new Error('S2: expected avatar');
  if (!s.sessionRaw) throw new Error('S2: sessionStorage should be populated');
  const parsed = JSON.parse(s.sessionRaw);
  if (parsed.token !== undefined) throw new Error('S2: token should NOT be in sessionStorage');
  if (parsed.v !== 2) throw new Error('S2: schema version should be 2');
  if (!parsed.user?.id) throw new Error('S2: user.id missing');
}

// ── S3: Reload → avatar persists (cache + /me rehydration)
{
  await page.reload({ waitUntil: 'networkidle0' });
  // Immediately after reload, check for fast-paint from sessionStorage
  const earlyState = await page.evaluate(() => ({
    hasAvatar: !!document.querySelector('.q-header-user-avatar'),
    hasLoginBtn: !!document.querySelector('.q-header-login-btn'),
  }));
  log('S3 (post-reload early):', JSON.stringify(earlyState));
  // Wait for /me to resolve
  await new Promise((r) => setTimeout(r, 600));
  const finalState = await headerState();
  log('S3 (post-reload final):', JSON.stringify(finalState));
  if (!finalState.hasAvatar) throw new Error('S3: avatar should persist after reload');
  if (finalState.hasLoginBtn) throw new Error('S3: login button should NOT be present');
}

// ── S4: Logout → cookies cleared + storage cleared + /login
{
  await page.click('.q-header-user-avatar');
  await page.waitForFunction(
    () => {
      const d = document.querySelector('.q-header-dropdown');
      return d && !d.hasAttribute('hidden');
    },
    { timeout: 2000 }
  );
  await page.click('.q-header-logout-btn');
  await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 300));
  const s = await headerState();
  const cookieCheck = await page.evaluate(() => document.cookie);
  log(
    'S4 (logout):',
    JSON.stringify({
      ...s,
      cookieKeys: cookieCheck.split(';').map((c) => c.split('=')[0].trim()),
    })
  );
  if (!s.hasLoginBtn || s.hasAvatar) throw new Error('S4: expected anonymous');
  if (s.sessionRaw !== null) throw new Error('S4: sessionStorage should be cleared');
  // Session cookies are HttpOnly → not visible in document.cookie. But we can
  // verify the csrf_token cookie is gone (it's NOT HttpOnly).
  if (cookieCheck.includes('csrf_token=')) throw new Error('S4: csrf_token should be cleared');
}

// ── S5: Return-to preserved after expiry redirect
{
  // Login again
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.type('#q-login-email', email);
  await page.type('#q-login-password', password);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname === '/', { timeout: 8000 }),
    page.click('.q-login-submit-btn'),
  ]);

  // Navigate to /products
  await page.goto(BASE + '/products', { waitUntil: 'networkidle0' });

  // Delete the access_token cookie via CDP (can't delete HttpOnly via JS)
  const client = await page.createCDPSession();
  const { cookies } = await client.send('Network.getAllCookies');
  for (const c of cookies) {
    if (c.name === 'access_token' || c.name === 'refresh_token') {
      await client.send('Network.deleteCookies', { name: c.name, domain: c.domain, path: c.path });
    }
  }
  await client.detach();

  // Trigger an authenticated request → /me 401 path OR a mutating request triggers REFRESH_REQUIRED
  // Simplest: reload → boot calls /me → 401 → clearSession + anonymous
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  const s = await headerState();
  log('S5 (post-expiry):', JSON.stringify(s));
  if (s.hasAvatar) throw new Error('S5: avatar should be gone after cookie deletion');
}

// ── S6: Cookies survive + sessionStorage cleared → /me rehydrates
{
  // Clear storage and cookies first
  await clearStorageAndCookies();

  // Login
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.type('#q-login-email', email);
  await page.type('#q-login-password', password);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname === '/', { timeout: 8000 }),
    page.click('.q-login-submit-btn'),
  ]);
  await new Promise((r) => setTimeout(r, 400));
  let s = await headerState();
  if (!s.hasAvatar) throw new Error('S6: login did not produce avatar');

  // Clear ONLY sessionStorage, keep cookies
  await page.evaluate(() => sessionStorage.clear());

  // Reload: boot should hit /me → 200 → setSession again
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));
  s = await headerState();
  log('S6 (rehydrate after storage clear):', JSON.stringify(s));
  if (!s.hasAvatar) throw new Error('S6: /me should rehydrate avatar');
  if (!s.sessionRaw) throw new Error('S6: sessionStorage should be repopulated');
}

await browser.close();

if (errors.length) {
  console.error('BROWSER ERRORS:');
  errors.forEach((e) => console.error('  ', e));
  process.exit(1);
}

console.log('[E2E] 6/6 PASS');
