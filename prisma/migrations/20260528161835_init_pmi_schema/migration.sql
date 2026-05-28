-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PENDONOR', 'PASIEN', 'PMI', 'ADMIN');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('A', 'B', 'AB', 'O');

-- CreateEnum
CREATE TYPE "RhesusType" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "BloodComponent" AS ENUM ('WHOLE_BLOOD', 'PRC', 'FFP', 'TC', 'CRYO');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACC', 'SHIPPED', 'DELIVERED', 'FULFILLED', 'SEARCHING', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'EXPIRED', 'USED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PmiStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ELIGIBLE_DONOR_REQUEST', 'REQUEST_STATUS_UPDATE', 'SCHEDULE_UPDATE', 'STOCK_ALERT', 'ACCOUNT_VERIFICATION', 'GENERIC');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'STOCK_ALLOCATE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNum" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "zone" TEXT,
    "birthDate" TIMESTAMP(3),
    "role" "Role" NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pendonor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bloodType" "BloodType" NOT NULL,
    "rhesusType" "RhesusType" NOT NULL,
    "weight" DOUBLE PRECISION,
    "lastDonationDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "eligibilityReason" TEXT,
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "preferredPmiId" TEXT,

    CONSTRAINT "Pendonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PemeriksaanDonor" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "examinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "examinedBy" TEXT,
    "hemoglobinLevel" DOUBLE PRECISION NOT NULL,
    "systolicBP" INTEGER NOT NULL,
    "diastolicBP" INTEGER NOT NULL,
    "bodyTempC" DOUBLE PRECISION NOT NULL,
    "pulseRate" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "passed" BOOLEAN NOT NULL,

    CONSTRAINT "PemeriksaanDonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningAnswer" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasFever" BOOLEAN NOT NULL DEFAULT false,
    "recentSurgery" BOOLEAN NOT NULL DEFAULT false,
    "recentTattoo" BOOLEAN NOT NULL DEFAULT false,
    "isPregnantOrLactating" BOOLEAN NOT NULL DEFAULT false,
    "onMedication" BOOLEAN NOT NULL DEFAULT false,
    "hasHIVOrHepatitis" BOOLEAN NOT NULL DEFAULT false,
    "riskySexualBehavior" BOOLEAN NOT NULL DEFAULT false,
    "recentVaccination" BOOLEAN NOT NULL DEFAULT false,
    "details" TEXT,
    "passed" BOOLEAN NOT NULL,

    CONSTRAINT "ScreeningAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasien" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nik" TEXT,

    CONSTRAINT "Pasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RumahSakit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "hospitalCode" TEXT NOT NULL,
    "hospitalLoc" TEXT NOT NULL,
    "status" "PmiStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "licenseDoc" TEXT,

    CONSTRAINT "RumahSakit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StokDarah" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "bloodType" "BloodType" NOT NULL,
    "rhesusType" "RhesusType" NOT NULL,
    "component" "BloodComponent" NOT NULL DEFAULT 'WHOLE_BLOOD',
    "quantity" INTEGER NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "status" "StockStatus" NOT NULL DEFAULT 'AVAILABLE',
    "source" TEXT,
    "donorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StokDarah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermintaanDonor" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "hospitalId" TEXT,
    "bloodType" "BloodType" NOT NULL,
    "rhesusType" "RhesusType" NOT NULL,
    "component" "BloodComponent" NOT NULL DEFAULT 'WHOLE_BLOOD',
    "quantity" INTEGER NOT NULL,
    "targetHospitalName" TEXT,
    "targetHospitalAddress" TEXT,
    "doctorName" TEXT,
    "familyContact" TEXT,
    "reason" TEXT,
    "reqStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermintaanDonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAllocation" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JadwalDonor" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "pmiId" TEXT,
    "jadwal" TIMESTAMP(3) NOT NULL,
    "sesi" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "newDate" TIMESTAMP(3),
    "note" TEXT,
    "linkedRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JadwalDonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorHistory" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "donationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "volumeMl" INTEGER NOT NULL DEFAULT 450,
    "component" "BloodComponent" NOT NULL DEFAULT 'WHOLE_BLOOD',
    "note" TEXT,

    CONSTRAINT "DonorHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorNotification" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "DonorNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "meta" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_city_idx" ON "User"("city");

