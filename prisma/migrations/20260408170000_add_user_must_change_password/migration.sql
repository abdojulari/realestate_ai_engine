-- First-login security: force password change after provisioning (matches schema.prisma User.mustChangePassword)
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
