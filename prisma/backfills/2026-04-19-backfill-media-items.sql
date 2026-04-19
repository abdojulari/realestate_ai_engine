-- ──────────────────────────────────────────────────────────────────────────
-- Backfill: features.mediaItems from legacy images[] for CREA properties
-- ──────────────────────────────────────────────────────────────────────────
--
-- Why this exists
--   server/utils/crea.service.ts now stores rich per-photo metadata under
--   features.mediaItems (alt text, order, category, isPreferred, etc.).
--   Properties synced before that code shipped only have the flat `images`
--   string array and a missing/empty features.mediaItems. The runtime UI
--   (PropertyCard, ModernPropertyCard, app/pages/property/[id].vue) already
--   gracefully falls back to `images`, but server-side consumers — AI
--   chat/listing-description prompts, CSV exports, sitemaps — read
--   features.mediaItems directly. This script seeds those rows so every
--   downstream reader sees a consistent shape.
--
-- Safety
--   • Idempotent — only touches rows where mediaItems is missing OR empty.
--   • Only updates source = 'crea' rows. Non-CREA records are untouched.
--   • Only runs when there's at least one image to backfill from.
--   • Wrapped in a single transaction with a count printed before COMMIT.
--   • Touches no other key inside `features`.
--
-- Synthesized item shape mirrors what crea.service.ts emits, with nulls for
-- fields that the legacy images[] never carried (alt, mediaKey, etc.). Once
-- the listing is re-synced from CREA the transform overwrites this with the
-- real metadata.
--
-- How to run (production)
--   docker compose -f docker-compose.yml -f docker-compose.prod.yml \
--     --env-file .env.production exec -T db \
--     psql -U postgres -d real_estate \
--     < prisma/backfills/2026-04-19-backfill-media-items.sql
--
-- How to verify after
--   See verification block at the end of this file.
-- ──────────────────────────────────────────────────────────────────────────

BEGIN;

-- Show how many rows are eligible BEFORE the update so we can sanity-check.
DO $$
DECLARE
  eligible_count INT;
BEGIN
  SELECT COUNT(*) INTO eligible_count
  FROM "Property" p
  WHERE p.source = 'crea'
    AND jsonb_typeof(p.images::jsonb) = 'array'
    AND jsonb_array_length(p.images::jsonb) > 0
    AND (
          NOT (COALESCE(p.features::jsonb, '{}'::jsonb) ? 'mediaItems')
       OR jsonb_typeof(p.features::jsonb -> 'mediaItems') <> 'array'
       OR jsonb_array_length(p.features::jsonb -> 'mediaItems') = 0
    );

  RAISE NOTICE 'Backfill: % CREA rows eligible for mediaItems synthesis', eligible_count;
END $$;

UPDATE "Property" p
SET features = jsonb_set(
      COALESCE(p.features::jsonb, '{}'::jsonb),
      '{mediaItems}',
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'url',               img,
                   'alt',               NULL,
                   'order',             idx - 1,
                   'category',          'Photo',
                   'isPreferred',       idx = 1,
                   'mediaKey',          NULL,
                   'modifiedAt',        NULL,
                   'resourceRecordId',  NULL,
                   'resourceRecordKey', NULL,
                   'resourceName',      NULL
                 )
                 ORDER BY idx
               )
        FROM jsonb_array_elements_text(p.images::jsonb) WITH ORDINALITY AS t(img, idx)
      ),
      true
    )
WHERE p.source = 'crea'
  AND jsonb_typeof(p.images::jsonb) = 'array'
  AND jsonb_array_length(p.images::jsonb) > 0
  AND (
        NOT (COALESCE(p.features::jsonb, '{}'::jsonb) ? 'mediaItems')
     OR jsonb_typeof(p.features::jsonb -> 'mediaItems') <> 'array'
     OR jsonb_array_length(p.features::jsonb -> 'mediaItems') = 0
  );

-- Show rows touched.
DO $$
BEGIN
  RAISE NOTICE 'Backfill complete. Run the verification block at the bottom of this file to confirm.';
END $$;

COMMIT;

-- ──────────────────────────────────────────────────────────────────────────
-- VERIFICATION (read-only, run separately if you want)
-- ──────────────────────────────────────────────────────────────────────────
--
-- 1. Coverage — should now be ~0 missing for rows with images:
-- SELECT
--   COUNT(*)                                                                            AS total_crea,
--   COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(features::jsonb->'mediaItems','[]'::jsonb)) > 0)  AS has_media_items,
--   COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(features::jsonb->'mediaItems','[]'::jsonb)) = 0
--                     AND  jsonb_array_length(COALESCE(images::jsonb,'[]'::jsonb)) > 0) AS still_missing_with_images
-- FROM "Property"
-- WHERE source = 'crea';
--
-- 2. Spot-check a single backfilled row:
-- SELECT id,
--        jsonb_array_length(features::jsonb -> 'mediaItems') AS media_count,
--        jsonb_pretty(features::jsonb -> 'mediaItems' -> 0)  AS first_item
-- FROM "Property"
-- WHERE id = 24218;
