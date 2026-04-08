-- Per-delegate list of tenant user IDs hidden from user management & related UIs
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "delegationExcludedUserIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
