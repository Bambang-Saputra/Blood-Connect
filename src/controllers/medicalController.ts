import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * =====================================================================
 * CONTROLLER: Medical Examination + Screening
 * =====================================================================
 * Endpoint nakes PMI untuk input hasil pemeriksaan fisik pendonor,
 * dan endpoint pendonor untuk mengisi kuesioner skrining sendiri.
 *
 * CATATAN: Pemeriksaan fisik DILAKUKAN DI PMI. Setiap checkup di-scope
 * ke PMI yang melakukan (via pmiId).
 * =====================================================================
 */

// ----- 0) Helper: cari donor by email (untuk auto-fill form PMI) -----
export async function lookupDonor(req: AuthedRequest, res: Response) {
  const email = String(req.query.email ?? "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email wajib diisi" });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { pendonor: true },
  });
  if (!user || !user.pendonor) {
    return res.status(404).json({ error: "Pendonor dengan email tersebut tidak ditemukan" });
  }
  return res.json({
    donorId: user.pendonor.id,
    name: user.name,
    email: user.email,
    bloodType: user.pendonor.bloodType,
    rhesusType: user.pendonor.rhesusType,
    city: user.city,
  });
}

// ----- 1) Pemeriksaan fisik (diisi nakes PMI) -----
const checkupSchema = z.object({
  donorId: z.string().optional(),
  donorEmail: z.string().email().optional(),
  hemoglobinLevel: z.number().min(5).max(25),
  systolicBP: z.number().int().min(60).max(220),
  diastolicBP: z.number().int().min(40).max(140),
  bodyTempC: z.number().min(34).max(42),
  pulseRate: z.number().int().min(40).max(180),
  weight: z.number().min(30).max(200),
  notes: z.string().optional(),
}).refine((d) => d.donorId || d.donorEmail, {
  message: "donorId atau donorEmail wajib diisi",
});

export async function createCheckup(req: AuthedRequest, res: Response) {
  const parsed = checkupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const d = parsed.data;

  // Resolve donor: by ID atau by email
  let donorId = d.donorId;
  if (!donorId && d.donorEmail) {
    const user = await prisma.user.findUnique({
      where: { email: d.donorEmail.toLowerCase() },
      include: { pendonor: true },
    });
    if (!user?.pendonor) {
      return res.status(404).json({ error: `Pendonor dengan email ${d.donorEmail} tidak ditemukan` });
    }
    donorId = user.pendonor.id;
  }

  const donor = await prisma.pendonor.findUnique({ where: { id: donorId! } });
  if (!donor) return res.status(404).json({ error: "Pendonor tidak ditemukan" });

  // Resolve pmiId — kalau yang input adalah user PMI, attach ke PMI mereka
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });

  // Aturan lolos: semua vital dalam rentang medis
  const passed =
    d.hemoglobinLevel >= 12.5 && d.hemoglobinLevel <= 17.0 &&
    d.systolicBP >= 100 && d.systolicBP <= 160 &&
    d.diastolicBP >= 60 && d.diastolicBP <= 100 &&
    d.bodyTempC >= 36.5 && d.bodyTempC <= 37.5 &&
    d.pulseRate >= 50 && d.pulseRate <= 100 &&
    d.weight >= 45;

  const checkup = await prisma.pemeriksaanDonor.create({
    data: {
      donorId: donorId!,
      pmiId: pmi?.id,
      hemoglobinLevel: d.hemoglobinLevel,
      systolicBP: d.systolicBP,
      diastolicBP: d.diastolicBP,
      bodyTempC: d.bodyTempC,
      pulseRate: d.pulseRate,
      weight: d.weight,
      notes: d.notes,
      passed,
      examinedBy: req.user!.id,
    },
  });

  // Update berat pendonor
  await prisma.pendonor.update({
    where: { id: donorId! },
    data: { weight: d.weight },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "CREATE",
    entity: "PemeriksaanDonor",
    entityId: checkup.id,
    after: checkup,
    ipAddress: req.ip,
  });

  return res.status(201).json({ message: "Pemeriksaan tersimpan", checkup });
}

