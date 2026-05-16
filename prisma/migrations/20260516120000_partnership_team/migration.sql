-- Partnership & Team (tenant-scoped specialists + partner promotions)

CREATE TABLE "PartnershipTeamInvite" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnershipTeamInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnershipTeamInvite_tokenHash_key" ON "PartnershipTeamInvite"("tokenHash");

CREATE INDEX "PartnershipTeamInvite_adminId_idx" ON "PartnershipTeamInvite"("adminId");

CREATE INDEX "PartnershipTeamInvite_adminId_category_idx" ON "PartnershipTeamInvite"("adminId", "category");

ALTER TABLE "PartnershipTeamInvite" ADD CONSTRAINT "PartnershipTeamInvite_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PartnershipTeamMember" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "bio" TEXT,
    "credentials" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "inviteId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnershipTeamMember_inviteId_key" ON "PartnershipTeamMember"("inviteId");

CREATE INDEX "PartnershipTeamMember_adminId_category_approved_sortOrder_idx" ON "PartnershipTeamMember"("adminId", "category", "approved", "sortOrder");

ALTER TABLE "PartnershipTeamMember" ADD CONSTRAINT "PartnershipTeamMember_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PartnershipTeamMember" ADD CONSTRAINT "PartnershipTeamMember_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "PartnershipTeamInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PartnershipPromotion" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "categoryTag" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "offerSummary" TEXT,
    "websiteUrl" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnershipPromotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnershipPromotion_adminId_approved_sortOrder_idx" ON "PartnershipPromotion"("adminId", "approved", "sortOrder");

ALTER TABLE "PartnershipPromotion" ADD CONSTRAINT "PartnershipPromotion_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
