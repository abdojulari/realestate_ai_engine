# Production checklist: DNS, TLS, nginx, and custom domains

This guide is for **self-hosted** Suhani (Docker + nginx on your VPS). It ties together everything that must be true **outside the codebase** (mostly DNS) and what you configure **in the repo** (nginx, certs, env) so **subdomains** (`tenant.deelbot.ai`), the **control plane** (`deelbot.com`), and **tenant custom domains** (`aohomes.com`) all work.

For architecture context, see [MULTI-TENANT-SETUP.md](./MULTI-TENANT-SETUP.md). For which shell/Node **scripts** to run in production (deploy, cron, backfill), see [PRODUCTION-SCRIPTS.md](./PRODUCTION-SCRIPTS.md). Default published nginx ports (**9080/9443** vs **9081/9444**) are documented there so Suhani and the control plane can run on one host without editing compose by hand.

---

## 1. End-to-end picture

| Traffic | Typical DNS | TLS | Termination |
|--------|-------------|-----|----------------|
| Control plane (marketing, signup, billing) | `deelbot.com`, `www.deelbot.com` | Let’s Encrypt | nginx → control plane app |
| Tenant subdomains | `*.deelbot.ai` → server IP | Wildcard cert `*.deelbot.ai` | nginx → Suhani |
| Tenant custom domain | `tenant.com` → server IP | Per-domain (or SAN) cert | nginx → Suhani (extra `server` block) |

Suhani resolves the tenant from the **`Host`** header (subdomain under `APP_BASE_DOMAIN` or `TenantSettings.customDomain`). If TLS or nginx never sends traffic to Suhani with the right host, the app cannot fix that in code alone.

---

## 2. DNS (outside the repo)

Do this at your **DNS provider** (registrar, Cloudflare, etc.). Propagation can be minutes to 48 hours.

### 2.1 Server IP

Decide the **public IPv4** (and IPv6 if you use it) of the machine that runs Docker + nginx. All A/AAAA records below point here unless you use a load balancer (then point to the LB and terminate TLS there instead).

### 2.2 Control plane (`deelbot.com`)

- **`deelbot.com`** — **A** (or **AAAA**) → server IP.  
- **`www.deelbot.com`** — **A** / **AAAA** → same IP, or **CNAME** → `deelbot.com`.

These names must match what you put in **`NUXT_PUBLIC_SITE_URL`** / marketing URLs on the control plane and what nginx `server_name` uses in the **combined stack** (`deploy/nginx/nginx.conf`).

### 2.3 Tenant app wildcard (`*.deelbot.ai`)

- **`deelbot.ai`** — **A** / **AAAA** → server IP (optional but useful for apex).
- **`*.deelbot.ai` (wildcard)** — **A** / **AAAA** → **same** IP.

Wildcard DNS is required so **any** tenant subdomain (`acme.deelbot.ai`, `360realty.deelbot.ai`) resolves without creating a new DNS row per tenant.

> **Note:** Some providers implement wildcard as a single `*` record under the zone; others use a specific UI. Confirm with `dig +short randomname.deelbot.ai` once it should work.

### 2.4 Tenant custom domain (e.g. `aohomes.com`)

For each custom domain:

1. **Create the tenant subdomain** in the control plane / Suhani as usual (`aohomes.deelbot.ai` or similar).
2. Set **`customDomain`** to the vanity host (control plane signup toggle, **PATCH** `/api/tenants/:id`, or `scripts/add-custom-domain.mjs` in `saas-control-plane`).
3. **DNS for the vanity domain:**
   - **`aohomes.com`** — **A** (and **AAAA** if you use IPv6) → **same** IP as Suhani nginx, **or**
   - **CNAME** `www.aohomes.com` → `aohomes.deelbot.ai` (only if your provider allows CNAME at apex; many use **ALIAS/ANAME** or apex **A** instead).

There is **no** automatic worldwide DNS change from the apps: you must add these records yourself.

### 2.5 Verify DNS

```bash
dig +short deelbot.com
dig +short www.deelbot.com
dig +short test-tenant.deelbot.ai
dig +short aohomes.com
```

