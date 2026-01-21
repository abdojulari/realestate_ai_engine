-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "coListingAgentsData" JSONB,
ADD COLUMN     "coListingOfficesData" JSONB,
ADD COLUMN     "listingAgentData" JSONB,
ADD COLUMN     "listingOfficeData" JSONB;
