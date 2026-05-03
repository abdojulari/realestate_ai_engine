-- ════════════════════════════════════════════════════════════════
-- Event-driven platform foundation
--
-- Adds:
--   • Visitor / Session / EventLog tables (anonymous behaviour pipeline)
--   • AutomationRule / AutomationRunLog (behaviour-triggered actions)
--   • Lead-intelligence columns on CrmClient (leadScore, intent,
--     lifecycleStage, firstTouchAt, lastTouchAt)
--
-- Designed to coexist with the existing PropertyView table — that one
-- stays as a legacy property-only counter; new tracking flows write to
-- EventLog instead.
-- ════════════════════════════════════════════════════════════════

-- ── Lead-intelligence columns on CrmClient ─────────────────────
ALTER TABLE "CrmClient"
  ADD COLUMN "leadScore"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "intent"         TEXT,
  ADD COLUMN "lifecycleStage" TEXT DEFAULT 'visitor',
  ADD COLUMN "firstTouchAt"   TIMESTAMP(3),
  ADD COLUMN "lastTouchAt"    TIMESTAMP(3);

CREATE INDEX "CrmClient_adminId_leadScore_idx"   ON "CrmClient"("adminId", "leadScore");
CREATE INDEX "CrmClient_adminId_lastTouchAt_idx" ON "CrmClient"("adminId", "lastTouchAt");

-- ── Visitor ────────────────────────────────────────────────────
CREATE TABLE "Visitor" (
  "id"          SERIAL  PRIMARY KEY,
  "vid"         TEXT    NOT NULL,
  "adminId"     INTEGER,
  "crmClientId" INTEGER,
  "utmSource"   TEXT,
  "utmMedium"   TEXT,
  "utmCampaign" TEXT,
  "utmTerm"     TEXT,
  "utmContent"  TEXT,
  "referrer"    TEXT,
  "landingPath" TEXT,
  "userAgent"   TEXT,
  "ipAddress"   TEXT,
  "country"     TEXT,
  "region"      TEXT,
  "city"        TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Visitor_vid_key"               ON "Visitor"("vid");
CREATE INDEX        "Visitor_adminId_lastSeenAt_idx" ON "Visitor"("adminId", "lastSeenAt");
CREATE INDEX        "Visitor_crmClientId_idx"        ON "Visitor"("crmClientId");

ALTER TABLE "Visitor"
  ADD CONSTRAINT "Visitor_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Session ────────────────────────────────────────────────────
CREATE TABLE "Session" (
  "id"          SERIAL  PRIMARY KEY,
  "sid"         TEXT    NOT NULL,
  "visitorId"   INTEGER NOT NULL,
  "adminId"     INTEGER,
  "utmSource"   TEXT,
  "utmMedium"   TEXT,
  "utmCampaign" TEXT,
  "referrer"    TEXT,
  "landingPath" TEXT,
  "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt"     TIMESTAMP(3),
  "eventCount"  INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX "Session_sid_key"                  ON "Session"("sid");
CREATE INDEX        "Session_adminId_startedAt_idx"    ON "Session"("adminId", "startedAt");
CREATE INDEX        "Session_visitorId_startedAt_idx"  ON "Session"("visitorId", "startedAt");

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session"
  ADD CONSTRAINT "Session_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── EventLog ───────────────────────────────────────────────────
CREATE TABLE "EventLog" (
  "id"          BIGSERIAL PRIMARY KEY,
  "adminId"     INTEGER,
  "visitorId"   INTEGER,
  "sessionId"   INTEGER,
  "name"        TEXT     NOT NULL,
  "objectType"  TEXT,
  "objectId"    INTEGER,
  "properties"  JSONB,
  "email"       TEXT,
  "path"        TEXT,
  "referrer"    TEXT,
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "EventLog_adminId_createdAt_idx"         ON "EventLog"("adminId", "createdAt");
CREATE INDEX "EventLog_adminId_name_createdAt_idx"    ON "EventLog"("adminId", "name", "createdAt");
CREATE INDEX "EventLog_visitorId_createdAt_idx"       ON "EventLog"("visitorId", "createdAt");
CREATE INDEX "EventLog_sessionId_idx"                 ON "EventLog"("sessionId");
CREATE INDEX "EventLog_email_idx"                     ON "EventLog"("email");

ALTER TABLE "EventLog"
  ADD CONSTRAINT "EventLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventLog"
  ADD CONSTRAINT "EventLog_visitorId_fkey"
  FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventLog"
  ADD CONSTRAINT "EventLog_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── AutomationRule ─────────────────────────────────────────────
CREATE TABLE "AutomationRule" (
  "id"              SERIAL  PRIMARY KEY,
  "adminId"         INTEGER NOT NULL,
  "name"            TEXT    NOT NULL,
  "description"     TEXT,
  "enabled"         BOOLEAN NOT NULL DEFAULT TRUE,
  "trigger"         JSONB   NOT NULL,
  "action"          JSONB   NOT NULL,
  "cooldownSeconds" INTEGER,
  "fireCount"       INTEGER NOT NULL DEFAULT 0,
  "lastFiredAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL
);

CREATE INDEX "AutomationRule_adminId_enabled_idx" ON "AutomationRule"("adminId", "enabled");

ALTER TABLE "AutomationRule"
  ADD CONSTRAINT "AutomationRule_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AutomationRunLog ───────────────────────────────────────────
CREATE TABLE "AutomationRunLog" (
  "id"        SERIAL  PRIMARY KEY,
  "ruleId"    INTEGER NOT NULL,
  "adminId"   INTEGER,
  "visitorId" INTEGER,
  "email"     TEXT,
  "status"    TEXT    NOT NULL,
  "message"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AutomationRunLog_ruleId_createdAt_idx"             ON "AutomationRunLog"("ruleId", "createdAt");
CREATE INDEX "AutomationRunLog_adminId_createdAt_idx"            ON "AutomationRunLog"("adminId", "createdAt");
CREATE INDEX "AutomationRunLog_visitorId_ruleId_createdAt_idx"   ON "AutomationRunLog"("visitorId", "ruleId", "createdAt");

ALTER TABLE "AutomationRunLog"
  ADD CONSTRAINT "AutomationRunLog_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRunLog"
  ADD CONSTRAINT "AutomationRunLog_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
