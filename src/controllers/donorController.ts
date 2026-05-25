import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { checkEligible } from "../services/eligibilityService";
import { AuthedRequest } from "../middleware/auth";
import { NotificationType, ScheduleStatus } from "@prisma/client";
import { notifyUser } from "../lib/notification";

/**
 * CONTROLLER: Pendonor
 *   POST  /api/donor/check-eligible           — Use Case CHECKELIGIBLE
 *   POST  /api/donor/schedules                — Use Case DAFTAR DONOR
 *   GET   /api/donor/history                  — Use Case HISTORY
 *   GET   /api/donor/notifications            — list permintaan dari MatchSystem
 *   POST  /api/donor/notifications/:id/respond
 *   GET   /api/donor/me                       — info pendonor + status
 */

export async function checkEligibleHandler(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const result = await checkEligible(donor.id);
  return res.json(result);
}

const scheduleSchema = z.object({
  jadwal: z.string().datetime(),
  sesi: z.enum(["PAGI", "SIANG", "SORE"]),
});

export async function createSchedule(req: AuthedRequest, res: Response) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  if (!donor.isEligible) {
    return res.status(400).json({
      error: "Pendaftaran ditolak. Lakukan checkEligible dahulu.",
      reason: donor.eligibilityReason,
    });
  }

  const schedule = await prisma.jadwalDonor.create({
    data: {
      donorId: donor.id,
      jadwal: new Date(parsed.data.jadwal),
      sesi: parsed.data.sesi,
      status: ScheduleStatus.PENDING,
    },
  });

  return res.status(201).json({ message: "Pendaftaran berhasil, menunggu konfirmasi admin", schedule });
}

export async function getDonorHistory(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const history = await prisma.donorHistory.findMany({
    where: { donorId: donor.id },
    orderBy: { donationDate: "desc" },
  });

  return res.json({ data: history });
}

// List notifikasi permintaan darah (dari MatchSystem) yang menunggu respons
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
          urgency: true,
          component: true,
          createdAt: true,
        },
      },
    },
    orderBy: { notifiedAt: "desc" },
  });
  return res.json({ data: notifs });
}

const respondSchema = z.object({ accepted: z.boolean() });

export async function respondNotification(req: AuthedRequest, res: Response) {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  // Path param :id di sini = requestId (sesuai route /donor/notifications/:id/respond)
  const notif = await prisma.donorNotification.findUnique({
    where: { donorId_requestId: { donorId: donor.id, requestId: req.params.id } },
    include: { request: { include: { patient: { include: { user: true } } } } },
  });
  if (!notif) return res.status(404).json({ error: "Notifikasi tidak ditemukan" });

  await prisma.donorNotification.update({
    where: { id: notif.id },
    data: { responded: true, accepted: parsed.data.accepted, respondedAt: new Date() },
  });

  if (parsed.data.accepted && notif.request.patient) {
    await notifyUser({
      userId: notif.request.patient.userId,
      type: NotificationType.REQUEST_STATUS_UPDATE,
      title: "Pendonor Bersedia Membantu",
      body: "Seorang pendonor menerima permintaan darah Anda. Tim medis akan menghubungi.",
      meta: { requestId: notif.requestId },
    });
  }

  return res.json({ message: "Respons tercatat" });
}

// =====================================================================
// GET /api/donor/open-requests
// Browse semua request darah yang masih butuh donor — proaktif
// =====================================================================
export async function listOpenRequests(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: { user: true },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  // Pasien yang bisa diterima darah donor (recipient → donor compatibility reverse)
  // Donor O+ bisa donor ke: O+, A+, B+, AB+
  // Donor O- bisa donor ke: semua
  // Untuk simplicity, kita tampilkan request yang golongannya SAMA atau donor bisa donor ke-nya
  const COMPAT_DONOR_TO_RECIPIENT: Record<string, string[]> = {
    "O-":  ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+":  ["O+", "A+", "B+", "AB+"],
    "A-":  ["A-", "A+", "AB-", "AB+"],
    "A+":  ["A+", "AB+"],
    "B-":  ["B-", "B+", "AB-", "AB+"],
    "B+":  ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
  };
  const donorKey = `${donor.bloodType}${donor.rhesusType === "POSITIVE" ? "+" : "-"}`;
  const compatibleRecipients = COMPAT_DONOR_TO_RECIPIENT[donorKey] ?? [donorKey];

  const recipientFilters = compatibleRecipients.map((k) => ({
    bloodType: k.replace(/[+-]$/, "") as any,
    rhesusType: (k.endsWith("+") ? "POSITIVE" : "NEGATIVE") as any,
  }));

  const requests = await prisma.permintaanDonor.findMany({
    where: {
      reqStatus: { in: ["PENDING", "MATCHED_DONOR"] },
      OR: recipientFilters,
    },
    include: {
      patient: { include: { user: { select: { name: true, city: true, province: true, zone: true } } } },
      hospital: { select: { hospitalName: true, hospitalLoc: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    take: 30,
  });

  // Hitung "kedekatan" sederhana untuk sorting client-side
  const withProximity = requests.map((r) => {
    const reqCity = r.patient?.user?.city ?? null;
    const reqProvince = r.patient?.user?.province ?? null;
    const reqZone = r.patient?.user?.zone ?? null;
    let proximity = "Jauh";
    if (reqCity && reqCity === donor.user.city) proximity = "Sangat dekat (kota sama)";
    else if (reqZone && reqZone === donor.user.zone) proximity = "Dekat (zona sama)";
    else if (reqProvince && reqProvince === donor.user.province) proximity = "Sedang (provinsi sama)";
    return { ...r, proximity };
  });

  return res.json({ data: withProximity, donorBloodType: donorKey });
}

// POST /api/donor/volunteer/:requestId
// Donor proaktif menyatakan kesediaan untuk request yang belum ditargetkan ke dia
export async function volunteerForRequest(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });
  if (!donor.isEligible) {
    return res.status(400).json({ error: "Anda belum eligible. Lakukan checkEligible dulu." });
  }

  const request = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.requestId },
    include: { patient: true },
  });
  if (!request) return res.status(404).json({ error: "Request tidak ditemukan" });

  // Cek apakah sudah ada notification (jangan duplicate)
  const existing = await prisma.donorNotification.findUnique({
    where: { donorId_requestId: { donorId: donor.id, requestId: request.id } },
  });
  if (existing) {
    return res.status(400).json({ error: "Anda sudah merespons request ini" });
  }

  await prisma.donorNotification.create({
    data: {
      donorId: donor.id,
      requestId: request.id,
      responded: true,
      accepted: true,
      respondedAt: new Date(),
    },
  });

  // Notifikasi pasien
  if (request.patient) {
    await notifyUser({
      userId: request.patient.userId,
      type: NotificationType.REQUEST_STATUS_UPDATE,
      title: "Ada Pendonor Sukarela!",
      body: "Seorang pendonor secara sukarela menawarkan diri untuk membantu permintaan Anda.",
      meta: { requestId: request.id, donorId: donor.id },
    });
  }

  return res.json({ message: "Terima kasih atas kesediaan Anda! Tim medis akan menghubungi." });
}

// Info pendonor saat ini (dashboard banner)
export async function getMe(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: {
      user: { select: { name: true, email: true, city: true, birthDate: true } },
      checkups: { orderBy: { examinedAt: "desc" }, take: 1 },
      screenings: { orderBy: { answeredAt: "desc" }, take: 1 },
    },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });
  return res.json(donor);
}
