# Troubleshooting

## 4.1 pnpm Issues

- **Lockfile conflicts, peer dependency warnings, cache issues:**
  Run the following to prune and reinstall dependencies:
  ```bash
  pnpm store prune
  rm -rf node_modules pnpm-lock.yaml && pnpm install
  ```

## 4.2 Node.js Issues

- **Version mismatch:** Ensure you are using Node 26.
  ```bash
  nvm use
  ```
- **ESM import errors:** Ensure `"type": "module"` is in `package.json`.

## 4.3 Vite Issues

- **Dev server not starting:** Check if port 5173 is in use.
- **Proxy errors:** Verify configurations in `vite.config.js`.
- **Build failures:** Check code for syntax errors.
- **Clear cache:**
  ```bash
  rm -rf node_modules/.vite
  ```

## 4.4 Bulma Issues

- **Styles not applied:** Verify Bulma is imported in `src/main.js`.
- **Custom styles overridden by Bulma:** Ensure `views/styles/main.css` is imported _after_ Bulma.
- **Dark mode not working:** Verify `data-theme` attribute on the `<html>` element.

## 4.5 Jasmine Issues

- **Browser not found:** Install Chrome or configure Puppeteer.
- **Test timeouts:** Increase timeout in `jasmine.json`.
- **Headless configuration:** Verify `spec/support/jasmine-browser.json`.

## 4.6 Husky Issues

- **Hooks not running:** Make them executable:
  ```bash
  chmod +x .husky/*
  ```
- **Permission denied:** Run `pnpm prepare`.

## 4.7 ESLint / Prettier Issues

- **Conflicting rules:** Ensure `eslint-config-prettier` is last in `eslint.config.js`.
- **Ignored files:** Check `.prettierignore` and `.eslintignore` (if present).

## 4.8 Supabase Issues

- **Missing environment variables:** Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.

## Styling

- **Tokens not applied:** Verify that `tokens.css` is imported in `src/main.js` before `semantic.css`. Check that `pnpm tokens:build` ran successfully.
- **Bulma overrides not working:** Ensure `bulma-overrides.css` is imported after `bulma.css` and `tokens.css`.
- **Fonts not loading:** Check the network tab in the browser. If using Inter from Google Fonts, ensure the network is available. If using Geist locally, verify the font files exist in `src/assets/fonts/`.
- **Dark mode not switching:** Verify the `data-theme` attribute on `<html>`. Inspect `semantic.css` to confirm dark tokens are defined.
- **Style Dictionary errors:** Ensure `tokens.json` is valid DTCG. Run `pnpm tokens:build` with `--verbose` for details.

## 4.9 General Tips

- Clear caches, restart the dev server, check the Node version.
- Reset the environment using:
  ```bash
  make clean && make install
  ```

## Auth (Cookie-Based Session)

- **User is unexpectedly logged out on refresh (or after a route change)**:
  - Open DevTools → Application → Cookies → verify `access_token`, `refresh_token`, and `csrf_token` exist on the API origin (`http://localhost:3000`).
  - If they are missing, the backend login/register call likely failed. Check the Network tab for `Set-Cookie` headers on the login response.
  - If they exist but the UI is anonymous: `sessionStorage.getItem('qatu.auth.session')` should be a JSON blob with `v: 2` and `user.id`. If empty, boot's `GET /auth/me` may be failing. Check the Network tab for `/v1/auth/me`.
  - Run `curl -i -X GET http://localhost:3000/v1/auth/me -b 'access_token=...'` manually to isolate backend vs frontend.

- **`401 REFRESH_REQUIRED` loops / infinite refresh**:
  - `apiFetch` retries **once** after `/auth/refresh`. If the retry still returns 401, it clears the session and emits `qatu:auth-expired`. If you see loops, verify `/auth/refresh` is NOT itself returning `401 REFRESH_REQUIRED` (it should return plain 401 when the refresh token is dead).
  - Check the `refresh_token` cookie exists; Supabase rotates it on every refresh. If a proxy or CDN strips `Set-Cookie` on `/auth/refresh`, the rotation is lost and the next refresh fails.

- **CSRF errors (`403 INVALID_CSRF_TOKEN`)**:
  - The `csrf_token` cookie is NOT HttpOnly — verify it's visible in `document.cookie` after login.
  - `apiFetch` attaches `X-CSRF-Token` on `POST`/`PATCH`/`PUT`/`DELETE` for non-`/auth/*` paths only. `/auth/*` is exempt per the backend contract.
  - After a successful `/auth/refresh`, the CSRF cookie rotates. `apiFetch` rebuilds the header for the retried request — verify in the Network tab that the retried request has the FRESH token, not the stale one.

- **CORS preflight error (`blocked by CORS policy`, `Access-Control-Allow-Headers`)**:
  - The backend `corsMiddleware.allowedHeaders` must include `Content-Type`, `Authorization`, `X-CSRF-Token`, `Accept`. If a request is rejected at the OPTIONS preflight, this is the cause.
  - Verify with: `curl -X OPTIONS http://localhost:3000/v1/cart/items -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type,x-csrf-token'`

- **Cookies not persisting / "logged in" but every request is 401**:
  - If `NODE_ENV=production` in the backend but you're on HTTP, `Secure` cookies are silently rejected by the browser. Use HTTPS or set `NODE_ENV=development` locally.
  - `SameSite=Strict` requires same-site frontend and backend. Verify both are on `localhost`, or both on the same registrable domain. See `.docs/ARCHITECTURE.md` §"SameSite=Strict deployment requirement".

- **Logout doesn't clear the session**:
  - `main.js#onLogoutClick` calls `authApi.logout()` first (best-effort) then `authStore.clearSession()`. If the API call fails, a warning is logged and the local clear still runs. Check console for `[main] logout API call failed`.
  - Verify the backend `/auth/logout` returns `Set-Cookie: access_token=; Max-Age=0` etc. If it doesn't, the cookie remains valid despite local state being cleared.
