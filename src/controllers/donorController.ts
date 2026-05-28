import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { checkEligible } from "../services/eligibilityService";
import { AuthedRequest } from "../middleware/auth";
import { ScheduleStatus } from "@prisma/client";
import { notifyUser } from "../lib/notification";

/**
 * PENDONOR CONTROLLER
 *   POST /donor/screening      — isi kuesioner skrining
 *   GET  /donor/me             — profil donor
 *   GET  /donor/history        — riwayat donor
 *   GET  /donor/notifications  — permintaan untuk anda
 *   POST /donor/notifications/:id/accept — terima permintaan + pilih jadwal
 *   POST /donor/schedules      — buat jadwal donor (tanggal/jam/PMI)
 *   GET  /donor/schedules      — list jadwal saya
 *   GET  /donor/screening/latest  — status skrining terbaru
 */

// ===================== GET /donor/me =====================
export async function getMe(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: {
      user: { select: { name: true, email: true, city: true, birthDate: true } },
      checkups: { orderBy: { examinedAt: "desc" }, take: 1 },
      screenings: { orderBy: { answeredAt: "desc" }, take: 1 },
      preferredPmi: { select: { id: true, pmiName: true, pmiLoc: true } },
    },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });
  return res.json(donor);
}

// ===================== GET /donor/screening/latest =====================
// Tampilkan status skrining + masa tunggu kalau gagal
export async function getLatestScreening(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const latest = await prisma.screeningAnswer.findFirst({
    where: { donorId: donor.id },
    orderBy: { answeredAt: "desc" },
  });
  if (!latest) return res.json({ exists: false });

  // Skrining berlaku 24 jam
  const ageHours = (Date.now() - latest.answeredAt.getTime()) / (1000 * 60 * 60);
  const stillValid = ageHours <= 24;

  // Bangun list waiting reasons
  const waitingReasons: { flag: string; waitDays: number; reason: string }[] = [];
  if (latest.hasFever) waitingReasons.push({ flag: "Demam", waitDays: 14, reason: "Tunggu 2 minggu setelah sembuh" });
  if (latest.recentSurgery) waitingReasons.push({ flag: "Operasi besar", waitDays: 180, reason: "Tunggu 6 bulan setelah operasi" });
  if (latest.recentTattoo) waitingReasons.push({ flag: "Tato / tindik", waitDays: 180, reason: "Tunggu 6 bulan" });
  if (latest.isPregnantOrLactating) waitingReasons.push({ flag: "Hamil/menyusui", waitDays: 270, reason: "Tunggu hingga selesai menyusui + 3 bulan" });
  if (latest.onMedication) waitingReasons.push({ flag: "Sedang minum obat", waitDays: 7, reason: "Tunggu sampai selesai pengobatan" });
  if (latest.hasHIVOrHepatitis) waitingReasons.push({ flag: "HIV/Hepatitis", waitDays: -1, reason: "Permanen tidak bisa donor (alasan medis)" });
  if (latest.riskySexualBehavior) waitingReasons.push({ flag: "Perilaku berisiko", waitDays: 365, reason: "Tunggu 12 bulan" });
  if (latest.recentVaccination) waitingReasons.push({ flag: "Vaksinasi", waitDays: 14, reason: "Tunggu 2 minggu setelah vaksin" });

  return res.json({
    exists: true,
    passed: latest.passed,
    answeredAt: latest.answeredAt,
    stillValid,
    waitingReasons,
  });
}

// ===================== POST /donor/check-eligible (legacy — keep for compat) =====================
export async function checkEligibleHandler(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const result = await checkEligible(donor.id);
  return res.json(result);
}

// ===================== POST /donor/schedules =====================
// Donor pilih jadwal datang ke PMI untuk donor
const scheduleSchema = z.object({
  jadwal: z.string().datetime(),
  sesi: z.enum(["PAGI", "SIANG", "SORE"]),
  pmiId: z.string(),
  linkedRequestId: z.string().optional(),  // kalau bersedia ACC request tertentu
});

