# Multi-Tenant Setup (Option A): Single App, Many Tenants

This document describes the **Option A** architecture: one Suhani deployment serving many tenants by **domain** (subdomain or custom domain). Plan and license come from the **SaaS Control Plane**; tenant branding (display name, logo) is stored in the control plane and shown in Suhani.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Control Plane Setup](#3-control-plane-setup)
4. [Suhani (App) Setup](#4-suhani-app-setup)
5. [Tenant Lifecycle](#5-tenant-lifecycle)
6. [Custom Domains](#6-custom-domains)
7. [Branding](#7-branding)
8. [Troubleshooting & Complexity](#8-troubleshooting--complexity)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Tenant A: acme.realestatehub.ca  (subdomain)                    │
│  Tenant B: beta.realestatehub.ca  (subdomain)                    │
│  Tenant C: acmesrealty.com       (custom domain → same app)      │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Single Suhani deployment (e.g. realestatehub.ca or app.…)      │
│  - Resolves tenant from Host header (subdomain or full domain)   │
│  - Fetches license + branding from Control Plane by domain       │
│  - Renders tenant logo/name in header & footer                   │
└────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SaaS Control Plane (separate app)                              │
│  - Tenant: domain, customDomain, displayName, logoUrl            │
│  - License: plan (free|basic|silver|gold|platinum|enterprise)  │
│  - GET /api/license/:domain → tier, features, displayName, logoUrl│
└─────────────────────────────────────────────────────────────────┘
```

- **No “deploy per tenant”**: one Suhani build serves all tenants.
- **Tenant identity** = domain: subdomain (e.g. `acme`) when host is `acme.realestatehub.ca`, or full host (e.g. `acmesrealty.com`) for custom domains.
- **License** = control plane returns tier and features; Suhani gates features by tier.
- **Branding** = control plane returns `displayName` and `logoUrl`; Suhani uses them in header/footer.

---

## 2. Prerequisites

- **SaaS Control Plane** app running (e.g. `saas-control-plane` repo).
- **Suhani** app running (this repo).
- **Database** for control plane (PostgreSQL) and for Suhani (PostgreSQL).
- **Hosting** for Suhani that supports:
  - Multiple domains or wildcard subdomains (e.g. `*.realestatehub.ca` and custom domains).
  - SSL (e.g. Let’s Encrypt) for each domain/subdomain.

---

## 3. Control Plane Setup

### 3.1 Database migration (tenant branding)

Tenant has optional `displayName` and `logoUrl`. Run migrations when the DB is available:

```bash
cd saas-control-plane
npx prisma migrate dev --name add_tenant_branding
# or, if you use db push:
npx prisma db push
```

### 3.2 Environment variables

In `saas-control-plane/.env` (or your deployment env):

- `DATABASE_URL` – PostgreSQL connection.
- `NUXT_PUBLIC_SITE_URL` or `CONTROL_PLANE_URL` – public URL of the control plane (e.g. `https://billing.realestatehub.ca`).
- Stripe, JWT, etc. as already required.

### 3.3 License API

Control plane exposes:

- **GET /api/license/:domain**  
  Returns tier, features, `displayName`, `logoUrl` for the tenant identified by `domain` (subdomain or custom domain).  
  Suhani calls this to get license + branding.

### 3.4 Updating tenant branding / custom domain

- **PATCH /api/tenants/:id**  
  Body: `{ "displayName": "...", "logoUrl": "...", "customDomain": "..." }`.  
  Use for setting business name, logo, and custom domain.

---

## 4. Suhani (App) Setup

### 4.1 Environment variables

In `suhani/.env` (or your deployment env):

| Variable | Required | Description |
|----------|----------|-------------|
| `CONTROL_PLANE_URL` | Yes (multi-tenant) | Base URL of the control plane, e.g. `https://billing.realestatehub.ca`. |
| `CONTROL_PLANE_API_KEY` | No | If set, sent as `Authorization: Bearer <key>` when calling the license API. |
| `APP_BASE_DOMAIN` | Yes (for subdomains) | Base domain of the app, e.g. `realestatehub.ca`. Used to derive subdomain from Host (e.g. `acme.realestatehub.ca` → `acme`). |

For **single-tenant / dev** without control plane, leave `CONTROL_PLANE_URL` unset; Suhani will use `LICENSE_TIER` (e.g. `platinum`) and no tenant branding.

### 4.2 Domain resolution logic

- **X-Tenant-Domain header** (e.g. localhost): used as tenant domain if present.
- **Subdomain**: if `Host` is `*.APP_BASE_DOMAIN`, tenant = subdomain (e.g. `acme`).
- **Custom domain**: otherwise tenant = full host (e.g. `acmesrealty.com`).

So:

- `acme.realestatehub.ca` with `APP_BASE_DOMAIN=realestatehub.ca` → domain `acme`.
- `acmesrealty.com` → domain `acmesrealty.com`.

### 4.3 Branding in UI

- **Header**: logo = `licenseInfo.logoUrl` or default `/images/logos/logo.png`; alt/title from `licenseInfo.displayName`.
- **Footer**: tenant name and logo (if any) from `licenseInfo.displayName` and `licenseInfo.logoUrl`; fallback to default brand text.

License (and branding) is loaded via existing `/api/license` and `useLicense()` composable.

---

## 5. Tenant Lifecycle

### 5.1 Signup (control plane)

1. User signs up in the control plane (e.g. subdomain `acme`, plan selection).
2. Control plane creates **Tenant** (domain = `acme`) and **License** (plan = basic/silver/gold/…).
3. After payment (Stripe), license is active.

### 5.2 First visit to Suhani

1. User visits `acme.realestatehub.ca` (or later `acmesrealty.com`).
2. Suhani reads Host, gets domain `acme` (or full host for custom domain).
3. Suhani calls `GET CONTROL_PLANE_URL/api/license/acme` (or `/api/license/acmesrealty.com`).
4. Control plane returns tier, features, `displayName`, `logoUrl`.
5. Suhani applies feature gating and shows tenant branding.

### 5.3 No “deploy” step

- New tenant = new row in control plane (Tenant + License). No new Suhani deployment.
- Optional: script or webhook that on subscription success ensures tenant + license and, if custom domain, runs the [add-custom-domain](#6-custom-domains) flow.

---

## 6. Custom Domains

### 6.1 Control plane

1. Set tenant’s custom domain: **PATCH /api/tenants/:id** with `{ "customDomain": "acmesrealty.com" }`.
2. License API finds tenant by `domain` **or** `customDomain`, so Suhani can send either `acme` or `acmesrealty.com` and get the same tenant.

### 6.2 Script (control plane repo)

From `saas-control-plane`:

```bash
node scripts/add-custom-domain.mjs --tenant-id=<tenantId> --domain=acmesrealty.com
```

Optional: `--display-name="Acme Realty"` and `--logo-url=https://...`. Use `--dry-run` to only print instructions.

The script:

- PATCHes the tenant’s `customDomain` (and optionally `displayName` / `logoUrl`).
- Prints **next steps**: DNS (CNAME to your app host) and adding the domain in your hosting provider (Vercel, Railway, Netlify, etc.).

### 6.3 DNS

- At the registrar for `acmesrealty.com`, add:
  - **CNAME** `acmesrealty.com` → your app host (e.g. Vercel/Railway hostname), or
  - **A/AAAA** to your server IP if not using CNAME.
- Wait for propagation (minutes to 48 hours).

### 6.4 Hosting (Suhani)

- In your **host’s dashboard** (Vercel, Railway, Netlify, etc.), add the custom domain to the **same** project that serves Suhani.
- SSL is usually issued automatically once DNS is correct.

### 6.5 No code change

Suhani does not need a code change for a new custom domain: it resolves tenant by the full Host header and fetches license/branding from the control plane.

---

## 7. Branding

### 7.1 Where it’s stored

- **Control plane**: Tenant fields `displayName`, `logoUrl` (optional). `name` is fallback for `displayName` in the license API.

### 7.2 Where it’s shown in Suhani

- **Header**: logo image (tenant `logoUrl` or default), alt/title from `displayName`.
- **Footer**: tenant name and logo (if set); copyright uses `displayName` when available.

### 7.3 Setting branding

- **Control plane admin**: PATCH `/api/tenants/:id` with `displayName` and `logoUrl`.
- **add-custom-domain script**: `--display-name` and `--logo-url` when adding/updating a custom domain.

---

## 8. Troubleshooting & Complexity

### 8.1 License not found / 404

- **Cause**: Suhani is sending a domain that doesn’t match any tenant’s `domain` or `customDomain`.
- **Checks**:
  - Control plane: ensure Tenant exists with `domain` (subdomain) or `customDomain` set.
  - Suhani: ensure `APP_BASE_DOMAIN` is set correctly so subdomains are parsed (e.g. `acme.realestatehub.ca` → `acme`).
  - For custom domain, Suhani sends the **full host** (e.g. `acmesrealty.com`). Control plane must have that value in `Tenant.customDomain`.

### 8.2 Wrong tenant / wrong branding

- **Cause**: Caching or wrong domain key. Suhani caches license (including branding) per domain for 5 minutes.
- **Checks**: Restart Suhani or wait for cache TTL. Confirm control plane returns correct tenant for the domain you expect (e.g. test `GET /api/license/acme` and `GET /api/license/acmesrealty.com`).

### 8.3 Subdomain not resolving

- **Cause**: DNS or host not configured for `*.realestatehub.ca` (or your base domain).
- **Checks**:
  - DNS: wildcard A/CNAME for `*.realestatehub.ca` pointing to your app.
  - Host: if using Vercel/Netlify, add the wildcard domain in project settings.

### 8.4 Custom domain SSL not issuing

- **Cause**: DNS not propagated or host can’t verify ownership.
- **Checks**:
  - Use `dig` or online DNS tools to confirm CNAME/A for the custom domain.
  - In the host dashboard, check domain status and any “verify” or “retry SSL” actions.

### 8.5 Local development

- **Suhani**: set `X-Tenant-Domain` header (e.g. `acme` or `acmesrealty.com`) so the app can resolve the tenant without a real subdomain.
- **Control plane**: run locally; set `CONTROL_PLANE_URL` in Suhani to your local control plane URL (e.g. `http://localhost:3001`).

### 8.6 CORS

- If Suhani (browser) called the control plane directly, you’d need CORS. Here, **Suhani server** calls the control plane (server-side), so CORS is not involved for the license request.

### 8.7 Rate limiting / availability

- Suhani caches license per domain (5 min). Control plane should be highly available; if it’s down, Suhani falls back to env tier (or no tenant) and may show default branding.

### 8.8 Summary checklist

| Step | Where | What to do |
|------|--------|------------|
| Run migration | Control plane | `npx prisma migrate dev` (or `db push`) for `displayName` / `logoUrl`. |
| Set env | Suhani | `CONTROL_PLANE_URL`, `APP_BASE_DOMAIN`; optional `CONTROL_PLANE_API_KEY`. |
| Create tenant | Control plane | Signup/create Tenant + License (plan). |
| Subdomain DNS | Registrar / host | Wildcard or A/CNAME for `*.realestatehub.ca`. |
| Custom domain | Control plane | PATCH tenant `customDomain`; run add-custom-domain script if desired. |
| Custom domain DNS | Registrar | CNAME (or A) to app host. |
| Custom domain host | Vercel/Railway/etc. | Add domain in project; wait for SSL. |
| Branding | Control plane | PATCH tenant `displayName`, `logoUrl`. |

This keeps Option A simple: one app, config-driven tenants, and step-by-step handling of domains and branding.
