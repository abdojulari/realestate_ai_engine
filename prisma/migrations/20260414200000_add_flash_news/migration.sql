-- CreateTable
CREATE TABLE "FlashNews" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashNews_adminId_idx" ON "FlashNews"("adminId");

-- CreateIndex
CREATE INDEX "FlashNews_adminId_published_idx" ON "FlashNews"("adminId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "FlashNews_adminId_slug_key" ON "FlashNews"("adminId", "slug");

-- AddForeignKey
ALTER TABLE "FlashNews" ADD CONSTRAINT "FlashNews_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
