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
 *   GET   /api/donor/schedules                — List jadwal sendiri
 *   GET   /api/donor/history                  — Use Case HISTORY
 *   GET   /api/donor/notifications            — list permintaan dari MatchSystem
 *   POST  /api/donor/notifications/:id/respond
 *   GET   /api/donor/me                       — info pendonor + status
 *   PATCH /api/donor/me/preferred-pmi         — set/ubah PMI preferensi
 */

export async function checkEligibleHandler(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const result = await checkEligible(donor.id);
  return res.json(result);
}

// =====================================================================
// POST /api/donor/schedules
// Donor pilih PMI + tanggal — schedule scoped ke PMI tersebut.
// =====================================================================
const scheduleSchema = z.object({
  pmiId: z.string().min(1, "PMI wajib dipilih"),
  jadwal: z.string().datetime(),
  sesi: z.enum(["PAGI", "SIANG", "SORE"]),
});

export async function createSchedule(req: AuthedRequest, res: Response) {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: { screenings: { orderBy: { answeredAt: "desc" }, take: 1 } },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  // Validasi PMI ada dan VERIFIED
  const pmi = await prisma.pMI.findUnique({ where: { id: parsed.data.pmiId } });
  if (!pmi) return res.status(400).json({ error: "PMI tidak ditemukan" });
  if (pmi.status !== "VERIFIED") {
    return res.status(400).json({ error: "PMI belum diverifikasi" });
  }

  // Skrining wajib diisi dulu sebelum daftar jadwal
  const latestScreening = donor.screenings[0];
  if (!latestScreening) {
    return res.status(400).json({
      error: "Anda perlu mengisi kuesioner skrining dulu sebelum daftar jadwal donor.",
    });
  }

  const schedule = await prisma.jadwalDonor.create({
    data: {
      donorId: donor.id,
      pmiId: parsed.data.pmiId,
      jadwal: new Date(parsed.data.jadwal),
      sesi: parsed.data.sesi,
      status: ScheduleStatus.PENDING,
      screeningId: latestScreening.id,
    },
  });

  return res.status(201).json({
    message: "Pendaftaran jadwal donor berhasil. PMI akan melakukan cek fisik saat hari H.",
    schedule,
  });
}

// GET /api/donor/schedules — list jadwal milik donor sendiri
export async function listMySchedules(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const schedules = await prisma.jadwalDonor.findMany({
    where: { donorId: donor.id },
    include: {
      pmi: { select: { pmiName: true, pmiLoc: true } },
      checkup: true,
      screening: true,
    },
    orderBy: { jadwal: "desc" },
  });
  return res.json({ data: schedules });
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
      acceptedByPmi: { select: { pmiName: true, pmiLoc: true } },
    },
    orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
    take: 30,
  });

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
      preferredPmi: { select: { id: true, pmiName: true, pmiLoc: true } },
      checkups: { orderBy: { examinedAt: "desc" }, take: 1 },
      screenings: { orderBy: { answeredAt: "desc" }, take: 1 },
    },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });
  return res.json(donor);
}

// PATCH /api/donor/me/preferred-pmi
const preferredPmiSchema = z.object({ preferredPmiId: z.string().min(1) });
export async function updatePreferredPmi(req: AuthedRequest, res: Response) {
  const parsed = preferredPmiSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const donor = await prisma.pendonor.findUnique({ where: { userId: req.user!.id } });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const pmi = await prisma.pMI.findUnique({ where: { id: parsed.data.preferredPmiId } });
  if (!pmi) return res.status(400).json({ error: "PMI tidak ditemukan" });
  if (pmi.status !== "VERIFIED") return res.status(400).json({ error: "PMI belum diverifikasi" });

  await prisma.pendonor.update({
    where: { id: donor.id },
    data: { preferredPmiId: parsed.data.preferredPmiId },
  });
  return res.json({ message: "PMI preferensi diperbarui", pmiName: pmi.pmiName });
}

// =====================================================================
// GET /api/donor/broadcasts
// List PMI broadcast yang RELEVAN untuk donor ini:
//   - status OPEN
//   - PMI berada di kota yang sama dengan donor
//   - golongan compatible (exact OR donor universal O-)
// =====================================================================
export async function listNearbyBroadcasts(req: AuthedRequest, res: Response) {
  const donor = await prisma.pendonor.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { city: true } } },
  });
  if (!donor) return res.status(404).json({ error: "Profil pendonor tidak ditemukan" });

  const donorIsUniversal = donor.bloodType === "O" && donor.rhesusType === "NEGATIVE";

  const broadcasts = await prisma.pmiBroadcast.findMany({
    where: {
      status: "OPEN",
      pmi: { user: { city: donor.user.city }, status: "VERIFIED" },
      ...(donorIsUniversal
        ? {} // O- bisa donor ke semua
        : {
            // Non-universal: exact match golongan
            bloodType: donor.bloodType,
            rhesusType: donor.rhesusType,
          }),
    },
    include: {
      pmi: { select: { id: true, pmiName: true, pmiLoc: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return res.json({ data: broadcasts });
}
