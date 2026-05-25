-- AlterTable
ALTER TABLE "User" ADD COLUMN     "province" TEXT,
ADD COLUMN     "zone" TEXT;

-- CreateIndex
CREATE INDEX "User_province_idx" ON "User"("province");

-- CreateIndex
CREATE INDEX "User_zone_idx" ON "User"("zone");
