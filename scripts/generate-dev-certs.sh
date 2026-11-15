#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Qatu Client — Dev/staging self-signed SSL certificate generator
#
# DevOps Lab Week 3 - Work Item #5.
#
# Usage:
#   ./scripts/generate-dev-certs.sh              # auto-detect LAN IP
#   LAN_IP=192.168.1.42 ./scripts/generate-dev-certs.sh   # force IP
#
# Output:
#   nginx/certs/server.crt  (public cert, chmod 644 — dev only)
#   nginx/certs/server.key  (private key, chmod 644 — dev only, see SSL.md)
#
# The cert has:
#   CN  = <LAN_IP>
#   SAN = IP:<LAN_IP>, DNS:localhost, IP:127.0.0.1
#
# This allows access via:
#   https://<LAN_IP>:8443      (other devices on the LAN)
#   https://localhost:8443     (this machine)
#   https://127.0.0.1:8443     (loopback)
#
# DO NOT use in production. See .docs/SSL.md for the migration plan.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CERT_DIR="$REPO_ROOT/nginx/certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

# 1. Detect or prompt for the LAN IP
LAN_IP="${LAN_IP:-}"
if [ -z "$LAN_IP" ]; then
  # Try hostname -I first (Linux); fall back to `ip addr` if hostname is absent.
  # The `|| true` prevents pipefail from aborting on a missing `hostname` binary.
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi
if [ -z "$LAN_IP" ]; then
  # Fallback: parse the first non-loopback IPv4 from `ip addr`
  LAN_IP="$(ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -1 || true)"
fi
if [ -z "$LAN_IP" ]; then
  echo "Could not auto-detect LAN IP. Enter it manually (e.g. 192.168.1.42):"
  read -r LAN_IP
fi
if [ -z "$LAN_IP" ]; then
  echo "Error: LAN IP is required." >&2
  exit 1
fi
echo "Using LAN IP: $LAN_IP"

# 2. Create the directory
mkdir -p "$CERT_DIR"

# 3. Idempotence: do not overwrite existing certs (explicit is better)
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo ""
  echo "Certs already exist at: $CERT_DIR"
  echo "  $CERT_FILE"
  echo "  $KEY_FILE"
  echo ""
  echo "Remove them first to regenerate:"
  echo "  rm -f $CERT_FILE $KEY_FILE"
  exit 0
fi

# 4. Generate the cert
openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -subj "/CN=$LAN_IP" \
  -addext "subjectAltName=IP:$LAN_IP,DNS:localhost,IP:127.0.0.1"

# 5. Permissions — dev only (see .docs/SSL.md)
# The nginx `lb` container runs as uid 101 (nginx user). It must be able
# to read both files. 644 = world-readable. Acceptable for a self-signed
# dev cert; NEVER acceptable for production.
chmod 644 "$CERT_FILE"
chmod 644 "$KEY_FILE"

echo ""
echo "Generated:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"
echo ""
echo "Verify with:"
echo "  openssl x509 -in $CERT_FILE -noout -subject -ext subjectAltName"
