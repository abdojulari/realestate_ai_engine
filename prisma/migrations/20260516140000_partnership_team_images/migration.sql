-- Profile photos + partnership visuals

ALTER TABLE "PartnershipTeamMember" ADD COLUMN "photoUrl" TEXT;

ALTER TABLE "PartnershipPromotion" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "PartnershipPromotion" ADD COLUMN "coverImageUrl" TEXT;
