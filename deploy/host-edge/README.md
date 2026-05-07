# Host Nginx edge (Option B)

This path uses **Nginx installed on the host OS** (Debian/Ubuntu package from `install-debian.sh`), **not** the Nginx containers inside your Docker Compose files — **unless** you use the **hybrid** layout in **§2b**, where host Nginx owns public **80/443** and Suhani’s **Docker** Nginx still handles `www.deelbot.com` on a loopback port.

With **`USE_HOST_EDGE_PROXY=1`**, Suhani merges `docker-compose.host-edge.yml` so stack **nginx** / **certbot** stay in a disabled profile and **only** host Nginx binds public **80/443**.

One Nginx on the VPS listens on **80** and **443**. It proxies:

| Hostname | Upstream |
|----------|----------|
| `deelbot.com`, `www.deelbot.com` | `127.0.0.1:3001` (control plane), **or** hybrid: `127.0.0.1:9080` (Suhani Docker Nginx → CP) — see **§2b** |
| `*.deelbot.ai` | `127.0.0.1:3000` (Suhani container) |

Public URLs need **no port** (`https://www.deelbot.com`, `https://aohomes.deelbot.ai`).

## 1. Install host Nginx (Debian/Ubuntu)

From the **Suhani** repo on the server:

```bash
sudo ./deploy/host-edge/install-debian.sh
sudo ufw allow 80,443/tcp
sudo ufw reload
```

The script drops `nginx/deelbot-edge.conf` into `/etc/nginx/conf.d/` and creates a **self-signed** SAN cert so Nginx can start. Browsers will warn until you use Let’s Encrypt.

## 2. Point Docker apps at loopback

**Suhani** `.env.production` (or `.env`):

```env
USE_HOST_EDGE_PROXY=1
SUHANI_APP_PORTS=127.0.0.1:3000:3000
# Leave both BLANK in multi-tenant (*.deelbot.ai) — the shared Nuxt build is
# served to every tenant subdomain. NUXT_PUBLIC_API_BASE defaults to "/api"
# (same-origin); NUXT_PUBLIC_SITE_URL is derived per-request from the Host
# header. Setting either to an absolute URL pins every tenant to that one
# host → CORS errors and broken SEO. See deploy/suhani.env.example.
NUXT_PUBLIC_API_BASE=
NUXT_PUBLIC_SITE_URL=
CONTROL_PLANE_URL=http://host.docker.internal:3001
```

**Control plane** `.env.production`:

```env
USE_HOST_EDGE_PROXY=1
CP_APP_PORTS=127.0.0.1:3001:3001
NUXT_PUBLIC_SITE_URL=https://www.deelbot.com
MARKETING_SITE_URL=https://www.deelbot.com
SUHANI_API_URL=http://host.docker.internal:3000
```

`./scripts/deploy.sh` reads `USE_HOST_EDGE_PROXY=1` and merges `docker-compose.host-edge.yml` plus sets the loopback port defaults if the variables above are unset.

### 2b. Hybrid: host Nginx owns public :80/:443, Suhani **Docker** Nginx serves `www.deelbot.com`

Use this when Suhani’s **container** `nginx` receives **HTTP** on a **non-standard host port** (default **9080** → container **:80**) and **host** Nginx still terminates browser TLS on **:443** with the `deelbot.com` certificate.

**Traffic path:** browser → **host :443** (Let’s Encrypt `www.deelbot.com`) → **`http://127.0.0.1:<HTTP_PORT>`** → Suhani Docker Nginx (`deelbot-com` vhost) → **`host.docker.internal:3001`** (control plane). Only the browser↔host leg is TLS; the hop to Docker Nginx is plain HTTP on loopback.

---

#### A. Which Compose files to use (Suhani)

Use **exactly** these files for `docker compose` / `./scripts/deploy.sh`:

- `docker-compose.yml`
- `docker-compose.prod.yml`

**Do not** pass `-f docker-compose.host-edge.yml`. That file assigns the stack **`nginx`** and **`certbot`** services to a Compose **profile** so, with a normal `up -d`, those services **do not start**. That is intended for “classic” host edge (§2), but **for hybrid you must have the Suhani `nginx` container running.**

**`USE_HOST_EDGE_PROXY` (read carefully)**

`./scripts/deploy.sh` merges host-edge **only when** it reads **`USE_HOST_EDGE_PROXY=1`** from `.env.production` (it then adds `-f docker-compose.host-edge.yml` to every compose invocation).

For hybrid you **must not** enable that:

- **Remove** the line `USE_HOST_EDGE_PROXY=1`, **or**
- Set **`USE_HOST_EDGE_PROXY=0`**, **or**
- Leave the variable **unset** / empty.

