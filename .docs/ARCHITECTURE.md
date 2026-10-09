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
