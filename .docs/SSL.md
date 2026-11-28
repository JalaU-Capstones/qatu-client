# Self-signed SSL Certificates (Dev / Staging)

**DevOps Lab Week 3 - Work Item #5.**
**Scope:** dev / staging / local dev only.
**Production:** use a real CA (Let's Encrypt or corporate CA). See
[Migration to real CA](#migration-to-a-real-ca) below.

## What it does

The edge load balancer (`lb` nginx service) terminates TLS on port `443`
(host `8443`) with a self-signed certificate generated on the developer's
machine. The certificate's CN is the machine's LAN IP, so it's reachable
from other devices on the same network (phones, other laptops) — not just
`localhost`.

```
Browser ──HTTPS :8443──► lb (TLS termination) ──HTTP──► client:8080 ──HTTP──► api:3000
```

HTTP `:8080` is redirected to HTTPS (except `/healthz`, which the docker
healthcheck probes).

## Certificate generation

```bash
./scripts/generate-dev-certs.sh
```

The script:

- Auto-detects the LAN IP with `hostname -I | awk '{print $1}'`
  (falls back to `ip addr` if `hostname` is absent; override with
  `LAN_IP=192.168.1.42 ./scripts/generate-dev-certs.sh`).
- Generates a 2048-bit RSA key and a self-signed cert valid for 365 days.
- Writes to `nginx/certs/server.crt` and `nginx/certs/server.key`.
- Sets permissions `644` on both — **dev only**, because the nginx `lb`
  container (uid 101) needs read access. **Never do this in production.**

Cert contents:

- **CN:** the LAN IP
- **SAN:** `IP:<LAN_IP>, DNS:localhost, IP:127.0.0.1`
  (so `https://<LAN_IP>:8443`, `https://localhost:8443`, and
  `https://127.0.0.1:8443` all match the cert)

Regenerate after an IP change (e.g., new Wi-Fi network):

```bash
rm -f nginx/certs/server.crt nginx/certs/server.key
./scripts/generate-dev-certs.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart lb
```

## Bring up the stack

```bash
# 1. Generate certs (once per machine / after IP change)
./scripts/generate-dev-certs.sh

# 2. Build + start
make build   # or: docker compose -f docker-compose.yml -f docker-compose.prod.yml build
make up-prod

# 3. Verify
curl -k https://localhost:8443/healthz                  # → ok
curl -I http://localhost:8080/                          # → 301 → https://localhost:8443/
curl -k --tls-max 1.1 https://localhost:8443            # → TLS handshake failure
openssl x509 -in nginx/certs/server.crt -noout -subject -ext subjectAltName
```

**Important:** `nginx -t` / `docker compose up` **will fail** if
`nginx/certs/server.crt` is missing. Run the generation script first.

## Browser trust (import the cert)

The browser shows a "Not Secure" warning because the cert is self-signed.
This is expected. To make the warning go away (recommended for demos):

**Firefox:**

1. Open `https://localhost:8443` → "Advanced" → "Accept the Risk and Continue".
2. (Alternative) Settings → Privacy & Security → View Certificates →
   Authorities → Import → select `nginx/certs/server.crt` → Trust for
   websites.

**Chrome / Edge:**

1. Open `https://localhost:8443` → "Advanced" → "Proceed to localhost (unsafe)".
2. (Alternative) `chrome://settings/certificates` → Authorities → Import
   → select `nginx/certs/server.crt` → "Trust this certificate for
   identifying websites".

**iOS / Safari:**

1. Open `https://<LAN_IP>:8443` → "Show Details" → "visit this website".
2. For full trust: email yourself `server.crt`, install the profile,
   then Settings → General → About → Certificate Trust Settings → enable.

## TLS hardening

Current config (`nginx/lb.conf`):

- `ssl_protocols TLSv1.2 TLSv1.3` — TLS 1.0 and 1.1 are rejected.
- `ssl_ciphers HIGH:!aNULL:!MD5` — lab-adequate suite.
- `add_header Strict-Transport-Security "max-age=31536000"` — HSTS for 1 year.

**For production:** replace the cipher suite with Mozilla's
[recommended list](https://ssl-config.mozilla.org/):

```nginx
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
```

## Migration to a real CA

For staging / production, do **not** use a self-signed cert. Options:

### Let's Encrypt (public domains)

```bash
# Certbot on the host
sudo apt install certbot
sudo certbot certonly --standalone -d qatu.example.com
# Cert at /etc/letsencrypt/live/qatu.example.com/fullchain.pem
```

Mount the cert into `lb`:

```yaml
volumes:
  - /etc/letsencrypt/live/qatu.example.com:/etc/nginx/certs:ro
```

and update `lb.conf` paths (`fullchain.pem` / `privkey.pem`).

Auto-renewal via `systemd` timer or cron; restart `lb` after renewal.

### Corporate CA

Your org's PKI team issues a cert. Same mounting pattern as Let's Encrypt.

### ACME with DNS challenge

For non-public hosts, use `acme.sh` with a DNS provider.

## Cert rotation

- **Dev:** regenerate every ~330 days or after an IP change.
- **Staging / prod:** managed by the CA tooling (Certbot auto-renew, or
  corporate PKI rotation schedule). Watch the `expires` date:
  ```bash
  openssl x509 -in nginx/certs/server.crt -noout -dates
  ```

## Troubleshooting

### "nginx: [emerg] cannot load certificate ... No such file or directory"

You forgot to run `./scripts/generate-dev-certs.sh`. Do that first.

### Browser shows "Not Secure" — expected

Self-signed cert. Either accept the warning or import the cert (see
Browser trust above).

### "curl -k https://localhost:8443" works but from another device it doesn't

The other device is on a different subnet OR the LAN IP in the cert is
stale. Regenerate:

```bash
rm -f nginx/certs/*.{crt,key}
./scripts/generate-dev-certs.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart lb
```

### Redirect loop between 8080 and 8443

Check the `Location:` header from `curl -I http://localhost:8080`. It must
be `https://<host>:8443/`. If `lb.conf` has a hardcoded port that doesn't
match `CLIENT_HTTPS_PORT`, edit `lb.conf` accordingly.

## Production port strategy

- **Dev/staging:** `CLIENT_PORT=8080` (HTTP redirect) + `CLIENT_HTTPS_PORT=8443` (HTTPS).
- **Production:** `CLIENT_PORT=80` + `CLIENT_HTTPS_PORT=443`. Edit
  `lb.conf`'s redirect to `return 301 https://$host$request_uri;`
  (no port, defaults to 443).

## References

- [DevOps Lab Week 3 - Ticket #5](#5) (GitLab)
- ADR-016: Containerization
- ADR-018: DevOps Topology
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/
