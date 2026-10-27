# Qatu Marketplace Frontend Client

![CI Status](https://img.shields.io/badge/CI-Passing-brightgreen)

Frontend client for the Qatu Marketplace, a digital marketplace for buyers and sellers. Built as the capstone project for Jala University SD4.

## Tech Stack

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

## Prerequisites

- Node.js v26.x
- pnpm v11.x

## Getting Started

1. Clone the repository
2. Run `make install` (or `pnpm install`)
3. Copy `.env.example` to `.env` and fill in the values
4. Run `make dev` (or `pnpm dev`) to start the development server

## Available Scripts

Run `make help` to see all available scripts.

## Project Structure

See [.docs/ARCHITECTURE.md](.docs/ARCHITECTURE.md) for details on the MVVM folder structure.

## Design System

The visual design system is documented in the Wiki and in `.docs/DESIGN-SYSTEM.md`. Design tokens are authored in Figma and exported as DTCG JSON.

### Regenerating Design Tokens

When tokens change in Figma:

1. Export the updated `tokens.json` from Figma.
2. Replace `src/views/styles/tokens/tokens.json`.
3. Run `pnpm tokens:build` to regenerate `tokens.css`.
4. Commit both `tokens.json` and `tokens.css`.

The Figma source: [Q-atu Design System](https://www.figma.com/design/CdDUOKZHnmoPbvgxMolUNE/Q-atu?node-id=9-1370&m=dev&t=Ybulw0EgYe4IZW5j-1)

## Documentation

Detailed documentation is available in the `.docs/` directory:

- [Architecture](.docs/ARCHITECTURE.md) — MVVM pattern, components, folder structure, cross-cutting concerns, and testing strategy.
- [Design System](.docs/DESIGN-SYSTEM.md) — Overview of design tokens, token build pipeline, Bulma overrides, fonts, and dark mode.
- [Troubleshooting](.docs/TROUBLESHOOTING.md) — Common issues with pnpm, Node.js, Vite, Bulma, Jasmine, Husky, ESLint, and Supabase.
- [Git Rules](.docs/GIT_RULES.md) — Branching strategy (GitFlow), commit message convention (Conventional Commits), merge request guidelines, and remote configuration.

## License

MIT
