-- Adds CRM celebrations:
--   • New optional date columns + holiday-exception list on CrmClient
--   • CelebrationSettings: per-tenant subject + body templates + auto-send toggles
--   • CelebrationLog: audit + idempotency for celebration emails
--
-- These tables already exist in some environments (applied earlier via `prisma db push`).
-- They were baselined into a migration on 2026-04-27. The CREATE statements below use
-- IF NOT EXISTS so re-applying is safe in those environments.

-- AlterTable
ALTER TABLE "public"."CrmClient"
  ADD COLUMN IF NOT EXISTS "closingAnniversary" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "holidayExceptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "weddingAnniversary" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."CelebrationSettings" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "autoSendBirthday" BOOLEAN NOT NULL DEFAULT false,
    "autoSendAnniversary" BOOLEAN NOT NULL DEFAULT false,
    "autoSendClosing" BOOLEAN NOT NULL DEFAULT false,
    "autoSendChristmas" BOOLEAN NOT NULL DEFAULT false,
    "autoSendNewYear" BOOLEAN NOT NULL DEFAULT false,
    "birthdayTemplate" TEXT,
    "anniversaryTemplate" TEXT,
    "closingTemplate" TEXT,
    "christmasTemplate" TEXT,
    "newYearTemplate" TEXT,
    "eidTemplate" TEXT,
    "birthdaySubject" TEXT,
    "anniversarySubject" TEXT,
    "closingSubject" TEXT,
    "christmasSubject" TEXT,
    "newYearSubject" TEXT,
    "eidSubject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."CelebrationLog" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CelebrationSettings_adminId_key" ON "public"."CelebrationSettings"("adminId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CelebrationLog_adminId_kind_sentAt_idx" ON "public"."CelebrationLog"("adminId", "kind", "sentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CelebrationLog_clientId_kind_sentAt_idx" ON "public"."CelebrationLog"("clientId", "kind", "sentAt");

-- AddForeignKey: CelebrationSettings.adminId → User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CelebrationSettings_adminId_fkey'
  ) THEN
    ALTER TABLE "public"."CelebrationSettings"
      ADD CONSTRAINT "CelebrationSettings_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: CelebrationLog.adminId → User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CelebrationLog_adminId_fkey'
  ) THEN
    ALTER TABLE "public"."CelebrationLog"
      ADD CONSTRAINT "CelebrationLog_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "public"."User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey: CelebrationLog.clientId → CrmClient.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CelebrationLog_clientId_fkey'
  ) THEN
    ALTER TABLE "public"."CelebrationLog"
      ADD CONSTRAINT "CelebrationLog_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "public"."CrmClient"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
