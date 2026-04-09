# Production scripts runbook (Suhani)

This document describes **which scripts** under `scripts/` to run in **production**, and **when**. Paths are relative to the Suhani repository root.

**Related docs**

- [PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md](./PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md) — DNS, Let’s Encrypt, nginx, custom domains  
- [MULTI-TENANT-SETUP.md](./MULTI-TENANT-SETUP.md) — control plane, tenant routing, licensing  

---

## Important: Docker image vs checkout

The production **Docker image** does **not** copy `scripts/`. Shell scripts that invoke **Docker Compose** (`deploy.sh`, `issue-custom-domain-cert.sh`) must run on the **host** where compose runs, from a repo checkout.

**Node scripts** (`*.mjs`, `*.ts`) need Node, dependencies (`@prisma/client`, etc.), and a valid **`DATABASE_URL`** (or `.env`). Typical options:

- Run on the server from a **full git checkout** (`pnpm install` / `npm install` as needed), or  
- Run from a secure admin machine with a tunnel/VPN to the database (higher risk—avoid if possible).

---

## 0a. Suhani compose: one base, prod adds edge

**`docker-compose.yml`** is the canonical stack (**app**, **db**, **redis**, shared volumes `postgres_data`, `redis_data`, `uploads_data`). **`docker-compose.prod.yml`** uses Compose **`include`** of that file and adds **nginx** + **certbot**, plus server-friendly publish ports and `container_name` **`suhani-postgres`** / **`suhani-redis`**. Default **`DATABASE_URL`** uses hostname **`db`** and database **`real_estate`**—the same shape as local Docker. Host ports default to **5435** / **6381** so they do not clash with saas-control-plane (**5434** / **6380**). Set **`DATABASE_URL`** / **`REDIS_URL`** in `.env` only if you use external databases.

## 0. Two repos on one server (no symlinks)

Default **nginx host ports** are set in compose so both stacks can run side by side:

| Repo | HTTP (host) | HTTPS (host) |
|------|-------------|--------------|
| Suhani | `9080` | `9443` |
| saas-control-plane | `9081` | `9444` |

Override with `NGINX_PUBLISH_HTTP_PORT` / `NGINX_PUBLISH_HTTPS_PORT` in each repo’s `.env` (use `80` / `443` when only one stack binds standard ports). Example `.env` values for **cross-container** calls: `CONTROL_PLANE_URL=https://host.docker.internal:9444` (Suhani → CP) and `SUHANI_API_URL=http://host.docker.internal:3000` (CP → Suhani app port). `extra_hosts: host.docker.internal:host-gateway` is enabled on both app services.

## 1. Every release / routine deploy

