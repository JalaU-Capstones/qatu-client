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

- **Authentication:** Supabase Auth. Access and refresh JWTs live in **HttpOnly cookies** set by the backend (`access_token`, `refresh_token`). The frontend caches `{ user, profile, roles }` in `sessionStorage` under `qatu.auth.session` (schema v2) for optimistic UI paint — **no token is ever stored in JS-accessible storage**. See ADR-012. CSRF defense uses a double-submit cookie: a readable `csrf_token` cookie + an `X-CSRF-Token` header on mutating requests (handled transparently by `apiFetch`). Session rehydration on boot calls `GET /auth/me`; 401 → anonymous; network/5xx → preserves cached state.
- **HTTP Communication:** Fetch API is used via clients in `models/api/`.
- **State Management:** Custom store handles global state (e.g., authenticated user, cart).
- **Routing:** Client-side routing maps URLs to Views and ViewModels.
- **Responsive Design:** Bulma's grid and responsive classes are utilized.
- **Error Handling:** Errors from API clients propagate to ViewModels and are displayed in Views.
- **Validation:** `models/validation/` is used for form validation.
- **Styling:** Bulma is imported globally, with overrides in `views/styles/`.

### 2.5.1 Auth Flow (Cookie-Based)

The session lifecycle lives across four layers:

| Layer                                   | Responsibility                                                                                                                                                                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                                 | Sets `access_token` + `refresh_token` (HttpOnly, Secure-in-prod, SameSite=Strict) and `csrf_token` (readable) on login/register/refresh. Enforces auth via `authMiddleware` (cookie-first, Bearer fallback during migration).                                                                |
| `src/models/api/client.js` (`apiFetch`) | Sends `credentials: 'include'` always; attaches `X-CSRF-Token` on mutating non-`/auth/*` paths; on `401 REFRESH_REQUIRED` calls `/auth/refresh` and retries once; on other 401 clears session + emits `qatu:auth-expired`. Auth-path 401s propagate raw (bad credentials ≠ expired session). |
| `src/services/AuthBootstrapService.js`  | Called once on boot after the shell mounts. Fires `GET /auth/me` fire-and-forget. On success → `authStore.setSession`; on 401 → `clearSession`; on network/5xx → keeps the `sessionStorage` cache.                                                                                           |
| `src/store/authStore.js`                | Caches `{ user, profile, roles }` in `sessionStorage` (schema v2). No token. `isAuthenticated()` = `Boolean(user?.id)` — an optimistic signal, not a security check.                                                                                                                         |

#### SameSite=Strict deployment requirement

`SameSite=Strict` cookies are only sent when the frontend and backend share the same site (eTLD+1):

- **Valid:** `qatu.com` + `api.qatu.com` (same-site), `qatu.app` + `qatu.app/api` (reverse proxy), `localhost:5173` + `localhost:3000` (same-site)
- **Invalid:** `qatu.vercel.app` + `qatu-api.onrender.com` (cross-site → cookies dropped)

If production ever requires a cross-site deployment, change `sameSite` to `'none'` in the backend `cookieHelper.js` (requires HTTPS). The CSRF double-submit pattern already covers CSRF defense regardless of SameSite value.

See ADR-012 for the full rationale.

### Styling Architecture

Styles are layered in the following order:

1. **Bulma CSS** — Base component framework.
2. **Design tokens (`tokens.css`)** — Generated from Figma via Style Dictionary.
3. **Semantic tokens (`semantic.css`)** — Map primitives to semantic names, define light and dark themes.
4. **Fonts (`fonts.css`)** — Font face definitions.
5. **Bulma overrides (`bulma-overrides.css`)** — Align Bulma variables with Qatu tokens.
6. **Custom styles (`main.css`)** — Project-specific utilities and component styles.

The full design system is documented in `Architecture/UI-Design-System` in the Wiki.

## 2.6 Testing Strategy per Component

- **Models:** Unit tests with Jasmine, mocking Fetch API calls.
- **ViewModels:** Unit tests with Jasmine, mocking Models.
- **Views:** Integration tests with Jasmine + browser runner (DOM assertions).
- **Utils:** Pure unit tests.

## 2.7 Technology Stack

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

## 2.8 Architecture Decision Records

- **ADR-001** to **ADR-004**: See Wiki for backend/general ADRs.
- **ADR-005**: Backend Architecture.
- **ADR-006**: Testing Framework (Jasmine).
- **ADR-007**: Build Tool (Vite).
- **ADR-008**: CSS Framework (Bulma CSS).

_Refer to the Wiki for full details._

## 2.9 References

- Wiki: `Architecture/Frontend`, `Architecture/Overview`, `Architecture/Testing-Strategy`.
- ADR-006, ADR-007, ADR-008.
