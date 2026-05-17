import { prisma } from "../lib/prisma";

/**
 * =====================================================================
 * SERVICE: checkEligible (Medical Workflow)
 * =====================================================================
 * Use Case: CHECKELIGIBLE
 * Activity Diagram #4
 *
 * Standar medis (referensi PMI/Permenkes):
 *   - Usia: 17–65 tahun
 *   - Berat badan: ≥ 45 kg
 *   - Hemoglobin: 12.5 – 17.0 g/dL
 *   - Tekanan darah sistolik: 100–160 mmHg
 *   - Tekanan darah diastolik: 60–100 mmHg
 *   - Suhu tubuh: 36.5–37.5 °C
 *   - Jarak donor terakhir: minimal 60 hari
 *   - Lolos kuesioner skrining (tidak demam, tidak hamil, dll)
 *
 * Sumber data:
 *   - PemeriksaanDonor terbaru (≤ 24 jam) → vital signs
 *   - ScreeningAnswer terbaru (≤ 24 jam) → kuesioner
 *   - Pendonor.lastDonationDate → interval
 *   - User.birthDate → usia
 * =====================================================================
 */

const HB_MIN = 12.5;
const HB_MAX = 17.0;
const MIN_DAYS_SINCE_LAST = 60;
const MIN_AGE = 17;
const MAX_AGE = 65;
const MIN_WEIGHT_KG = 45;
const SYS_MIN = 100;
const SYS_MAX = 160;
const DIA_MIN = 60;
const DIA_MAX = 100;
const TEMP_MIN = 36.5;
const TEMP_MAX = 37.5;
const CHECKUP_MAX_AGE_HOURS = 24;

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  checkedAt: Date;
  missingData?: string[];
}

export async function checkEligible(donorId: string): Promise<EligibilityResult> {
  const donor = await prisma.pendonor.findUnique({
    where: { id: donorId },
    include: {
      user: { select: { birthDate: true } },
      checkups: { orderBy: { examinedAt: "desc" }, take: 1 },
      screenings: { orderBy: { answeredAt: "desc" }, take: 1 },
    },
  });

  if (!donor) throw new Error("Pendonor tidak ditemukan");

  const reasons: string[] = [];
  const missingData: string[] = [];

  // ===== 1) USIA (dari User.birthDate) =====
  if (!donor.user.birthDate) {
    missingData.push("Tanggal lahir belum diisi di profil");
  } else {
    const age = calcAge(donor.user.birthDate);
    if (age < MIN_AGE) reasons.push(`Usia (${age} tahun) di bawah minimum ${MIN_AGE} tahun.`);
    if (age > MAX_AGE) reasons.push(`Usia (${age} tahun) di atas maksimum ${MAX_AGE} tahun.`);
  }

  // ===== 2) AKTIF =====
  if (!donor.isActive) reasons.push("Status pendonor non-aktif. Hubungi admin.");

  // ===== 3) JARAK DONOR TERAKHIR =====
  if (donor.lastDonationDate) {
    const daysSince = Math.floor((Date.now() - donor.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince < MIN_DAYS_SINCE_LAST) {
      reasons.push(`Baru ${daysSince} hari sejak donor terakhir. Minimal ${MIN_DAYS_SINCE_LAST} hari.`);
    }
  }

  // ===== 4) PEMERIKSAAN FISIK (Hb, BP, Suhu, BB) =====
  const lastCheckup = donor.checkups[0];
  if (!lastCheckup) {
    missingData.push("Belum ada hasil pemeriksaan fisik. Lakukan pemeriksaan di RS/UTD.");
  } else {
    const ageHours = (Date.now() - lastCheckup.examinedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > CHECKUP_MAX_AGE_HOURS) {
      reasons.push(`Pemeriksaan fisik kadaluarsa (${Math.floor(ageHours)} jam lalu, max ${CHECKUP_MAX_AGE_HOURS} jam).`);
    } else {
      // Hemoglobin
      if (lastCheckup.hemoglobinLevel < HB_MIN)
        reasons.push(`Hemoglobin (${lastCheckup.hemoglobinLevel} g/dL) di bawah min ${HB_MIN} g/dL.`);
      if (lastCheckup.hemoglobinLevel > HB_MAX)
        reasons.push(`Hemoglobin (${lastCheckup.hemoglobinLevel} g/dL) di atas max ${HB_MAX} g/dL.`);

      // Berat
      if (lastCheckup.weight < MIN_WEIGHT_KG)
        reasons.push(`Berat badan (${lastCheckup.weight} kg) di bawah minimum ${MIN_WEIGHT_KG} kg.`);

      // Tekanan darah
      if (lastCheckup.systolicBP < SYS_MIN || lastCheckup.systolicBP > SYS_MAX)
        reasons.push(`Tekanan sistolik (${lastCheckup.systolicBP} mmHg) di luar rentang ${SYS_MIN}–${SYS_MAX}.`);
      if (lastCheckup.diastolicBP < DIA_MIN || lastCheckup.diastolicBP > DIA_MAX)
        reasons.push(`Tekanan diastolik (${lastCheckup.diastolicBP} mmHg) di luar rentang ${DIA_MIN}–${DIA_MAX}.`);

      // Suhu
      if (lastCheckup.bodyTempC < TEMP_MIN || lastCheckup.bodyTempC > TEMP_MAX)
        reasons.push(`Suhu tubuh (${lastCheckup.bodyTempC} °C) di luar rentang normal ${TEMP_MIN}–${TEMP_MAX}.`);
    }
  }

  // ===== 5) SKRINING KUESIONER =====
  const lastScreening = donor.screenings[0];
  if (!lastScreening) {
    missingData.push("Belum mengisi kuesioner skrining donor.");
  } else {
    const ageHours = (Date.now() - lastScreening.answeredAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > CHECKUP_MAX_AGE_HOURS) {
      reasons.push("Kuesioner skrining kadaluarsa, isi ulang.");
    } else if (!lastScreening.passed) {
      const flags: string[] = [];
      if (lastScreening.hasFever) flags.push("demam");
      if (lastScreening.recentSurgery) flags.push("operasi <6 bulan");
      if (lastScreening.recentTattoo) flags.push("tato/tindik <6 bulan");
      if (lastScreening.isPregnantOrLactating) flags.push("hamil/menyusui");
      if (lastScreening.hasHIVOrHepatitis) flags.push("HIV/Hepatitis");
      if (lastScreening.riskySexualBehavior) flags.push("perilaku seksual berisiko");
      if (lastScreening.recentVaccination) flags.push("vaksinasi <2 minggu");
      if (lastScreening.onMedication) flags.push("sedang konsumsi obat");
      reasons.push(`Skrining gagal: ${flags.join(", ") || "lihat detail"}.`);
    }
  }

  const allReasons = [...missingData, ...reasons];
  const eligible = allReasons.length === 0;

  await prisma.pendonor.update({
    where: { id: donor.id },
    data: { isEligible: eligible, eligibilityReason: eligible ? null : allReasons.join(" | ") },
  });

  return {
    eligible,
    reasons,
    missingData,
    checkedAt: new Date(),
  };
}

function calcAge(birthDate: Date): number {
  const diff = Date.now() - birthDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
