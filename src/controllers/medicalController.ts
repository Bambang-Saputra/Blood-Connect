import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * =====================================================================
 * CONTROLLER: Medical Examination + Screening
 * =====================================================================
 * Endpoint nakes/admin RS untuk input hasil pemeriksaan fisik pendonor,
 * dan endpoint pendonor untuk mengisi kuesioner skrining sendiri.
 * =====================================================================
 */

// ----- 0) Helper: cari donor by email (untuk auto-fill form RS) -----
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

// ----- 1) Pemeriksaan fisik (diisi nakes/admin) -----
// Terima donorId ATAU donorEmail
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

  // Pastikan donor ada
  const donor = await prisma.pendonor.findUnique({ where: { id: donorId! } });
  if (!donor) return res.status(404).json({ error: "Pendonor tidak ditemukan" });

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

  const a = parsed.data;
  // Aturan: lolos jika TIDAK ada flag berisiko
  const passed =
    !a.hasFever && !a.recentSurgery && !a.recentTattoo &&
    !a.isPregnantOrLactating && !a.hasHIVOrHepatitis &&
    !a.riskySexualBehavior && !a.recentVaccination && !a.onMedication;

  const screening = await prisma.screeningAnswer.create({
    data: { donorId: donor.id, ...a, passed },
  });

  return res.status(201).json({
    message: passed ? "Skrining lolos — silakan lanjut ke pemeriksaan fisik" : "Belum lolos skrining, lihat alasan",
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