// ----- 2) Kuesioner skrining (diisi pendonor sendiri) -----
const screeningSchema = z.object({
  hasFever: z.boolean(),
  recentSurgery: z.boolean(),
  recentTattoo: z.boolean(),
  isPregnantOrLactating: z.boolean(),
  isMenstruating: z.boolean().optional(), // khusus wanita; pria mengirim undefined → default false
  onMedication: z.boolean(),
  hasHIVOrHepatitis: z.boolean(),
  riskySexualBehavior: z.boolean(),
  recentVaccination: z.boolean(),
  details: z.string().optional(),
});

export async function submitScreening(req: AuthedRequest, res: Response) {
  const parsed = screeningSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  // Cek apakah user saat ini masih dalam masa cooldown
  if (donor.cooldownUntil && donor.cooldownUntil > new Date()) {
    return res.status(403).json({ 
      error: "Anda masih dalam masa tunggu (cooldown) medis dan tidak dapat mengisi skrining baru saat ini." 
    });
  }

  const a = parsed.data;
  const passed =
    !a.hasFever && !a.recentSurgery && !a.recentTattoo &&
    !a.isPregnantOrLactating && !a.isMenstruating && !a.hasHIVOrHepatitis &&
    !a.riskySexualBehavior && !a.recentVaccination && !a.onMedication;

  // Menentukan Durasi Cooldown & Waktu Expired
  let cooldownDays = 0;
  let customMessage = "";
  const now = new Date();
  
  if (!passed) {
    if (a.hasHIVOrHepatitis || a.riskySexualBehavior) {
      cooldownDays = 36500; // Permanen (100 tahun)
      customMessage = "Mohon maaf, Anda tidak dapat mendonorkan darah secara permanen demi keselamatan resipien.";
    } else if (a.isPregnantOrLactating) {
      cooldownDays = 270; // Masa tunda kehamilan + menyusui standar
      customMessage = "Anda ditangguhkan dari donor selama masa kehamilan & menyusui (sekitar 9 bulan ke depan).";
    } else if (a.isMenstruating) {
      cooldownDays = 5; // Penangguhan sementara selama menstruasi
      customMessage = "Donor ditangguhkan sementara selama masa menstruasi. Silakan kembali setelah selesai (~5 hari).";
    } else if (a.recentSurgery || a.recentTattoo) {
      cooldownDays = 180; // 6 Bulan
      customMessage = "Terdapat masa tunggu 6 bulan setelah operasi besar, tato, atau tindik.";
    } else if (a.onMedication || a.recentVaccination) {
      cooldownDays = 14; // 2 Minggu
      customMessage = "Terdapat masa tunggu 14 hari setelah konsumsi obat rutin atau vaksinasi.";
    } else if (a.hasFever) {
      cooldownDays = 7; // 1 Minggu
      customMessage = "Anda harus menunggu 7 hari setelah demam Anda sepenuhnya sembuh.";
    }

    // Set cooldown ke tabel pendonor
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + cooldownDays);
    
    await prisma.pendonor.update({
      where: { id: donor.id },
      data: { cooldownUntil: targetDate, isEligible: false, eligibilityReason: customMessage }
    });

  } else {
    customMessage = "Skrining lolos — silakan lanjut pilih jadwal di PMI (Form ini berlaku selama 7 Hari)";
    
    // Jika Lolos, form ini expired dalam 7 hari
    cooldownDays = 7;
  }

  // Hitung Valid Until untuk form skrining ini
  const validUntilDate = new Date(now);
  validUntilDate.setDate(validUntilDate.getDate() + cooldownDays);

  const screening = await prisma.screeningAnswer.create({
    data: { 
      donorId: donor.id, 
      ...a, 
      passed,
      validUntil: validUntilDate 
    },
  });

  return res.status(201).json({
    message: customMessage,
    screening,
  });
}

// ----- 3) Riwayat pemeriksaan pendonor -----
export async function getMyCheckups(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const [checkups, screenings] = await Promise.all([
    prisma.pemeriksaanDonor.findMany({
      where: { donorId: donor.id },
      orderBy: { examinedAt: "desc" },
      take: 10,
    }),
    prisma.screeningAnswer.findMany({
      where: { donorId: donor.id },
      orderBy: { answeredAt: "desc" },
      take: 5,
    }),
  ]);

  return res.json({ checkups, screenings });
}
