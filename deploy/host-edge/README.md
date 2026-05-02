# Host Nginx edge (Option B)

This path uses **Nginx installed on the host OS** (Debian/Ubuntu package from `install-debian.sh`), **not** the Nginx containers inside your Docker Compose files. Those stay off when `USE_HOST_EDGE_PROXY=1` so **only one** process owns public **80/443** on the machine.

One Nginx on the VPS listens on **80** and **443**. It proxies:

| Hostname | Upstream |
|----------|----------|
| `deelbot.com`, `www.deelbot.com` | `127.0.0.1:3001` (control plane container) |
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

## 3. Redeploy both stacks

```bash
cd ~/opt/apps/suhani && ./scripts/deploy.sh
cd ~/opt/apps/saas-control-plane && ./scripts/deploy.sh
```

Stack **Nginx + Certbot** containers stay off (Compose profile) so they do not bind host 80/443.

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

Add more space-separated names to `DEELBOT_AI_EXTRA_DOMAINS` as you onboard tenants (re-run the same command with `--expand` behavior: Certbot updates the existing `deelbot-ai` cert when you pass the full domain list — you may need to include **all** previous SANs plus new ones, or use `certbot certonly --cert-name deelbot-ai --webroot ...` with a complete `-d` set).

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

## 5. Tenant vanity domains

Add `server { ... }` blocks on the host (e.g. a new file under `/etc/nginx/conf.d/`) or reuse patterns from `nginx/conf.d/custom-domains.conf` in the Suhani repo.