export async function createSchedule(req: AuthedRequest, res: Response) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: { screenings: { orderBy: { answeredAt: "desc" }, take: 1 } },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  // Validasi: harus lolos skrining + screening masih valid (24 jam)
  const latestScreening = donor.screenings[0];
  if (!latestScreening || !latestScreening.passed) {
    return res.status(400).json({ error: "Anda belum lolos skrining kesehatan" });
  }
  const screeningAgeHours = (Date.now() - latestScreening.answeredAt.getTime()) / (1000 * 60 * 60);
  if (screeningAgeHours > 24) {
    return res.status(400).json({ error: "Skrining sudah kadaluarsa, isi ulang" });
  }

  // Validasi PMI ada & verified
  const pmi = await prisma.pMI.findUnique({ where: { id: parsed.data.pmiId } });
  if (!pmi || pmi.status !== "VERIFIED") {
    return res.status(400).json({ error: "PMI tidak valid" });
  }

  const schedule = await prisma.jadwalDonor.create({
    data: {
      donorId: donor.id,
      pmiId: parsed.data.pmiId,
      jadwal: new Date(parsed.data.jadwal),
      sesi: parsed.data.sesi,
      status: ScheduleStatus.PENDING,
      linkedRequestId: parsed.data.linkedRequestId,
    },
  });

  // Notif PMI bahwa donor akan datang
  const pmiWithUser = await prisma.pMI.findUnique({
    where: { id: parsed.data.pmiId },
    include: { user: true },
  });
  if (pmiWithUser) {
    await notifyUser({
      userId: pmiWithUser.user.id,
      type: "SCHEDULE_UPDATE",
      title: "📅 Pendonor Akan Datang",
      body: `${req.user!.email} akan donor pada ${new Date(parsed.data.jadwal).toLocaleDateString("id-ID")} sesi ${parsed.data.sesi}.`,
      meta: { scheduleId: schedule.id },
    });
  }

  return res.status(201).json({ message: "Jadwal donor berhasil dibuat", schedule });
}

// ===================== GET /donor/schedules =====================
export async function getMySchedules(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const data = await prisma.jadwalDonor.findMany({
    where: { donorId: donor.id },
    include: { pmi: { select: { pmiName: true, pmiLoc: true } } },
    orderBy: { jadwal: "desc" },
    take: 20,
  });
  return res.json({ data });
}

// ===================== GET /donor/history =====================
export async function getDonorHistory(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const history = await prisma.donorHistory.findMany({
    where: { donorId: donor.id },
    orderBy: { donationDate: "desc" },
  });
  return res.json({ data: history });
}

// ===================== GET /donor/notifications =====================
export async function listMyNotifications(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const notifs = await prisma.donorNotification.findMany({
    where: { donorId: donor.id, responded: false },
    include: {
      request: {
        select: {
          id: true,
          bloodType: true,
          rhesusType: true,
          quantity: true,
          component: true,
          createdAt: true,
          pmi: { select: { id: true, pmiName: true, pmiLoc: true } },
        },
      },
    },
    orderBy: { notifiedAt: "desc" },
  });
  return res.json({ data: notifs });
}

// ===================== POST /donor/notifications/:requestId/respond =====================
// Donor klik "Bersedia" / "Tolak" dari permintaan
const respondSchema = z.object({ accepted: z.boolean() });

export async function respondNotification(req: AuthedRequest, res: Response) {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: { screenings: { orderBy: { answeredAt: "desc" }, take: 1 } },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  // Validasi skrining harus lolos kalau accept
  if (parsed.data.accepted) {
    const latestScreening = donor.screenings[0];
    if (!latestScreening || !latestScreening.passed) {
      return res.status(400).json({ error: "Isi skrining dulu sebelum menerima permintaan" });
    }
    const ageHours = (Date.now() - latestScreening.answeredAt.getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      return res.status(400).json({ error: "Skrining kadaluarsa, isi ulang dulu" });
    }
  }

  const notif = await prisma.donorNotification.findUnique({
    where: { donorId_requestId: { donorId: donor.id, requestId: req.params.id } },
    include: { request: { include: { patient: { include: { user: true } }, pmi: { include: { user: true } } } } },
  });
  if (!notif) return res.status(404).json({ error: "Notifikasi tidak ditemukan" });

  await prisma.donorNotification.update({
    where: { id: notif.id },
    data: { responded: true, accepted: parsed.data.accepted, respondedAt: new Date() },
  });

  if (parsed.data.accepted && notif.request.pmi) {
    await notifyUser({
      userId: notif.request.pmi.user.id,
      type: "REQUEST_STATUS_UPDATE",
      title: "🤝 Pendonor Bersedia Membantu",
      body: `Seorang pendonor menerima broadcast permintaan. Silakan koordinasi jadwal donor.`,
      meta: { requestId: notif.requestId, donorId: donor.id },
    });
  }

  return res.json({
    message: parsed.data.accepted
      ? "Terima kasih! Silakan pilih jadwal donor di PMI."
      : "Respons tercatat",
    requireSchedule: parsed.data.accepted,
    pmiId: notif.request.pmiId,
  });
}
