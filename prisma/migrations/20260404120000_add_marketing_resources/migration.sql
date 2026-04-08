-- CreateTable
CREATE TABLE "MarketingResource" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "thankYouMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceDownloadLead" (
    "id" SERIAL NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDownloadLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingResource_publicSlug_key" ON "MarketingResource"("publicSlug");

-- CreateIndex
CREATE INDEX "MarketingResource_adminId_idx" ON "MarketingResource"("adminId");

-- CreateIndex
CREATE INDEX "MarketingResource_adminId_published_idx" ON "MarketingResource"("adminId", "published");

-- CreateIndex
CREATE INDEX "ResourceDownloadLead_resourceId_idx" ON "ResourceDownloadLead"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceDownloadLead_adminId_createdAt_idx" ON "ResourceDownloadLead"("adminId", "createdAt");

-- AddForeignKey
ALTER TABLE "MarketingResource" ADD CONSTRAINT "MarketingResource_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDownloadLead" ADD CONSTRAINT "ResourceDownloadLead_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "MarketingResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
