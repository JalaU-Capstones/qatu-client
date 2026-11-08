#!/usr/bin/env bash
# preflight-e2e.sh — Pre-flight health probe used by Makefile e2e / matrix targets.
#
# Usage:
#   ./scripts/preflight-e2e.sh dev    # probes :5173/ + :3000/health
#   ./scripts/preflight-e2e.sh prod   # probes :8080/healthz + :3000/health
#   ./scripts/preflight-e2e.sh dev-matrix   # probes :5173/ only (no API needed)
#   ./scripts/preflight-e2e.sh prod-matrix  # probes :8080/healthz only
#
# Exit 0 → all probes passed. Exit 1 → one or more services unreachable.
set -euo pipefail

MODE="${1:-dev}"
MISSING=()

probe() {
  curl -sf --max-time 3 "$1" >/dev/null 2>&1
}

case "$MODE" in
  dev)
    probe "http://localhost:5173/" || MISSING+=("http://localhost:5173/  (client dev — run: make up-dev)")
    probe "http://localhost:3000/health" || MISSING+=("http://localhost:3000/health  (api — run: cd ../api && make docker-up-dev)")
    ;;
  prod)
    probe "http://localhost:8080/healthz" || MISSING+=("http://localhost:8080/healthz  (client prod — run: make up-prod)")
    probe "http://localhost:3000/health" || MISSING+=("http://localhost:3000/health  (api — run: cd ../api && make docker-up-dev)")
    ;;
  dev-matrix)
    probe "http://localhost:5173/" || MISSING+=("http://localhost:5173/  (client dev — run: make up-dev)")
    ;;
  prod-matrix)
    probe "http://localhost:8080/healthz" || MISSING+=("http://localhost:8080/healthz  (client prod — run: make up-prod)")
    ;;
  *)
    echo "ERROR: unknown mode '${MODE}'. Use: dev | prod | dev-matrix | prod-matrix" >&2
    exit 1
    ;;
esac

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "═══════════════════════════════════════════════════════════════" >&2
  echo "ERROR: e2e pre-flight failed for mode '${MODE}'" >&2
  echo "═══════════════════════════════════════════════════════════════" >&2
  echo "" >&2
  echo "Unreachable:" >&2
  for url in "${MISSING[@]}"; do
    echo "  ✗ ${url}" >&2
  done
  echo "" >&2
  echo "Quick fix:" >&2
  echo "  Client (dev):   make up-dev" >&2
  echo "  Client (prod):  make up-prod" >&2
  echo "  API:            cd ../api && make docker-up-dev" >&2
  echo "" >&2
  echo "Then retry: make <target>" >&2
  exit 1
fi

echo "Pre-flight OK (${MODE})"
