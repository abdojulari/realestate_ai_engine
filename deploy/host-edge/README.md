# Host Nginx edge (Option B)

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
NUXT_PUBLIC_SITE_URL=https://YOUR_SUBDOMAIN.deelbot.ai
NUXT_PUBLIC_API_BASE=https://YOUR_SUBDOMAIN.deelbot.ai/api
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

**Option A — HTTP-01 (no wildcard):** include every hostname you need on the **deelbot-ai** certificate (each name must resolve here and serve `/.well-known/acme-challenge/` on port 80):

```bash
sudo CERTBOT_EMAIL=you@deelbot.com \
  DEELBOT_AI_EXTRA_DOMAINS="aohomes.deelbot.ai" \
  ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only
```

Add more space-separated names to `DEELBOT_AI_EXTRA_DOMAINS` as you onboard tenants (re-run the same command with `--expand` behavior: Certbot updates the existing `deelbot-ai` cert when you pass the full domain list — you may need to include **all** previous SANs plus new ones, or use `certbot certonly --cert-name deelbot-ai --webroot ...` with a complete `-d` set).

**Option B — Wildcard `*.deelbot.ai`:** HTTP-01 cannot validate `*`. Use DNS-01 with Cloudflare:

1. Create `/root/.secrets/cloudflare.ini` (mode `0600`):

   ```ini
   dns_cloudflare_api_token = YOUR_TOKEN
   ```

   Token needs **Zone → DNS → Edit** on `deelbot.ai`.

2. Run:

   ```bash
   sudo CERTBOT_EMAIL=you@deelbot.com \
     ./deploy/host-edge/issue-le-certs.sh --deelbot-ai-only --deelbot-ai-wildcard
   ```

The script installs `python3-certbot-dns-cloudflare` when using `--deelbot-ai-wildcard`.

### Renewal

`/etc/letsencrypt/renewal-hooks/deploy/99-reload-nginx.sh` reloads Nginx after renewals. Check with:

```bash
sudo certbot renew --dry-run
```

## 5. Tenant vanity domains

Add `server { ... }` blocks on the host (e.g. a new file under `/etc/nginx/conf.d/`) or reuse patterns from `nginx/conf.d/custom-domains.conf` in the Suhani repo.
