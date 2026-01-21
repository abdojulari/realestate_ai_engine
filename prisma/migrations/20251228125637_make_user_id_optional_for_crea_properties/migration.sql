-- DropForeignKey
ALTER TABLE "public"."Property" DROP CONSTRAINT "Property_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Property" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
