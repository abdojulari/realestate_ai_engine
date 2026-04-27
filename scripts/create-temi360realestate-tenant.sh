#!/usr/bin/env bash
set -euo pipefail

# Creates the temi360realestate.deelbot.ai tenant:
#   • super_admin user (login: temi360realestate@gmail.com / 123456)
#   • TenantSettings row mapping the subdomain to that admin
#
# The bcrypt hash below is the precomputed hash of "123456".
# Same value used by scripts/create-tonahomes-tenant.sh — generated once with cost=12.

docker exec -i suhani-postgres psql -U postgres -d real_estate <<'SQL'
BEGIN;

WITH new_user AS (
  INSERT INTO "User" (
    "email",
    "password",
    "firstName",
    "lastName",
    "role",
    "subscriptionTier",
    "mustChangePassword",
    "createdAt",
    "updatedAt"
  ) VALUES (
    'temi360realestate@gmail.com',
    '$2b$12$W3oiky/fV4LI7TYbZTkyUenggjXvIqC1kxBFCua24dIAo3ME3EF.S',
    'Temi',
    'Realestate',
    'super_admin',
    NULL,
    false,
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO "TenantSettings" (
  "adminId",
  "subdomain",
  "businessName",
  "createdAt",
  "updatedAt"
)
SELECT
  id,
  'temi360realestate',
  'Temi360 Consulting Inc',
  NOW(),
  NOW()
FROM new_user;

COMMIT;
SQL

echo "Done — temi360realestate.deelbot.ai tenant created (super_admin: temi360realestate@gmail.com / 123456)"