All should return the expected IP(s) before you rely on HTTPS or Let’s Encrypt.

---

## 3. TLS (Let’s Encrypt)

### 3.1 Wildcard `*.deelbot.ai`

Wildcard certificates usually need **DNS-01** validation (API token at your DNS host). **HTTP-01** does not issue `*.deelbot.ai` in one shot.

- Obtain cert and install under `/etc/letsencrypt/live/deelbot.ai/` (paths must match **`nginx/nginx.conf`** / **`deploy/nginx/nginx.conf`**).
- Ensure **renewal** is automated (`certbot renew` cron or the compose **certbot** sidecar).

### 3.2 `deelbot.com` (and `www`)

Use **HTTP-01** with webroot (same **`./certbot/www`** nginx serves) or DNS-01. Paths in nginx should match `/etc/letsencrypt/live/deelbot.com/`.

### 3.3 Custom tenant hostname (e.g. `aohomes.com`)

1. **DNS** must already point to your server (section 2.4).
2. Nginx must serve **HTTP-01** for **any** hostname on port 80 for the challenge path. This repo’s **default_server** on `:80` allows `/.well-known/acme-challenge/` under `/var/www/certbot` so you can get a cert **before** adding the HTTPS `server` block.
3. Run the helper (from Suhani repo root):

   ```bash
   ./scripts/issue-custom-domain-cert.sh you@example.com aohomes.com www.aohomes.com
   ```

   For the **combined** stack:

   ```bash
   COMPOSE_FILE=deploy/docker-compose.production.yml ./scripts/issue-custom-domain-cert.sh you@example.com aohomes.com www.aohomes.com
   ```

4. Copy the **HTTPS** `server { ... }` block from **`nginx/conf.d/custom-domains.conf.example`** into **`nginx/conf.d/custom-domains.conf`** (or the same paths under **`deploy/nginx/conf.d/`** for the stack). Use:

   `include /etc/nginx/snippets/suhani-tenant-server.inc;`

   Set `ssl_certificate` / `ssl_certificate_key` to `/etc/letsencrypt/live/<primary-domain>/...`.

5. Reload nginx:

   ```bash
   docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
   ```

Repeat for each **distinct** custom domain (or use one cert with **multiple `-d` names** / SAN).

### 3.4 Future: another base domain (e.g. `*.propertymatch.estate`)

- Point **wildcard DNS** for that zone to the same server.
- Obtain a **wildcard** cert for `*.propertymatch.estate` (DNS-01).
- Add an nginx `server` block with `server_name *.propertymatch.estate;` analogous to `*.deelbot.ai`, and set **`APP_BASE_DOMAIN=propertymatch.estate`** on **both** Suhani and the control plane so generated links and validation stay consistent.

---

## 4. Nginx and Docker (in the repo)

### 4.1 Standalone Suhani only

- Compose: **`docker-compose.prod.yml`**
- Main config: **`nginx/nginx.conf`** — includes **`/etc/nginx/conf.d/custom-domains.conf`**
- Editable per-tenant vhosts: **`nginx/conf.d/custom-domains.conf`**
- Shared proxy snippet: **`nginx/snippets/suhani-tenant-server.inc`**
- Volumes (already wired): `nginx.conf`, `conf.d/`, `snippets/`, `/etc/letsencrypt`, `certbot/www`, uploads

### 4.2 Combined stack (control plane + Suhani)

- Compose: **`deploy/docker-compose.production.yml`**
- Config: **`deploy/nginx/nginx.conf`** + **`deploy/nginx/conf.d/custom-domains.conf`** + **`deploy/nginx/snippets/suhani-tenant-server.inc`**

### 4.3 After any nginx edit

```bash
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
```

---

## 5. Environment variables (sanity check)

### Suhani