-- CreateIndex
CREATE INDEX "User_province_idx" ON "User"("province");

-- CreateIndex
CREATE INDEX "User_zone_idx" ON "User"("zone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Pendonor_userId_key" ON "Pendonor"("userId");

-- CreateIndex
CREATE INDEX "Pendonor_bloodType_rhesusType_isEligible_idx" ON "Pendonor"("bloodType", "rhesusType", "isEligible");

-- CreateIndex
CREATE INDEX "Pendonor_preferredPmiId_idx" ON "Pendonor"("preferredPmiId");

-- CreateIndex
CREATE INDEX "PemeriksaanDonor_donorId_examinedAt_idx" ON "PemeriksaanDonor"("donorId", "examinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pasien_userId_key" ON "Pasien"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pasien_nik_key" ON "Pasien"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "RumahSakit_userId_key" ON "RumahSakit"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RumahSakit_hospitalCode_key" ON "RumahSakit"("hospitalCode");

-- CreateIndex
CREATE INDEX "StokDarah_bloodType_rhesusType_component_status_expiryDate_idx" ON "StokDarah"("bloodType", "rhesusType", "component", "status", "expiryDate");

-- CreateIndex
CREATE INDEX "StokDarah_location_idx" ON "StokDarah"("location");

-- CreateIndex
CREATE INDEX "PermintaanDonor_reqStatus_createdAt_idx" ON "PermintaanDonor"("reqStatus", "createdAt");

-- CreateIndex
CREATE INDEX "PermintaanDonor_bloodType_rhesusType_component_idx" ON "PermintaanDonor"("bloodType", "rhesusType", "component");

-- CreateIndex
CREATE INDEX "PermintaanDonor_hospitalId_idx" ON "PermintaanDonor"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAllocation_requestId_stockId_key" ON "StockAllocation"("requestId", "stockId");

-- CreateIndex
CREATE INDEX "JadwalDonor_jadwal_status_idx" ON "JadwalDonor"("jadwal", "status");

-- CreateIndex
CREATE INDEX "JadwalDonor_pmiId_idx" ON "JadwalDonor"("pmiId");

-- CreateIndex
CREATE INDEX "DonorHistory_donorId_donationDate_idx" ON "DonorHistory"("donorId", "donationDate");

-- CreateIndex
CREATE INDEX "DonorNotification_requestId_responded_idx" ON "DonorNotification"("requestId", "responded");

-- CreateIndex
CREATE UNIQUE INDEX "DonorNotification_donorId_requestId_key" ON "DonorNotification"("donorId", "requestId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Pendonor" ADD CONSTRAINT "Pendonor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendonor" ADD CONSTRAINT "Pendonor_preferredPmiId_fkey" FOREIGN KEY ("preferredPmiId") REFERENCES "RumahSakit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PemeriksaanDonor" ADD CONSTRAINT "PemeriksaanDonor_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Pendonor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningAnswer" ADD CONSTRAINT "ScreeningAnswer_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Pendonor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pasien" ADD CONSTRAINT "Pasien_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RumahSakit" ADD CONSTRAINT "RumahSakit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StokDarah" ADD CONSTRAINT "StokDarah_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "RumahSakit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermintaanDonor" ADD CONSTRAINT "PermintaanDonor_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Pasien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermintaanDonor" ADD CONSTRAINT "PermintaanDonor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "RumahSakit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PermintaanDonor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAllocation" ADD CONSTRAINT "StockAllocation_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "StokDarah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalDonor" ADD CONSTRAINT "JadwalDonor_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Pendonor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JadwalDonor" ADD CONSTRAINT "JadwalDonor_pmiId_fkey" FOREIGN KEY ("pmiId") REFERENCES "RumahSakit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorHistory" ADD CONSTRAINT "DonorHistory_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Pendonor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorNotification" ADD CONSTRAINT "DonorNotification_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Pendonor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorNotification" ADD CONSTRAINT "DonorNotification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PermintaanDonor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
