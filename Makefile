.PHONY: help install dev build preview lint lint-fix format format-check test test-watch test-coverage clean

help:
	@echo "Available targets:"
	@echo "  install        - Install dependencies with pnpm"
	@echo "  dev            - Start Vite development server"
	@echo "  build          - Production build with Vite"
	@echo "  preview        - Preview production build"
	@echo "  lint           - Run ESLint"
	@echo "  lint-fix       - Run ESLint with auto-fix"
	@echo "  format         - Run Prettier"
	@echo "  format-check   - Check formatting"
	@echo "  test           - Run Jasmine tests in browser"
	@echo "  test-watch     - Run Jasmine tests in watch mode"
	@echo "  test-coverage  - Run Jasmine tests with coverage"
	@echo "  clean          - Remove node_modules, dist, and coverage"

install:
	pnpm install

dev:
	pnpm run dev

build:
	pnpm run build

preview:
	pnpm run preview

lint:
	pnpm run lint

lint-fix:
	pnpm run lint:fix

format:
	pnpm run format

format-check:
	pnpm run format:check

test:
	pnpm run test

test-watch:
	pnpm run test:watch

test-coverage:
	@echo "Coverage not yet configured"

clean:
	rm -rf node_modules dist coverage
