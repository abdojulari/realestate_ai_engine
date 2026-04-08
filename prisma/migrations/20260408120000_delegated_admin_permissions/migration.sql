-- Delegated admin panel access (per-feature CRUD flags for team members)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "delegatedAdminPermissions" JSONB;
