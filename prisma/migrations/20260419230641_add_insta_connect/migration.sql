-- ============================================================
-- InstaConnect: per-agent shareable digital business card
-- ============================================================

-- 1. Extend "User" with InstaConnect fields
ALTER TABLE "User"
  ADD COLUMN "instaConnectSlug"     TEXT,
  ADD COLUMN "instaConnectEnabled"  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "instaConnectBranding" JSONB;

CREATE UNIQUE INDEX "User_instaConnectSlug_key" ON "User"("instaConnectSlug");

-- 2. Create "InstaConnectCapture" staging table
CREATE TABLE "InstaConnectCapture" (
  "id"          SERIAL PRIMARY KEY,
  "adminId"     INTEGER NOT NULL,
  "firstName"   TEXT    NOT NULL,
  "lastName"    TEXT    NOT NULL,
  "email"       TEXT    NOT NULL,
  "phone"       TEXT    NOT NULL,
  "company"     TEXT,
  "interest"    TEXT,
  "message"     TEXT,
  "consent"     BOOLEAN NOT NULL DEFAULT FALSE,
  "status"      TEXT    NOT NULL DEFAULT 'pending',
  "crmClientId" INTEGER,
  "userAgent"   TEXT,
  "ipHash"      TEXT,
  "referrer"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt"  TIMESTAMP(3),
  "rejectedAt"  TIMESTAMP(3),

  CONSTRAINT "InstaConnectCapture_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InstaConnectCapture_adminId_status_createdAt_idx"
  ON "InstaConnectCapture"("adminId", "status", "createdAt");

CREATE INDEX "InstaConnectCapture_adminId_email_idx"
  ON "InstaConnectCapture"("adminId", "email");
