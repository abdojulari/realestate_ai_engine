-- Tenant admin self-reference: team members point at their admin User
ALTER TABLE "User" ADD COLUMN "adminId" INTEGER;

CREATE INDEX "User_adminId_idx" ON "User"("adminId");

ALTER TABLE "User" ADD CONSTRAINT "User_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
