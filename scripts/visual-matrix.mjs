/* global process, console, window, document, setTimeout */
/**
 * Visual matrix E2E — 4 routes × 2 themes × 3 viewports = 24 combinations.
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
 * Requires: puppeteer (already a devDependency).
 */
import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.MATRIX_BASE_URL || 'http://localhost:5173';
const OUT_DIR = '/tmp/qatu-matrix';
mkdirSync(OUT_DIR, { recursive: true });

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
  { name: 'catalog', path: '/products' },
];

const THEMES = ['light', 'dark'];

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

/** @type {{route:string, theme:string, viewport:string, status:'PASS'|'FAIL', errors:string[]}[]} */
const results = [];

const browser = await puppeteer.launch({ headless: 'new' });

for (const route of ROUTES) {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const combo = { route: route.name, theme, viewport: vp.name, status: 'PASS', errors: [] };
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push('PAGEERROR: ' + e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') pageErrors.push('CONSOLE-ERR: ' + m.text());
      });

      await page.setViewport({ width: vp.width, height: vp.height });

      // Set theme before navigation so first paint is themed
      await page.evaluateOnNewDocument((t) => {
        try { window.localStorage.setItem('qatu.theme', t); } catch { /* ignore */ }
      }, theme);

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
            case 'catalog':
              return {
                header: check('.q-header'),
                catalogSection: check('.q-catalog'),
                grid: check('.q-catalog__grid'),
                footer: check('.q-footer'),
              };
            default:
              return {};
          }
        }, route.name);

        const missing = Object.entries(keyCheck).filter(([, ok]) => !ok).map(([k]) => k);
        if (missing.length > 0) {
          combo.errors.push('MISSING_ELEMENTS: ' + missing.join(','));
        }

        // ── Validation 3: no non-empty alt in product images (leak guard)
        const altLeak = await page.evaluate(() => {
          const imgs = document.querySelectorAll('.q-product-card-photo');
          return Array.from(imgs).filter((img) => (img.getAttribute('alt') || '').length > 0).length;
        });
        if (altLeak > 0) {
          combo.errors.push(`ALT_TEXT_LEAK: ${altLeak} img with non-empty alt`);
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
          combo.errors.push(...pageErrors);
        }
        await page.close();
      }

      if (combo.errors.length > 0) combo.status = 'FAIL';
      results.push(combo);
      console.log(
        `[${combo.status}] ${route.name.padEnd(8)} ${theme.padEnd(5)} ${vp.name.padEnd(8)}` +
          (combo.errors.length ? ' → ' + combo.errors.join(' | ') : '')
      );
    }
  }
}

await browser.close();

// ── Executive summary
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;

console.log('\n══════════════════════════════════════════');
console.log(`  MATRIX SUMMARY: ${pass}/${results.length} PASS, ${fail} FAIL`);
console.log('══════════════════════════════════════════');
if (fail > 0) {
  console.log('\nFailures:');
  results.filter((r) => r.status === 'FAIL').forEach((r) => {
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
console.log('\n[MATRIX] OK');
