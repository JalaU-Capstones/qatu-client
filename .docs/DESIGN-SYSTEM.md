# Design System

## Overview

The Qatu Marketplace Design System establishes a unified visual and interactive foundation across the entire frontend application. It bridges the gap between design in Figma and code implementation in Vanilla JavaScript and Bulma CSS. By centralizing design tokens, typography, semantic color roles, and dark mode theming, the design system ensures visual consistency, rapid development, accessibility compliance, and maintainable styling architecture.

For complete design specifications and component patterns, refer to the Wiki at `Architecture/UI-Design-System`.

## Source

The authoritative design source is maintained in Figma:

- **Figma File:** [Q-atu Design System](https://www.figma.com/design/CdDUOKZHnmoPbvgxMolUNE/Q-atu?node-id=9-1370&m=dev&t=Ybulw0EgYe4IZW5j-1)

Design tokens are exported from Figma into Design Tokens Community Group (DTCG) compliant JSON format.

## Token Pipeline

Design tokens flow from Figma into CSS custom properties through an automated build pipeline powered by **Style Dictionary**:

1. **Authoring & Export:** Design tokens are authored in Figma and exported to `src/views/styles/tokens/tokens.json`.
2. **Build Configuration:** `style-dictionary.config.js` configures token resolution, transform rules (including kebab-case naming and duration units), and output formatting.
3. **Compilation:** Running `pnpm tokens:build` (or `make tokens-build`) processes `tokens.json` and outputs `src/views/styles/tokens/tokens.css`.
4. **CSS Custom Properties:** Tokens are output as `--q-` prefixed CSS variables under `:root`.

### Regenerating Tokens

When tokens are updated in Figma:

```bash
# 1. Replace src/views/styles/tokens/tokens.json with the new export from Figma
# 2. Run the build command:
pnpm tokens:build
# 3. Commit both tokens.json and the updated tokens.css
```

## File Structure

The styling architecture is organized under `src/views/styles/`:

```
src/views/styles/
├── tokens/
│   ├── tokens.json     (Figma export - do not edit manually)
│   └── tokens.css      (generated via Style Dictionary - do not edit manually)
├── semantic.css        (semantic token mapping + light/dark theme definitions)
├── fonts.css           (font face definitions and typography defaults)
├── bulma-overrides.css (Bulma variable overrides mapped to Qatu tokens)
└── main.css            (project-specific styles, container layouts, and utilities)
```

## Load Order in `main.js`

Styles are imported into `src/main.js` in a deliberate cascade order:

```javascript
// 1. Base CSS framework
import 'bulma/css/bulma.css';

// 2. Design tokens (generated from Figma)
import './views/styles/tokens/tokens.css';

// 3. Semantic tokens and theme definitions
import './views/styles/semantic.css';

// 4. Font definitions
import './views/styles/fonts.css';

// 5. Bulma overrides mapped to tokens
import './views/styles/bulma-overrides.css';

// 6. Custom project styles
import './views/styles/main.css';
```

### Why Order Matters

1. **Bulma CSS** provides the baseline CSS reset and component rules.
2. **`tokens.css`** declares primitive custom properties (`--q-ds-blue-600`, `--q-radius-md`, etc.) available globally on `:root`.
3. **`semantic.css`** maps primitive tokens to contextual roles (`--q-color-primary`, `--q-bg-page`) for `:root`, `[data-theme="light"]`, and `[data-theme="dark"]`.
4. **`fonts.css`** loads the font families (`Inter`) and applies primary font settings to `body`.
5. **`bulma-overrides.css`** aligns Bulma's CSS variables (`--bulma-primary-*`, `--bulma-radius`, focus rings) to the Qatu design tokens.
6. **`main.css`** defines custom utility classes, containers, and application-specific styles that can leverage everything above.

## Adding a New Token

To add or update design tokens:

1. Follow the token lifecycle defined in the Wiki (`Architecture/UI-Design-System`).
2. Update the token in Figma first to ensure design and code remain in sync.
3. Export the updated DTCG JSON into `src/views/styles/tokens/tokens.json`.
4. Run `pnpm tokens:build`.
5. If the token represents a semantic role (e.g., surface, border, action), add or update the corresponding mapping in `src/views/styles/semantic.css` for both light and dark modes.
6. Never edit `tokens.json` or `tokens.css` manually.

## Dark Mode

The design system supports light and dark themes using semantic tokens and the `data-theme` attribute on the `<html>` root element.

- **Light Mode (Default):** Set `data-theme="light"` on `<html>`.
- **Dark Mode:** Set `data-theme="dark"` on `<html>`.

### Toggling via JavaScript

```javascript
// Switch to dark theme
document.documentElement.setAttribute('data-theme', 'dark');

// Switch to light theme
document.documentElement.setAttribute('data-theme', 'light');

// Check current theme
const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
```

In `semantic.css`, colors adapt dynamically:

- Page background (`--q-bg-page`) shifts from white to dark charcoal (`--q-ds-background-100`).
- Text foreground (`--q-fg-primary`) shifts from near black (`--q-color-gray-950`) to light gray (`--q-ds-gray-1000`).
- Borders, surfaces, and interactive states adjust accordingly to maintain WCAG contrast.

## Accessibility

- **Focus Rings:** All interactive elements (`.button`, `.input`, `.select select`, `.textarea`, `a`) receive an explicit `:focus-visible` outline (`2px solid var(--q-color-focus)` with `2px` offset) to support keyboard navigation.
- **Reduced Motion:** In `main.css`, the `@media (prefers-reduced-motion: reduce)` media query overrides all transition and animation durations to `0.01ms` and sets scroll behavior to `auto`.
- **Contrast Ratios:** Text colors (`--q-fg-primary`, `--q-fg-secondary`, `--q-fg-muted`) and background colors meet WCAG AA contrast standards in both light and dark themes.
- **Screen Readers:** The `.q-sr-only` utility hides content visually while keeping it accessible to assistive technology.

## Naming Conventions

- **CSS Custom Properties:** All custom properties are prefixed with `--q-` (e.g., `--q-color-primary`, `--q-bg-page`, `--q-radius-md`, `--q-font-sans`) to prevent namespace collisions with Bulma's `--bulma-*` variables or third-party styles.
- **Utility and Custom Classes:** All custom utility and layout classes are prefixed with `q-` (e.g., `.q-container`, `.q-container-wide`, `.q-sr-only`, `.q-shadow-md`, `.q-transition`).

## Layout & Containers

- Standard content max-width: `1200px` (`--q-geist-page-width`), horizontal padding `24px` (`--q-geist-page-margin`).
- Wide layouts (dashboards): `1400px`.
- **Header and Footer currently use `max-width: 1400px` hardcoded.** They should be aligned to `1200px` in a future pass for visual consistency with sections that use `.q-section-container`. Tracked as a follow-up task.
- **Token units gotcha:** Style Dictionary exports `number`-typed tokens without units. Always wrap them with `calc(... * 1px)` in CSS. Example:

  ```css
  max-width: calc(var(--q-geist-page-width, 1200) * 1px);
  ```

  Using them directly without `calc()` produces invalid CSS that gets silently ignored.

## Troubleshooting

- **Tokens not applied:** Verify that `tokens.css` is imported in `src/main.js` before `semantic.css`. Check that `pnpm tokens:build` ran successfully.
- **Bulma overrides not working:** Ensure `bulma-overrides.css` is imported after `bulma.css` and `tokens.css` in `src/main.js`.
- **Fonts not loading:** Check the network tab in browser developer tools. Ensure internet connectivity to load Google Fonts, or verify local font assets.
- **Dark mode not switching:** Verify the `data-theme` attribute on the `<html>` tag (`<html data-theme="dark">`). Inspect elements in DevTools to confirm `semantic.css` rules are active.
- **Style Dictionary build errors:** Ensure `tokens.json` contains valid DTCG JSON. Run `pnpm tokens:build` to see detailed compiler output.
