#!/usr/bin/env bash
set -euo pipefail

docker exec -i deelbot-postgres psql -U postgres -d real_estate <<'SQL'
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
    'aaolatona@gmail.com',
    '$2b$12$W3oiky/fV4LI7TYbZTkyUenggjXvIqC1kxBFCua24dIAo3ME3EF.S',
    'Adeola',
    'Olatona',
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
  'tonahomes',
  'Tona Homes',
  NOW(),
  NOW()
FROM new_user;

COMMIT;
SQL

echo "Done — tonahomes.deelbot.ai tenant created (super_admin: aaolatona@gmail.com / 123456)"
