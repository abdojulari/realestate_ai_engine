/*
  Warnings:

  - A unique constraint covering the columns `[source,externalId]` on the table `Property` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."PropertyInquiry" DROP CONSTRAINT "PropertyInquiry_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "cityRegion" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "lotSizeArea" DOUBLE PRECISION,
ADD COLUMN     "lotSizeDimensions" TEXT,
ADD COLUMN     "lotSizeUnits" TEXT,
ADD COLUMN     "mlsNumber" TEXT,
ADD COLUMN     "parcelNumber" TEXT,
ADD COLUMN     "propertyCondition" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "stories" INTEGER,
ADD COLUMN     "streetName" TEXT,
ADD COLUMN     "streetNumber" TEXT,
ADD COLUMN     "taxAnnualAmount" DOUBLE PRECISION,
ADD COLUMN     "taxYear" INTEGER,
ADD COLUMN     "unitNumber" TEXT,
ADD COLUMN     "waterBodyName" TEXT,
ADD COLUMN     "yearBuilt" INTEGER,
ADD COLUMN     "zoning" TEXT,
ADD COLUMN     "zoningDescription" TEXT;

-- AlterTable
ALTER TABLE "public"."PropertyInquiry" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "consentDate" TIMESTAMP(3),
ADD COLUMN     "consentIpAddress" TEXT,
ADD COLUMN     "marketingConsent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."PropertyAlert" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "naturalQuery" TEXT NOT NULL,
    "parsedFilters" JSONB NOT NULL,
    "city" TEXT,
    "frequency" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentDate" TIMESTAMP(3),
    "lastResults" JSONB,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HomeEstimate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "beds" INTEGER NOT NULL,
    "baths" DOUBLE PRECISION NOT NULL,
    "sqft" DOUBLE PRECISION NOT NULL,
    "yearBuilt" INTEGER NOT NULL,
    "lotSize" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "features" JSONB,
    "renovations" JSONB,
    "additionalInfo" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "contactPreference" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "estimatedValue" DOUBLE PRECISION,
    "agentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Testimonial" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "propertyType" TEXT,
    "avatar" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "public"."EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "Testimonial_approved_featured_displayOrder_idx" ON "public"."Testimonial"("approved", "featured", "displayOrder");

-- CreateIndex
CREATE INDEX "Testimonial_createdAt_idx" ON "public"."Testimonial"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Property_source_externalId_key" ON "public"."Property"("source", "externalId");

-- AddForeignKey
ALTER TABLE "public"."PropertyAlert" ADD CONSTRAINT "PropertyAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HomeEstimate" ADD CONSTRAINT "HomeEstimate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
