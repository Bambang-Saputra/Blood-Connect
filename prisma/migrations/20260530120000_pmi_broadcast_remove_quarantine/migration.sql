-- Migration: PMI Broadcast feature + remove quarantine workflow
-- Changes:
--   1. Add PMI_BROADCAST to NotificationType enum
--   2. Create BroadcastStatus enum
--   3. Create PmiBroadcast table
--   4. Change StokDarah.status default from QUARANTINE to AVAILABLE
--      (existing rows untouched — only new INSERTs use new default)

-- 1) Add new NotificationType value
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PMI_BROADCAST';

-- 2) BroadcastStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BroadcastStatus') THEN
    CREATE TYPE "BroadcastStatus" AS ENUM ('OPEN', 'CLOSED', 'EXPIRED');
  END IF;
END $$;

-- 3) PmiBroadcast table
CREATE TABLE IF NOT EXISTS "PmiBroadcast" (
    "id"             TEXT NOT NULL,
    "pmiId"          TEXT NOT NULL,
    "bloodType"      "BloodType" NOT NULL,
    "rhesusType"     "RhesusType" NOT NULL,
    "targetQuantity" INTEGER NOT NULL,
    "filledQuantity" INTEGER NOT NULL DEFAULT 0,
    "message"        TEXT,
    "status"         "BroadcastStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmiBroadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PmiBroadcast_pmiId_status_createdAt_idx"
  ON "PmiBroadcast"("pmiId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "PmiBroadcast_bloodType_rhesusType_status_idx"
  ON "PmiBroadcast"("bloodType", "rhesusType", "status");

ALTER TABLE "PmiBroadcast"
  ADD CONSTRAINT "PmiBroadcast_pmiId_fkey"
  FOREIGN KEY ("pmiId") REFERENCES "PMI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4) Change default status to AVAILABLE
ALTER TABLE "StokDarah" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
