-- Sync: Prisma `migrate diff` (migrations folder → schema.prisma) with shadow DB.
-- Regenerate if schema drifts: node scripts/check.mjs prisma-migration-drift

-- DropIndex
DROP INDEX "ContentBlock_key_key";

-- DropIndex
DROP INDEX "EmailTemplate_name_key";

-- DropIndex
DROP INDEX "Setting_key_key";

-- DropIndex
DROP INDEX "Testimonial_approved_featured_displayOrder_idx";

-- AlterTable
ALTER TABLE "ContentBlock" ADD COLUMN     "adminId" INTEGER;

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "adminId" INTEGER;

-- AlterTable
ALTER TABLE "HomeEstimate" ADD COLUMN     "adminId" INTEGER;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "adminId" INTEGER,
ADD COLUMN     "daysOnMarket" INTEGER,
ADD COLUMN     "firstEntryPrice" DOUBLE PRECISION,
ADD COLUMN     "originalEntryTimestamp" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PropertyInquiry" ADD COLUMN     "adminId" INTEGER;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "adminId" INTEGER;

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "adminId" INTEGER;

-- CreateTable
CREATE TABLE "TenantSettings" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "businessName" TEXT,
    "tagline" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#1976D2',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "socialLinks" JSONB,
    "brokerageName" TEXT,
    "brokerageLogoUrl" TEXT,
    "footerDisclaimer" TEXT,
    "copyrightName" TEXT,
    "developerName" TEXT,
    "developerUrl" TEXT,
    "subdomain" TEXT,
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatLead" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "conversationLog" JSONB,
    "source" TEXT NOT NULL DEFAULT 'chat_widget',
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLegalReview" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "redFlags" JSONB NOT NULL,
    "importantNotes" JSONB NOT NULL,
    "importantDates" JSONB NOT NULL,
    "legalSummary" TEXT NOT NULL,
    "buyerImpact" TEXT NOT NULL,
    "sellerImpact" TEXT NOT NULL,
    "partyRepresenting" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLegalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDateAlert" (
    "id" SERIAL NOT NULL,
    "documentId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "daysBefore" INTEGER NOT NULL DEFAULT 2,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDateAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'website',
    "tags" JSONB,
    "metadata" JSONB,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterTemplate" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "plainTextContent" TEXT,
    "previewText" TEXT,
    "category" TEXT,
    "tags" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "attachments" JSONB,
    "variables" JSONB,
    "designSettings" JSONB,
    "createdBy" INTEGER,
    "lastModifiedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "templateId" INTEGER,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "plainTextContent" TEXT,
    "previewText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "frequency" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "bounceCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribeCount" INTEGER NOT NULL DEFAULT 0,
    "attachments" JSONB,
    "tags" JSONB,
    "targetFilters" JSONB,
    "abTestConfig" JSONB,
    "automationSettings" JSONB,
    "createdBy" INTEGER,
    "lastModifiedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentNewsletter" (
    "id" SERIAL NOT NULL,
    "newsletterId" INTEGER NOT NULL,
    "subscriberId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "bounceReason" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentNewsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterAutomation" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "frequency" TEXT,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "templateId" INTEGER,
    "subject" TEXT,
    "targetFilters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#1976D2',
    "icon" TEXT DEFAULT 'mdi-folder',
    "parentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "contentHtml" TEXT,
    "coverImage" TEXT,
    "coverImageAlt" TEXT,
    "authorId" INTEGER,
    "categoryId" INTEGER,
    "tags" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "readTime" INTEGER,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" JSONB,
    "canonicalUrl" TEXT,
    "ogImage" TEXT,
    "hashnodeId" TEXT,
    "hashnodeUrl" TEXT,
    "syncToHashnode" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTag" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPriceHistory" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "event" TEXT NOT NULL,
    "changeAmt" DOUBLE PRECISION,
    "changePct" DOUBLE PRECISION,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingTemplate" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "propertyId" INTEGER,
    "propertyAddress" TEXT,
    "description" TEXT,
    "aiDescription" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'luxury',
    "primaryColor" TEXT DEFAULT '#1a1a2e',
    "accentColor" TEXT DEFAULT '#c9a96e',
    "fontFamily" TEXT DEFAULT 'Playfair Display',
    "images" JSONB,
    "floorPlans" JSONB,
    "brandingLogo" TEXT,
    "features" JSONB,
    "layout" TEXT NOT NULL DEFAULT 'hero-gallery',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "slug" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmClient" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT,
    "sourceId" INTEGER,
    "notes" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmTransaction" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "clientId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "propertyAddress" TEXT,
    "salePrice" DOUBLE PRECISION,
    "closingDate" TIMESTAMP(3),
    "possessionDate" TIMESTAMP(3),
    "notes" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentStage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmChecklistItem" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "priority" TEXT DEFAULT 'normal',
    "reminders" JSONB,
    "recurrence" JSONB,
    "propertyId" INTEGER,
    "clientId" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingSlot" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "dayOfWeek" INTEGER,
    "specificDate" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "maxBookings" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "propertyId" INTEGER,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "slotId" INTEGER,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "clientPhone" TEXT,
    "propertyId" INTEGER,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "type" TEXT NOT NULL DEFAULT 'showing',
    "notes" TEXT,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookIntegration" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "accessToken" TEXT,
    "pageAccessToken" TEXT,
    "pageId" TEXT,
    "pageName" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "permissions" JSONB,
    "tokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "adAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacebookPost" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "propertyId" INTEGER,
    "postId" TEXT,
    "content" TEXT NOT NULL,
    "images" JSONB,
    "link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledFor" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "engagement" JSONB,
    "postType" TEXT NOT NULL DEFAULT 'listing',
    "metadata" JSONB,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacebookPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCutSearch" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCutSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "requestType" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ipAddress" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadForm" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '["name","email","phone","message"]',
    "disclaimerText" TEXT,
    "privacyText" TEXT,
    "thankYouMessage" TEXT,
    "brandColor" TEXT DEFAULT '#1976D2',
    "status" TEXT NOT NULL DEFAULT 'active',
    "submissions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_adminId_key" ON "TenantSettings"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_subdomain_key" ON "TenantSettings"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSettings_customDomain_key" ON "TenantSettings"("customDomain");

-- CreateIndex
CREATE INDEX "ChatLead_adminId_email_idx" ON "ChatLead"("adminId", "email");

-- CreateIndex
CREATE INDEX "ChatLead_adminId_status_idx" ON "ChatLead"("adminId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentLegalReview_documentId_key" ON "DocumentLegalReview"("documentId");

-- CreateIndex
CREATE INDEX "DocumentLegalReview_documentId_idx" ON "DocumentLegalReview"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDateAlert_documentId_idx" ON "DocumentDateAlert"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDateAlert_dueDate_sentAt_idx" ON "DocumentDateAlert"("dueDate", "sentAt");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_adminId_status_subscribedAt_idx" ON "NewsletterSubscriber"("adminId", "status", "subscribedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_adminId_email_key" ON "NewsletterSubscriber"("adminId", "email");

-- CreateIndex
CREATE INDEX "NewsletterTemplate_adminId_category_isActive_idx" ON "NewsletterTemplate"("adminId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterTemplate_adminId_name_key" ON "NewsletterTemplate"("adminId", "name");

-- CreateIndex
CREATE INDEX "Newsletter_adminId_status_scheduledFor_idx" ON "Newsletter"("adminId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Newsletter_adminId_frequency_status_idx" ON "Newsletter"("adminId", "frequency", "status");

-- CreateIndex
CREATE INDEX "Newsletter_createdAt_idx" ON "Newsletter"("createdAt");

-- CreateIndex
CREATE INDEX "SentNewsletter_newsletterId_status_idx" ON "SentNewsletter"("newsletterId", "status");

-- CreateIndex
CREATE INDEX "SentNewsletter_subscriberId_idx" ON "SentNewsletter"("subscriberId");

-- CreateIndex
CREATE INDEX "SentNewsletter_sentAt_idx" ON "SentNewsletter"("sentAt");

-- CreateIndex
CREATE INDEX "NewsletterAutomation_adminId_isActive_nextRun_idx" ON "NewsletterAutomation"("adminId", "isActive", "nextRun");

-- CreateIndex
CREATE INDEX "NewsletterAutomation_triggerType_frequency_idx" ON "NewsletterAutomation"("triggerType", "frequency");

-- CreateIndex
CREATE INDEX "BlogCategory_adminId_isActive_sortOrder_idx" ON "BlogCategory"("adminId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_adminId_name_key" ON "BlogCategory"("adminId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_adminId_slug_key" ON "BlogCategory"("adminId", "slug");

-- CreateIndex
CREATE INDEX "BlogPost_adminId_status_publishedAt_idx" ON "BlogPost"("adminId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

-- CreateIndex
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");

-- CreateIndex
CREATE INDEX "BlogPost_isFeatured_status_idx" ON "BlogPost"("isFeatured", "status");

-- CreateIndex
CREATE INDEX "BlogPost_tags_idx" ON "BlogPost"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_adminId_slug_key" ON "BlogPost"("adminId", "slug");

-- CreateIndex
CREATE INDEX "BlogTag_adminId_idx" ON "BlogTag"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_adminId_name_key" ON "BlogTag"("adminId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_adminId_slug_key" ON "BlogTag"("adminId", "slug");

-- CreateIndex
CREATE INDEX "PropertyPriceHistory_propertyId_createdAt_idx" ON "PropertyPriceHistory"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyPriceHistory_event_createdAt_idx" ON "PropertyPriceHistory"("event", "createdAt");

-- CreateIndex
CREATE INDEX "ListingTemplate_adminId_status_idx" ON "ListingTemplate"("adminId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ListingTemplate_adminId_slug_key" ON "ListingTemplate"("adminId", "slug");

-- CreateIndex
CREATE INDEX "CrmClient_adminId_type_status_idx" ON "CrmClient"("adminId", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CrmClient_adminId_email_key" ON "CrmClient"("adminId", "email");

-- CreateIndex
CREATE INDEX "CrmTransaction_adminId_status_idx" ON "CrmTransaction"("adminId", "status");

-- CreateIndex
CREATE INDEX "CrmTransaction_clientId_idx" ON "CrmTransaction"("clientId");

-- CreateIndex
CREATE INDEX "CrmChecklistItem_transactionId_sortOrder_idx" ON "CrmChecklistItem"("transactionId", "sortOrder");

-- CreateIndex
CREATE INDEX "CalendarEvent_adminId_startTime_endTime_idx" ON "CalendarEvent"("adminId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "CalendarEvent_adminId_type_status_idx" ON "CalendarEvent"("adminId", "type", "status");

-- CreateIndex
CREATE INDEX "BookingSlot_adminId_dayOfWeek_isActive_idx" ON "BookingSlot"("adminId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "BookingSlot_adminId_specificDate_idx" ON "BookingSlot"("adminId", "specificDate");

-- CreateIndex
CREATE INDEX "Booking_adminId_dateTime_idx" ON "Booking"("adminId", "dateTime");

-- CreateIndex
CREATE INDEX "Booking_adminId_status_idx" ON "Booking"("adminId", "status");

-- CreateIndex
CREATE INDEX "Booking_clientEmail_idx" ON "Booking"("clientEmail");

-- CreateIndex
CREATE UNIQUE INDEX "FacebookIntegration_adminId_key" ON "FacebookIntegration"("adminId");

-- CreateIndex
CREATE INDEX "FacebookPost_adminId_status_idx" ON "FacebookPost"("adminId", "status");

-- CreateIndex
CREATE INDEX "FacebookPost_propertyId_idx" ON "FacebookPost"("propertyId");

-- CreateIndex
CREATE INDEX "PriceCutSearch_adminId_isActive_idx" ON "PriceCutSearch"("adminId", "isActive");

-- CreateIndex
CREATE INDEX "PrivacyRequest_email_idx" ON "PrivacyRequest"("email");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_idx" ON "PrivacyRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LeadForm_slug_key" ON "LeadForm"("slug");

-- CreateIndex
CREATE INDEX "LeadForm_adminId_idx" ON "LeadForm"("adminId");

-- CreateIndex
CREATE INDEX "LeadForm_slug_idx" ON "LeadForm"("slug");

-- CreateIndex
CREATE INDEX "ContentBlock_adminId_idx" ON "ContentBlock"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_adminId_key_key" ON "ContentBlock"("adminId", "key");

-- CreateIndex
CREATE INDEX "EmailTemplate_adminId_idx" ON "EmailTemplate"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_adminId_name_key" ON "EmailTemplate"("adminId", "name");

-- CreateIndex
CREATE INDEX "HomeEstimate_adminId_idx" ON "HomeEstimate"("adminId");

-- CreateIndex
CREATE INDEX "Property_adminId_idx" ON "Property"("adminId");

-- CreateIndex
CREATE INDEX "PropertyInquiry_adminId_idx" ON "PropertyInquiry"("adminId");

-- CreateIndex
CREATE INDEX "Setting_adminId_idx" ON "Setting"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_adminId_key_key" ON "Setting"("adminId", "key");

-- CreateIndex
CREATE INDEX "Testimonial_adminId_approved_featured_displayOrder_idx" ON "Testimonial"("adminId", "approved", "featured", "displayOrder");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeEstimate" ADD CONSTRAINT "HomeEstimate_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatLead" ADD CONSTRAINT "ChatLead_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLegalReview" ADD CONSTRAINT "DocumentLegalReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDateAlert" ADD CONSTRAINT "DocumentDateAlert_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterTemplate" ADD CONSTRAINT "NewsletterTemplate_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Newsletter" ADD CONSTRAINT "Newsletter_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NewsletterTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentNewsletter" ADD CONSTRAINT "SentNewsletter_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentNewsletter" ADD CONSTRAINT "SentNewsletter_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterAutomation" ADD CONSTRAINT "NewsletterAutomation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogCategory" ADD CONSTRAINT "BlogCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogTag" ADD CONSTRAINT "BlogTag_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPriceHistory" ADD CONSTRAINT "PropertyPriceHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingTemplate" ADD CONSTRAINT "ListingTemplate_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmClient" ADD CONSTRAINT "CrmClient_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTransaction" ADD CONSTRAINT "CrmTransaction_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTransaction" ADD CONSTRAINT "CrmTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "CrmClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmChecklistItem" ADD CONSTRAINT "CrmChecklistItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "CrmTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingSlot" ADD CONSTRAINT "BookingSlot_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookIntegration" ADD CONSTRAINT "FacebookIntegration_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceCutSearch" ADD CONSTRAINT "PriceCutSearch_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadForm" ADD CONSTRAINT "LeadForm_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