| Script | Command (examples) | Purpose |
|--------|-------------------|---------|
| [`scripts/deploy.sh`](../scripts/deploy.sh) | `./scripts/deploy.sh` | **Standalone** Suhani: `docker-compose.prod.yml`, loads `.env.production` or `.env`, build/up, **`npx prisma migrate deploy`**. |
| Same | `./scripts/deploy.sh stack` | **Combined** stack: `deploy/docker-compose.production.yml` (control plane + Suhani). Requires `suhani.env`, `control-plane.env`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`. |
| Same | `./scripts/deploy.sh control-plane` | **Control plane only** (default sibling `../saas-control-plane`). |

If the control plane lives in a **sibling** checkout (e.g. `Frontends/saas-control-plane`), it may have its own `scripts/deploy.sh` there—use that when Suhani is not deployed via `./scripts/deploy.sh control-plane`.

---

## 2. One-time or rare (data / multi-tenant)

| Script | When to run | Purpose |
|--------|-------------|---------|
| [`scripts/backfill-tenant-admin-ids.mjs`](../scripts/backfill-tenant-admin-ids.mjs) | After introducing tenant-scoped `adminId`, or if legacy rows have `adminId = null` | Sets `adminId` on tenant-scoped models to the **first** `super_admin` / `admin`, and creates **`TenantSettings`** for that user if missing. |

```bash
cd /path/to/suhani
set -a && source .env.production && set +a   # or: export DATABASE_URL=...
node scripts/backfill-tenant-admin-ids.mjs
```

Run **once** per environment (or again only if you understand the data impact).

---

## 3. Per tenant custom domain (TLS)

| Script | When to run | Purpose |
|--------|-------------|---------|
| [`scripts/issue-custom-domain-cert.sh`](../scripts/issue-custom-domain-cert.sh) | After DNS for the hostname points at the server | Let’s Encrypt **HTTP-01** via compose **certbot** + webroot. |

```bash
./scripts/issue-custom-domain-cert.sh you@example.com tenant.com www.tenant.com
```

Combined stack (from Suhani repo root):

```bash
COMPOSE_FILE=deploy/docker-compose.production.yml ./scripts/issue-custom-domain-cert.sh you@example.com tenant.com
```

Then edit **`nginx/conf.d/custom-domains.conf`** (standalone) or **`deploy/nginx/conf.d/custom-domains.conf`** (stack), reload nginx. Full steps: [PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md](./PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md).

---

## 4. Scheduled (cron) — MLS / feeds

| Script | Scheduling | Notes |
|--------|------------|--------|
| [`scripts/pillar9-sync.mjs`](../scripts/pillar9-sync.mjs) | e.g. weekly | Uses **`dotenv/config`**. Set **`NUXT_PUBLIC_SITE_URL`** or **`APP_URL`** to the **public** Suhani URL. **`PILLAR9_SYNC_SECRET`** or **`CRON_SECRET`** must match the app. |
| [`scripts/holistic-sync.mjs`](../scripts/holistic-sync.mjs) | e.g. monthly / off-peak | Does **not** load dotenv—**export** `NUXT_PUBLIC_SITE_URL` / `APP_URL` in cron. **`--purge`** wipes CREA data—use only intentionally. |

Example cron (adjust paths and URLs):

```bash
0 3 * * 0 cd /opt/suhani && set -a && . ./.env.production && set +a && node scripts/pillar9-sync.mjs >> /var/log/pillar9-sync.log 2>&1
0 4 1 * * cd /opt/suhani && export NUXT_PUBLIC_SITE_URL=https://app.deelbot.ai && node scripts/holistic-sync.mjs --all >> /var/log/holistic-sync.log 2>&1
```

---

## 5. Optional operations / backups

| Script | Use in production |
|--------|-------------------|
| [`scripts/database-backup.mjs`](../scripts/database-backup.mjs) | Schedule `backup`; use `cleanup` for retention; `restore` only for recovery. |
| [`scripts/cleanup-broken-images.mjs`](../scripts/cleanup-broken-images.mjs) | Periodic maintenance (see script for options). |
| [`scripts/admin-tools.mjs`](../scripts/admin-tools.mjs) | **On-demand only**—can alter data (users, content, CREA checks). |

---

## 6. Usually not for production servers

| Script | Reason |
|--------|--------|
| [`scripts/fresh-sync.mjs`](../scripts/fresh-sync.mjs) | Defaults to `http://localhost:3000`; dev-oriented. Prefer **holistic-sync** with a real API base. |
| [`scripts/verdocs-live-smoke.ts`](../scripts/verdocs-live-smoke.ts) | Live Verdocs smoke test—typically **staging** or manual QA. |
| [`scripts/check-delegate-sensitive-model-queries.mjs`](../scripts/check-delegate-sensitive-model-queries.mjs) | CI / local guardrail, not a production runtime task. |

---

## 7. Suggested first-time production sequence

1. DNS + TLS for control plane and **`*.deelbot.ai`** (see [PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md](./PRODUCTION-DNS-TLS-AND-CUSTOM-DOMAINS.md)).  
2. **`./scripts/deploy.sh`** or **`./scripts/deploy.sh stack`**.  
3. Create first tenant/admin (signup / control plane provisioning).  
4. If legacy data needs it: **`node scripts/backfill-tenant-admin-ids.mjs`**.  
5. Cron: **`pillar9-sync.mjs`** / **`holistic-sync.mjs`** if you use those feeds.  
6. Cron: **`database-backup.mjs backup`** if you rely on this utility.  
7. Per custom domain: DNS → **`issue-custom-domain-cert.sh`** → nginx **`custom-domains.conf`** → reload.

---

## 8. Quick reference — script files

| File | Type |
|------|------|
| `scripts/deploy.sh` | Bash — Docker deploy + migrations (standalone / stack / CP) |
| `scripts/issue-custom-domain-cert.sh` | Bash — Certbot webroot for custom hostnames |
| `scripts/backfill-tenant-admin-ids.mjs` | Node — one-time tenant adminId / TenantSettings |
| `scripts/pillar9-sync.mjs` | Node — cron Pillar9 sync |
| `scripts/holistic-sync.mjs` | Node — cron CREA holistic sync |
| `scripts/database-backup.mjs` | Node — backup / restore / cleanup |
| `scripts/cleanup-broken-images.mjs` | Node — maintenance |
| `scripts/admin-tools.mjs` | Node — interactive ops |
| `scripts/fresh-sync.mjs` | Node — dev-oriented CREA sync |
| `scripts/verdocs-live-smoke.ts` | TypeScript — Verdocs smoke |
| `scripts/check-delegate-sensitive-model-queries.mjs` | Node — static check |
