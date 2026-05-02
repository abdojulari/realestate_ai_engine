-- Posted Bank Rates: tenant-curated lender rate board surfaced on the public
-- /rates page next to the Bank of Canada market averages. The model was added
-- to schema.prisma earlier without a matching migration file — every prior
-- deploy logged "No pending migrations to apply" while the table was missing,
-- so any /api/admin/posted-rates query returned 500 ("relation does not exist").

-- CreateTable
CREATE TABLE "PostedRate" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "bank" TEXT NOT NULL,
    "bankLogoUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'mortgage',
    "product" TEXT NOT NULL,
    "term" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostedRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostedRate_adminId_isPublished_sortOrder_idx" ON "PostedRate"("adminId", "isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "PostedRate_adminId_category_idx" ON "PostedRate"("adminId", "category");

-- AddForeignKey
ALTER TABLE "PostedRate" ADD CONSTRAINT "PostedRate_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
