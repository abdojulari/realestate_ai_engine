-- Homepage Resources system (separate from MarketingResource which is PDF-centric).
-- Surfaces tenant-curated WYSIWYG articles in the homepage carousel and a
-- /learn/:slug detail page protected by a lead-gen unlock cookie.

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "coverImage" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "externalLinks" JSONB,
    "category" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "unlockCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceLead" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resource_adminId_slug_key" ON "Resource"("adminId", "slug");

-- CreateIndex
CREATE INDEX "Resource_adminId_featured_published_idx" ON "Resource"("adminId", "featured", "published");

-- CreateIndex
CREATE INDEX "Resource_adminId_sortOrder_idx" ON "Resource"("adminId", "sortOrder");

-- CreateIndex
CREATE INDEX "ResourceLead_resourceId_idx" ON "ResourceLead"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceLead_adminId_createdAt_idx" ON "ResourceLead"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "ResourceLead_email_idx" ON "ResourceLead"("email");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLead" ADD CONSTRAINT "ResourceLead_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
