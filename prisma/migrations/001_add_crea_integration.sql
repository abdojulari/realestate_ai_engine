-- Migration to add CREA integration fields to Property table

-- Add new columns to Property table
ALTER TABLE "Property" 
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "mlsNumber" TEXT,
ADD COLUMN "lastSyncAt" TIMESTAMP(3);

-- Add unique constraint for CREA properties
ALTER TABLE "Property" 
ADD CONSTRAINT "Property_source_externalId_key" 
UNIQUE ("source", "externalId");

-- Create index for better query performance
CREATE INDEX "Property_source_idx" ON "Property"("source");
CREATE INDEX "Property_lastSyncAt_idx" ON "Property"("lastSyncAt");

-- Update existing properties to have 'manual' source
UPDATE "Property" SET "source" = 'manual' WHERE "source" IS NULL;

-- Add comment explaining the integration
COMMENT ON COLUMN "Property"."source" IS 'Data source: manual (builder listings) or crea (MLS listings)';
COMMENT ON COLUMN "Property"."externalId" IS 'External system ID, e.g., CREA ListingKey for MLS properties';
COMMENT ON COLUMN "Property"."mlsNumber" IS 'MLS listing number for public display';
COMMENT ON COLUMN "Property"."lastSyncAt" IS 'Last synchronization timestamp for CREA properties';
