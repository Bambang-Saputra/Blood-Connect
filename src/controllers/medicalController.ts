import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

/**
 * MEDICAL CONTROLLER (Skrining + view checkups)
 *
 * NOTE: Lookup donor & checkup form sudah PINDAH ke pmiController karena
 * itu domain PMI. File ini hanya pegang:
 *   POST /medical/screening — donor isi kuesioner sendiri
 *   GET  /medical/me        — donor lihat riwayat pemeriksaan + skrining
 */

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
    message: passed ? "Skrining lolos — silakan terima permintaan & buat jadwal donor" : "Belum lolos skrining, lihat detail flag",
    screening,
  });
}

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
