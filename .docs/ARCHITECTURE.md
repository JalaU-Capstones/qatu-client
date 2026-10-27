# Architecture

## 2.1 Overview

Qatu Marketplace uses the MVVM (Model-View-ViewModel) pattern to strictly separate business logic, UI state, and presentation. This architecture improves testability and maintainability. It aligns with ADR-005 (backend) and the Wiki `Architecture/Frontend`.

## 2.2 MVVM Components

### Model

- **Purpose:** Manages data logic, business rules, and API communication.
- **Contents:** API clients (`models/api/`), DTOs (`models/entities/`), validation logic (`models/validation/`).
- **Dependencies:** Independent; doesn't depend on ViewModels or Views.
- **What does NOT belong here:** DOM manipulation, UI state management.

### View

- **Purpose:** Presentation layer representing the user interface.
- **Contents:** HTML/CSS, Bulma overrides (`views/styles/`), components (`views/components/`), pages (`views/pages/`).
- **Dependencies:** Depends on ViewModel via data binding.
- **What does NOT belong here:** API calls, business logic.

### ViewModel

- **Purpose:** Acts as an intermediary, holding the UI state and handling interactions.
- **Contents:** Component ViewModels (`viewmodels/components/`), page ViewModels (`viewmodels/pages/`).
- **Dependencies:** Depends on Models.
- **What does NOT belong here:** Direct DOM updates.

## 2.3 Supporting Components

- **Router (`router/`):** Client-side routing.
- **Store (`store/`):** Custom observable store or pub/sub pattern for shared state.
- **Utils (`utils/`):** Pure utility functions with no side effects.
- **Assets (`assets/`):** Static assets (images, fonts, icons).

## 2.4 Folder Structure

```
src/
├── models/
│   ├── api/           # API clients using Fetch
│   ├── entities/      # Plain objects matching API DTOs
│   └── validation/    # Client-side validation rules
├── views/
│   ├── components/    # Reusable UI components (HTML + CSS)
│   ├── pages/         # Page-level views
│   └── styles/        # Custom CSS (Bulma overrides, design tokens)
├── viewmodels/
│   ├── components/    # ViewModels for components
│   └── pages/         # ViewModels for pages
├── router/            # Client-side routing
├── store/             # Shared state management
├── utils/             # Utility functions
├── assets/            # Static assets
└── main.js            # Entry point
```

## 2.5 Cross-Cutting Concerns

- **Authentication:** Supabase Auth is used. JWTs are stored in memory, not localStorage.
- **HTTP Communication:** Fetch API is used via clients in `models/api/`.
- **State Management:** Custom store handles global state (e.g., authenticated user, cart).
- **Routing:** Client-side routing maps URLs to Views and ViewModels.
- **Responsive Design:** Bulma's grid and responsive classes are utilized.
- **Error Handling:** Errors from API clients propagate to ViewModels and are displayed in Views.
- **Validation:** `models/validation/` is used for form validation.
- **Styling:** Bulma is imported globally, with overrides in `views/styles/`.

### Styling Architecture

Styles are layered in the following order:

1. **Bulma CSS** — Base component framework.
2. **Design tokens (`tokens.css`)** — Generated from Figma via Style Dictionary.
3. **Semantic tokens (`semantic.css`)** — Map primitives to semantic names, define light and dark themes.
4. **Fonts (`fonts.css`)** — Font face definitions.
5. **Bulma overrides (`bulma-overrides.css`)** — Align Bulma variables with Qatu tokens.
6. **Custom styles (`main.css`)** — Project-specific utilities and component styles.

The full design system is documented in `Architecture/UI-Design-System` in the Wiki.

## 2.6 Routes and Pages

The client uses a small History API router (`src/router/Router.js`) that supports
static paths and dynamic segments. Handlers receive `(path, params)`, so a route
such as `/products/:id` can read `params.id` without changing the signature used
by the existing static routes.

| Route           | View                | ViewModel                                  | Data source                         |
| --------------- | ------------------- | ------------------------------------------ | ----------------------------------- |
| `/`             | `HomeView`          | `FeaturedProductsViewModel`, component VMs | `ProductsApi.getFeaturedProducts()` |
| `/products`     | `CatalogView`       | `CatalogViewModel`                         | `ProductsApi.getProducts()`         |
| `/products/:id` | `ProductDetailView` | `ProductDetailViewModel`                   | `ProductsApi.getProductById()`      |
| `/cart`         | `CartView`          | `CartViewModel`                            | `cartStore`                         |
| `/login`        | `AuthPageView`      | `AuthViewModel`                            | `AuthApi`                           |
| `/register`     | `AuthPageView`      | `AuthViewModel`                            | `AuthApi`                           |

### Product detail and cart (frontend-only lab)

The product detail and shopping cart pages are currently a **frontend-only
wireframe**. They do not call the backend:

- `ProductsApi` exposes a local catalog of eight products with detail fields
  (`description`, `attributes`, `gallery`, `reviews`, `stock`, seller metadata).
  `getProductById(id)` returns one product and `getSimilarProducts(id, limit)`
  returns related in-stock products, prioritising the same category.
- `cartStore` (schema **v2**) stores product snapshots (`name`, `price`,
  `currency`, `imageUrl`, `seller`) plus the quantity. It persists to
  `localStorage` under `qatu.cart` for anonymous and authenticated visitors
  alike, and it is **not** cleared on login/logout.
- Totals are derived from the stored snapshots: subtotal, shipping and total.
  Shipping is free from `US$ 50`; below that a flat `US$ 4.99` applies.
- Adding to cart from Home, Catalog or the detail page writes directly into
  `cartStore`; no authentication gate or `CartService`/`CartApi` call is
  involved in the current shell.
- `CartService`, `CartApi` and `pendingCartActionStore` remain in the codebase
  (and keep their specs) for the future backend-backed flow, but the app shell
  no longer wires them.

When the backend cart endpoints are ready, the snapshot-based store can be
replaced or hydrated from `GET /cart` using the legacy `setFromGet` helper
without changing the Views.

## 2.7 Testing Strategy per Component

- **Models:** Unit tests with Jasmine, mocking Fetch API calls.
- **ViewModels:** Unit tests with Jasmine, mocking Models.
- **Views:** Integration tests with Jasmine + browser runner (DOM assertions).
- **Utils:** Pure unit tests.

## 2.8 Technology Stack

| Component     | Technology                               | ADR     |
| ------------- | ---------------------------------------- | ------- |
| Language      | HTML5, CSS3, Vanilla JavaScript (ES2022) | —       |
| Build Tool    | Vite                                     | ADR-007 |
| Architecture  | MVVM                                     | —       |
| CSS Framework | Bulma CSS                                | ADR-008 |
| Testing       | Jasmine                                  | ADR-006 |
| HTTP Client   | Fetch API                                | —       |
| Linting       | ESLint                                   | —       |
| Formatting    | Prettier                                 | —       |

## 2.9 Architecture Decision Records

- **ADR-001** to **ADR-004**: See Wiki for backend/general ADRs.
- **ADR-005**: Backend Architecture.
- **ADR-006**: Testing Framework (Jasmine).
- **ADR-007**: Build Tool (Vite).
- **ADR-008**: CSS Framework (Bulma CSS).

_Refer to the Wiki for full details._

## 2.10 References

- Wiki: `Architecture/Frontend`, `Architecture/Overview`, `Architecture/Testing-Strategy`.
- ADR-006, ADR-007, ADR-008.