Only the literal value **`1`** turns on the host-edge overlay. Anything else → **no** `docker-compose.host-edge.yml` → **`nginx` starts** with the rest of prod.

**Hand-run equivalent** (from the Suhani repo root):

```bash
docker compose --env-file .env.production \
  -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Sanity check:** `docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml ps` must show **`nginx` running**. On the host, **`ss -tlnp 'sport = :9080'`** (or your HTTP port) should show **docker-proxy** bound to **127.0.0.1** if you use the recommended `NGINX_PUBLISH_HTTP_HOST_PORT` below.

---

#### B. Suhani `.env.production` (hybrid)

Paste and adjust only the ports if needed:

```env
# --- Hybrid with host Nginx (§2b): do NOT set USE_HOST_EDGE_PROXY=1 ---
USE_HOST_EDGE_PROXY=0

# Suhani app container: loopback only so only Nginx on the host reaches it.
SUHANI_APP_PORTS=127.0.0.1:3000:3000

# Port numbers used when *_HOST_PORT is not set (defaults are fine).
NGINX_PUBLISH_HTTP_PORT=9080
NGINX_PUBLISH_HTTPS_PORT=9443

# Recommended: publish Docker Nginx only on loopback (not on the public NIC).
# docker-compose.prod.yml uses: "${NGINX_PUBLISH_HTTP_HOST_PORT}:80" etc.
# Value is Docker’s host side: "ip:hostPort" before the ":80" container port.
NGINX_PUBLISH_HTTP_HOST_PORT=127.0.0.1:9080
NGINX_PUBLISH_HTTPS_HOST_PORT=127.0.0.1:9443
```

**If you omit `NGINX_PUBLISH_HTTP_HOST_PORT`:** Compose falls back to **`NGINX_PUBLISH_HTTP_PORT`** (e.g. **`9080`**), and Docker listens on **`0.0.0.0:9080`**, which is **reachable from the internet**. For hybrid, **set `NGINX_PUBLISH_HTTP_HOST_PORT=127.0.0.1:9080`** so only **host** Nginx can use that hop.

**Host Nginx must match the port number:** In `/etc/nginx/conf.d/deelbot-edge.conf`, `upstream deelbot_com_docker_http` uses **`127.0.0.1:9080`**. The **9080** is the **host port** — the same number as after **`127.0.0.1:`** in `NGINX_PUBLISH_HTTP_HOST_PORT`. If you change it in `.env`, change the `upstream` to the same port and run `sudo nginx -t && sudo systemctl reload nginx`.

---

#### C. Host Nginx (`DEELBOT_COM_PROXY_MODE=docker`)

```bash
cd ~/opt/apps/suhani
sudo DEELBOT_COM_PROXY_MODE=docker ./deploy/host-edge/install-debian.sh
```

That installs the Docker-hop snippet and reloads host Nginx. For **direct** `127.0.0.1:3001` (no Suhani Docker Nginx in the middle), use `DEELBOT_COM_PROXY_MODE=direct` (default).

---

#### D. `deelbot.ai` tenants

Unchanged: **`suhani_app`** → `127.0.0.1:3000`. Only **`www.deelbot.com` / `deelbot.com`** use `deelbot-com-https-docker.inc` when mode is `docker`.

---

#### E. Let’s Encrypt for `deelbot.com`

Still on the **host**: `./deploy/host-edge/issue-le-certs.sh`. Verify with `openssl s_client -servername www.deelbot.com -connect www.deelbot.com:443`.

## 3. Redeploy both stacks

```bash
cd ~/opt/apps/suhani && ./scripts/deploy.sh
cd ~/opt/apps/saas-control-plane && ./scripts/deploy.sh
```

**Classic host edge** (`USE_HOST_EDGE_PROXY=1` in Suhani / CP `.env.production`): `deploy.sh` adds `docker-compose.host-edge.yml`; Suhani’s **Nginx + Certbot** containers stay off (Compose profile) so they do not bind host **80/443**.

**Hybrid (§2b):** set **`USE_HOST_EDGE_PROXY=0`** (or unset) in **Suhani** `.env.production` before `./scripts/deploy.sh` so **host-edge is not merged** and Suhani’s **`nginx` container stays on**. Control plane may still use `USE_HOST_EDGE_PROXY=1` if you want CP without its published edge — follow CP’s own docs; typical hybrid is Suhani `nginx` on **9080**, CP on **3001** loopback.

## 4. Let’s Encrypt (replace bootstrap certs)

TLS paths live in **snippet files** (not in the main conf): `/etc/nginx/snippets/deelbot-com.ssl.inc` and `deelbot-ai.ssl.inc`. `install-debian.sh` installs bootstrap (self-signed) lines; **`issue-le-certs.sh`** runs Certbot and rewrites those snippets to `/etc/letsencrypt/live/...`, then reloads Nginx.

### Control plane (`deelbot.com`) — HTTP-01

```bash
cd ~/opt/apps/suhani
sudo CERTBOT_EMAIL=you@deelbot.com ./deploy/host-edge/issue-le-certs.sh --deelbot-com-only
```

Or issue **both** `deelbot.com` and `deelbot.ai` in one run (default):

```bash
sudo CERTBOT_EMAIL=you@deelbot.com ./deploy/host-edge/issue-le-certs.sh
```

### Tenant subdomains (`*.deelbot.ai`)

**Zone apex vs wildcard:** In Cloudflare, an **`A` record named `*`** points `anything.deelbot.ai` at your server but **does not** publish **`deelbot.ai`** itself. Let’s Encrypt’s default run includes **`-d deelbot.ai`**, which needs a public **A (or AAAA) for `@` / the apex** (same IP as your tenants). Add **Type A, Name `@`, Content your VPS IP**, or skip apex on the cert (below).

**Option A — HTTP-01 (no wildcard):** every hostname on the certificate must resolve to this server (port 80 for challenges).

Subdomains **only** (no apex record — matches a `*` + `aohomes`-style setup):

```bash
sudo CERTBOT_EMAIL=you@deelbot.com \
  DEELBOT_AI_INCLUDE_APEX=0 \
  DEELBOT_AI_EXTRA_DOMAINS="aohomes.deelbot.ai" \
  ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only
