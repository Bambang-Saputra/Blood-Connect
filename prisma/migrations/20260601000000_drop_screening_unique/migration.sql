-- Migration: Drop unique constraint on JadwalDonor.screeningId
-- 
-- Why: 1 screening boleh dipakai untuk multiple schedule (donor daftar
-- di beberapa PMI dengan screening yang sama selama masih valid).
--
-- Previously: @unique caused P2002 error → server crash when donor
-- schedules 2x. Now fixed.

ALTER TABLE "JadwalDonor" DROP CONSTRAINT IF EXISTS "JadwalDonor_screeningId_key";

-- Optional: add non-unique index for read performance
CREATE INDEX IF NOT EXISTS "JadwalDonor_screeningId_idx"
  ON "JadwalDonor"("screeningId");
