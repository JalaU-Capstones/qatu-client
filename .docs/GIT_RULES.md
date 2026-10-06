# Git Rules

## Branching Strategy (GitFlow)

- `main`: Production-ready code.
- `develop`: Integration branch for features.
- `feature/*`: New features or user stories (e.g., `feature/US-01-login`).
- `release/*`: Release preparation.
- `hotfix/*`: Urgent production fixes.

## Commit Messages

Use Conventional Commits:
`type(scope): subject`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Merge Requests

- Require at least 1 approval.
- CI must pass.
- Adhere to Definition of Done.

## Remotes

- `origin`: GitLab (Primary)
- `github`: GitHub (Mirror)
