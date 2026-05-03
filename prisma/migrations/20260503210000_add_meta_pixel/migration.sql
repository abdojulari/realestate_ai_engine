-- Meta (Facebook) Pixel + Conversions API per-tenant configuration.
-- The browser pixel ID is exposed to the public via /api/tenant-settings
-- so each realtor's site fires PageView/Lead under their own ad account.
-- The CAPI access token is server-only and stays out of the public payload.
ALTER TABLE "TenantSettings"
  ADD COLUMN "metaPixelId" TEXT,
  ADD COLUMN "metaPixelAccessToken" TEXT;
