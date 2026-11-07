.PHONY: help install network up-dev up-prod down logs build clean dev test lint format tokens e2e matrix

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
