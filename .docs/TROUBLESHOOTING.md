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

## 4.9 General Tips

- Clear caches, restart the dev server, check the Node version.
- Reset the environment using:
  ```bash
  make clean && make install
  ```
