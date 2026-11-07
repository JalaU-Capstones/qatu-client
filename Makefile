.PHONY: help install network up-dev up-prod down logs build clean dev test lint format tokens e2e e2e-prod matrix matrix-prod publish-check tag tag-push

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Docker:"
	@echo "  network   Create qatu-net if missing"
	@echo "  up-dev    Start client in dev mode (pnpm dev, port 5173)"
	@echo "  up-prod   Start client in prod mode (nginx, port CLIENT_PORT=8080)"
	@echo "  down      Stop and remove containers"
	@echo "  logs      Follow client logs"
	@echo "  build     Build the prod image"
	@echo "  clean     Down + remove volumes + local images"
	@echo ""
	@echo "Local:"
	@echo "  install   pnpm install --frozen-lockfile"
	@echo "  dev       Start Vite dev server (host, no Docker)"
	@echo "  test      Run Jasmine specs"
	@echo "  lint      Run ESLint"
	@echo "  format    Run Prettier write"
	@echo "  tokens    Regenerate design tokens"
	@echo ""
	@echo "Publish:"
	@echo "  publish-check  Sanity check registry paths before tagging"
	@echo "  tag            Create annotated v* tag locally"
	@echo "  tag-push       Push most recent v* tag to trigger workflows"
	@echo ""
	@echo "E2E:"
	@echo "  e2e            Auth cookie E2E against dev container  (FE :5173 + API :3000)"
	@echo "  e2e-prod       Auth cookie E2E against prod container (FE :8080 + API :3000)"
	@echo "  matrix         Visual regression matrix against dev container  (:5173)"
	@echo "  matrix-prod    Visual regression matrix against prod container (:8080)"

install:
	pnpm install --frozen-lockfile

network:
	@docker network inspect qatu-net >/dev/null 2>&1 || (echo "Creating qatu-net..." && docker network create qatu-net)

up-dev: network
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

up-prod: network
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

down:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

logs:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f client

build: network
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

clean: down
	docker image rm qatu-client:dev qatu-client:prod qatu-client:latest 2>/dev/null || true

dev:
	pnpm dev

test:
	pnpm test

lint:
	pnpm lint
	pnpm format:check

format:
	pnpm format

tokens:
	pnpm tokens:build

# ── Publish (post-merge only) ──

publish-check:                 # Sanity check registry paths before tagging
	@echo "GHCR path in workflow:"
	@grep -E 'ghcr\.io/[a-zA-Z0-9-]+/qatu-client' .github/workflows/publish-image.yml | head -3
	@echo ""
	@echo "GitLab CI uses \$$CI_REGISTRY_IMAGE (auto-resolves). Correct path:"
	@echo "  registry.gitlab.com/jala-university1/cohort-5/es.cssd-245.ga.t2.26.m2/sd/group-b/grupo-2/client"
	@grep -n 'CI_REGISTRY_IMAGE' .gitlab-ci.yml | head -3

tag:                           # Create annotated v0.1.0 tag (do NOT push from here)
	@read -p "Version (e.g. v0.1.0): " v && \
	git tag -a "$$v" -m "release: $$v" && \
	echo "Tag created locally: $$v. Push with: git push origin $$v"

tag-push:                      # Push the most recent v* tag (triggers both registries)
	@tag=$$(git describe --tags --abbrev=0) && \
	git push origin "$$tag" && \
	echo "Pushed $$tag — GHCR + GitLab Registry workflows are now running."

# ── E2E / Visual Matrix ──────────────────────────────────────────────────────

e2e:                           ## Auth cookie E2E against dev container (FE :5173 + API :3000)
	@./scripts/preflight-e2e.sh dev
	E2E_BASE_URL=http://localhost:5173 E2E_API_BASE_URL=http://localhost:3000 \
	  pnpm test:e2e:auth

e2e-prod:                      ## Auth cookie E2E against prod container (FE :8080 + API :3000)
	@./scripts/preflight-e2e.sh prod
	E2E_BASE_URL=http://localhost:8080 E2E_API_BASE_URL=http://localhost:3000 \
	  pnpm test:e2e:auth

matrix:                        ## Visual regression matrix against dev container (:5173)
	@./scripts/preflight-e2e.sh dev-matrix
	MATRIX_BASE_URL=http://localhost:5173 pnpm test:matrix

matrix-prod:                   ## Visual regression matrix against prod container (:8080)
	@./scripts/preflight-e2e.sh prod-matrix
	MATRIX_BASE_URL=http://localhost:8080 pnpm test:matrix
