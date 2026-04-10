-- Admin subscription tier (basic, silver, gold, platinum); super_admin may use null
ALTER TABLE "User" ADD COLUMN "subscriptionTier" TEXT;
