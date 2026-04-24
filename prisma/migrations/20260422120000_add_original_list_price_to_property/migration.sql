-- Add MLS-native price tracking columns to Property.
--
-- These mirror the RESO standard fields (OriginalListPrice, PreviousListPrice,
-- PriceChangeTimestamp / MajorChangeTimestamp) returned by the CREA DDF and
-- Pillar9 (Matrix) feeds. They let the "Best Deals" page surface reductions
-- that pre-date our first ingest of the listing — something `firstEntryPrice`
-- (set on first sync only) cannot do on its own.
ALTER TABLE "Property"
  ADD COLUMN "originalListPrice"     DOUBLE PRECISION,
  ADD COLUMN "previousListPrice"     DOUBLE PRECISION,
  ADD COLUMN "priceChangeTimestamp"  TIMESTAMP(3);
