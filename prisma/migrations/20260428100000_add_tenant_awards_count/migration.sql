-- Add awardsCount to TenantSettings for the homepage hero stats card.
-- Nullable so existing tenants are unaffected; the homepage falls back to 0
-- until the admin sets a value via the CMS branding panel.
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "awardsCount" INTEGER;