```

Apex **plus** tenants (after you add **A @** for `deelbot.ai`):

```bash
sudo CERTBOT_EMAIL=you@deelbot.com \
  DEELBOT_AI_EXTRA_DOMAINS="aohomes.deelbot.ai" \
  ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only
```

Add more space-separated names to `DEELBOT_AI_EXTRA_DOMAINS` as you onboard tenants. The issuer **merges existing DNS SANs** from the current `deelbot-ai` certificate into the next HTTP-01 request (unless `DEELBOT_AI_PRESERVE_EXISTING_SANS=0`), which avoids accidentally **dropping** hostnames that were already on the cert. It does **not** restore names that are already missing from the cert — add those via `DEELBOT_AI_EXTRA_DOMAINS` or use a wildcard cert.

**Option B — Wildcard `*.deelbot.ai` (recommended for many tenants):** Covers **every** subdomain (`foo.deelbot.ai`, `aohomes.deelbot.ai`, …) without re-running Certbot per host. Uses **DNS-01**: Certbot creates temporary `_acme-challenge` TXT records in Cloudflare via an API token.

1. **Create a Cloudflare API token** (not your account password):
   - Cloudflare dashboard → your profile (avatar) → **My Profile** → **API Tokens** → **Create Token**.
   - Use template **“Edit zone DNS”** *or* **Create Custom Token** with:
     - **Permissions:** Zone → DNS → **Edit**
     - **Zone resources:** Include → **Specific zone** → **deelbot.ai**
   - Create the token and copy it once (you won’t see it again).

2. **Credentials file on the VPS** (only root should read it):

   ```bash
   sudo install -d -m 0700 /root/.secrets
   sudo sh -c 'printf "dns_cloudflare_api_token = PASTE_TOKEN_HERE\n" > /root/.secrets/cloudflare.ini'
   sudo chmod 0600 /root/.secrets/cloudflare.ini
   ```

   Replace `PASTE_TOKEN_HERE` with the token string (no quotes).

3. **Issue / replace the `deelbot-ai` cert** with apex + wildcard (same name `deelbot-ai` as before — this **replaces** your previous HTTP-01 cert for that name):

   ```bash
   cd /opt/apps/suhani   # or your repo path
   sudo CLOUDFLARE_CREDENTIALS=/root/.secrets/cloudflare.ini \
     CERTBOT_EMAIL=info@deelbot.com \
     ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only --deelbot-ai-wildcard
   ```

   The script installs `python3-certbot-dns-cloudflare`, requests **`-d deelbot.ai`** and **`-d '*.deelbot.ai'`**, updates `/etc/nginx/snippets/deelbot-ai.ssl.inc`, and reloads Nginx.

4. **Renewal:** `certbot renew` uses the same DNS plugin and token file — **no** HTTP on port 80 needed for renewals of this cert. Keep `/root/.secrets/cloudflare.ini` in place; run `sudo certbot renew --dry-run` after setup.

**Security:** Use a token scoped **only** to zone **deelbot.ai** and **DNS Edit** — not a global account API key.

### Renewal

`/etc/letsencrypt/renewal-hooks/deploy/99-reload-nginx.sh` reloads Nginx after renewals. Check with:

```bash
sudo certbot renew --dry-run
```

### “Connection refused” on port 80 (HTTP-01)

Let’s Encrypt hits **`http://your-domain:80/.well-known/...` on your VPS’s public IP**. If the CA sees **connection refused**, nothing on this machine is accepting **TCP 80** from the internet (or a firewall is rejecting it).