- **`APP_BASE_DOMAIN`** — must match the zone used for subdomains (e.g. `deelbot.ai`).
- **`NUXT_PUBLIC_SITE_URL`** / **`NUXT_PUBLIC_API_BASE`** — should reflect how **users** reach the app (often a canonical tenant URL or marketing URL; avoid mixing http/https wrongly).
- **`CONTROL_PLANE_URL`** — reachable from the Suhani container (e.g. `https://www.deelbot.com` public, or `http://control-plane:3001` on the internal Docker network in the combined stack).
- **`CONTROL_PLANE_API_KEY`** — must match what the control plane expects for server-to-server calls.

### SaaS control plane

- **`APP_BASE_DOMAIN`** — same tenant suffix as Suhani (e.g. `deelbot.ai`).
- **`NUXT_PUBLIC_SITE_URL`** — public URL of the control plane site.
- **`SUHANI_API_URL`** — URL the control plane uses to call Suhani (`http://suhani:3000` in the combined compose).

---

## 6. Data model (custom domain must match `Host`)

1. **Control plane** `Tenant.customDomain` = hostname users type (e.g. `aohomes.com`).
2. **Suhani** `TenantSettings.customDomain` — set at provision from the control plane, or updated in admin tenant settings / APIs.

If DNS and nginx send `Host: aohomes.com` but **`customDomain`** in the DB is missing or wrong, routing/branding/license lookup for that host will fail.

---

## 7. Verification checklist

| Step | Command / action |
|------|-------------------|
| DNS | `dig` / online DNS checker for each hostname |
| HTTP challenge path | `curl -I http://aohomes.com/.well-known/acme-challenge/test` (404 is ok if nginx handles path; connection refused = wrong IP / firewall) |
| TLS | `curl -I https://tenant.deelbot.ai` and `https://aohomes.com` |
| Cert names | `openssl s_client -connect aohomes.com:443 -servername aohomes.com </dev/null 2>/dev/null \| openssl x509 -noout -subject -dates` |
| Suhani health | `curl -fsS https://tenant.deelbot.ai/health` |
| Control plane | `curl -fsS https://deelbot.com/health` (if exposed) |
| License API | From server: `curl -s "https://<control-plane>/api/license/<subdomain-or-custom-domain>"` (with auth if required) |

---

## 8. Common failures

| Symptom | Likely cause |
|--------|----------------|
| `ERR_CONNECTION_REFUSED` | DNS points to wrong IP; firewall blocks 80/443; Docker not publishing ports |
| Certificate error / wrong hostname | Cert doesn’t cover that `server_name`; SNI mismatch |
| Let’s Encrypt HTTP-01 fails | Port 80 not reachable; challenge files not under `/var/www/certbot`; wrong webroot in certbot |
| Site loads but wrong tenant / 404 | `Host` not in `TenantSettings`; `APP_BASE_DOMAIN` mismatch; `customDomain` not set |
| `*.deelbot.ai` works, apex `deelbot.ai` does not | Missing **A** record for apex or no nginx `server_name` for apex |

---

## 9. Related scripts and files

| Item | Purpose |
|------|--------|
| `scripts/issue-custom-domain-cert.sh` | Let’s Encrypt HTTP-01 via webroot |
| `scripts/deploy.sh` | `standalone` / `stack` / `control-plane` deploy modes |
| `nginx/conf.d/custom-domains.conf` | Your live custom-domain `server` blocks |
| `nginx/conf.d/custom-domains.conf.example` | Template |
| `deploy/` | Combined nginx + compose for `deelbot.com` + `*.deelbot.ai` |
| `saas-control-plane/scripts/add-custom-domain.mjs` | Set `customDomain` + print DNS hints |

---

## 10. Order of operations (recommended)

1. Provision server; open **80** and **443** in the firewall.  
2. Point **DNS** for control plane + wildcard tenant zone to the server.  
3. Deploy stack; obtain **deelbot.com** and **\*.deelbot.ai** certificates; confirm nginx `nginx -t` and reload.  
4. Set **env** on both apps; run **migrations**; smoke-test signup and a tenant subdomain.  
5. For each **custom domain**: DNS → run **issue-custom-domain-cert.sh** → edit **custom-domains.conf** → reload nginx → confirm **`customDomain`** in DB matches the hostname.

Following this order avoids chasing TLS errors before DNS is correct.