1. **Host Nginx running**  
   `sudo systemctl status nginx` → `active (running)`. If not: `sudo nginx -t && sudo systemctl start nginx`.

2. **UFW (or similar)**  
   `sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload`  
   Check: `sudo ufw status`.

3. **Cloud / provider firewall**  
   Hetzner Cloud, AWS SG, etc. must allow **inbound TCP 80** (and 443) to the instance.

4. **Docker must not take port 80**  
   With Option B, Suhani / control-plane stacks should use **`USE_HOST_EDGE_PROXY=1`** so container Nginx is **not** publishing **80** on the host (only the OS Nginx should).

5. **Re-run the issuer** (after fixing):  
   `sudo CERTBOT_EMAIL=... ./deploy/host-edge/issue-le-certs.sh`

6. **404 on `/.well-known/acme-challenge/`** (preflight or Let’s Encrypt):  
   Usually **Ubuntu’s `sites-enabled` default** is still answering for `Host: www.deelbot.com` with `root /var/www/html`. Run **`install-debian.sh` again** (it clears `sites-enabled/*`), ensure **`/etc/nginx/snippets/deelbot-acme.inc`** exists, then `sudo cp .../deploy/host-edge/nginx/deelbot-edge.conf /etc/nginx/conf.d/deelbot-edge.conf && sudo nginx -t && sudo systemctl reload nginx`.

`issue-le-certs.sh` runs a **preflight** before Certbot. Use `--skip-preflight` only if you know what you’re doing.

### `ERR_CERT_COMMON_NAME_INVALID` on `something.deelbot.ai`

The **deelbot-ai** Let’s Encrypt certificate must list **every** tenant hostname (or **`*.deelbot.ai`** via DNS-01). A cert that only covers **`deelbot.ai`** is valid for the apex only — **not** for `aohomes.deelbot.ai`, so Chrome shows **Your connection is not private**.

This is unrelated to **deelbot.com** TLS; it is only the **`.ai`** lineage.

**Fix (pick one):**

1. **HTTP-01 — add each tenant** (space-separated, re-run when you add a host):

   ```bash
   cd ~/opt/apps/suhani
   sudo DEELBOT_AI_EXTRA_DOMAINS="aohomes.deelbot.ai" ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only
   ```

   Include **all** subdomains you need on one line (long-term, prefer wildcard below).

2. **DNS-01 wildcard** (`*.deelbot.ai` + apex) — Cloudflare token + `--deelbot-ai-wildcard` (see §4 Option B above).

**Going forward:** `issue-le-certs.sh` **merges DNS names already on the current `deelbot-ai` certificate** into the next HTTP-01 request (unless `DEELBOT_AI_PRESERVE_EXISTING_SANS=0`), so a full run is less likely to **drop** existing tenants. It **does not invent** names that are no longer on the cert — if the live cert was already reduced to apex-only, set `DEELBOT_AI_EXTRA_DOMAINS` once (or switch to wildcard).

### `504 Gateway Time-out` on `deelbot.com` / `www.deelbot.com` (hybrid)

Host Nginx proxies **HTTPS** for `www.deelbot.com` to **`http://127.0.0.1:9080`** (Suhani Docker Nginx), which should proxy to the control plane on **`host.docker.internal:3001`**. A **504** means that hop did not return a response in time (or never connected).

On the VPS:

```bash
# 1) Suhani stack nginx + app up?
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml ps

# 2) Loopback port matches upstream in /etc/nginx/conf.d/deelbot-edge.conf ?
curl -sS -o /dev/null -w "%{http_code}\n" --max-time 5 \
  -H "Host: www.deelbot.com" http://127.0.0.1:9080/

# 3) Control plane answering on the host?
curl -sS -o /dev/null -w "%{http_code}\n" --max-time 5 http://127.0.0.1:3001/

# 4) From inside Suhani nginx container → host CP
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml exec nginx \
  wget -qO- --timeout=3 http://host.docker.internal:3001/ | head -c 200 || true
```

If **(2)** fails: fix `NGINX_PUBLISH_HTTP_HOST_PORT` / `9080` and host **`upstream deelbot_com_docker_http`**. If **(2)** works but browser 504s, check **host** `proxy_read_timeout` vs app cold start; if **(3)** fails, start the CP stack; if **(3)** works but **(4)** fails, **`host.docker.internal`** / `extra_hosts` in compose is wrong for that container.

## 5. Tenant vanity domains

Add `server { ... }` blocks on the host (e.g. a new file under `/etc/nginx/conf.d/`) or reuse patterns from `nginx/conf.d/custom-domains.conf` in the Suhani repo.
