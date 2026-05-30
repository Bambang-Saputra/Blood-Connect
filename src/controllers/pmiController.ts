import { Response } from "express";
import { z } from "zod";
import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { notifyUser } from "../lib/notification";
import { writeAudit } from "../lib/audit";

/**
 * =====================================================================
 * CONTROLLER: PMI Dashboard
 * =====================================================================
 * Endpoints:
 *   GET    /api/pmi/me                       — Info PMI yang login
 *   GET    /api/pmi/list                     — List PMI VERIFIED (public, untuk donor pilih)
 *   GET    /api/pmi/schedules                — Jadwal donor yang scoped ke PMI ini
 *   POST   /api/pmi/schedules/:id/checkup    — Input cek fisik untuk 1 jadwal (auto eligibility)
 *   POST   /api/pmi/broadcasts               — Broadcast minta stok ke donor satu kota
 *   GET    /api/pmi/broadcasts               — List broadcast yang sudah dibuat PMI ini
 *   PATCH  /api/pmi/broadcasts/:id/close     — Tutup broadcast (target tercapai)
 *   PATCH  /api/pmi/schedules/:id/status     — PMI confirm/reject jadwal
 * =====================================================================
 */

// =====================================================================
// GET /api/pmi/me
// =====================================================================
export async function getMyPmi(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { name: true, email: true, city: true } } },
  });
  if (!pmi) return res.status(404).json({ error: "Profil PMI tidak ditemukan" });
  return res.json(pmi);
}

// =====================================================================
// GET /api/pmi/list — list PMI VERIFIED (public, butuh login).
// Termasuk city/province/zone user untuk proximity sort di FE.
// =====================================================================
export async function listPublicPmis(_req: AuthedRequest, res: Response) {
  const data = await prisma.pMI.findMany({
    where: { status: "VERIFIED" },
    select: {
      id: true,
      pmiName: true,
      pmiCode: true,
      pmiLoc: true,
      user: { select: { city: true, province: true, zone: true } },
    },
    orderBy: { pmiName: "asc" },
  });
  return res.json({ data });
}

// =====================================================================
// GET /api/pmi/schedules
// Jadwal donor yang scoped ke PMI yang login. SHOULD NOT broadcast —
// hanya tampilkan jadwal yang `pmiId === thisPmi.id`.
// Include screening + checkup + donor info untuk panel UI.
// =====================================================================
export async function listMySchedules(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa akses" });

  const statusFilter = req.query.status as string | undefined;

  const schedules = await prisma.jadwalDonor.findMany({
    where: {
      pmiId: pmi.id,
      ...(statusFilter && { status: statusFilter as any }),
    },
    include: {
      donor: {
        include: {
          user: { select: { name: true, email: true, phoneNum: true, city: true, birthDate: true } },
        },
      },
      screening: true,
      checkup: true,
    },
    orderBy: { jadwal: "asc" },
  });

  return res.json({ data: schedules });
}

// =====================================================================
// POST /api/pmi/schedules/:id/checkup
// PMI input pemeriksaan fisik untuk 1 jadwal donor.
// Sistem otomatis hitung eligibility = checkup.passed AND screening.passed.
// =====================================================================
const checkupBodySchema = z.object({
  hemoglobinLevel: z.number().min(5).max(25),
  systolicBP: z.number().int().min(60).max(220),
  diastolicBP: z.number().int().min(40).max(140),
  bodyTempC: z.number().min(34).max(42),
  pulseRate: z.number().int().min(40).max(180),
  weight: z.number().min(30).max(200),
  notes: z.string().optional(),
});

export async function inputScheduleCheckup(req: AuthedRequest, res: Response) {
  const parsed = checkupBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa akses" });

  const schedule = await prisma.jadwalDonor.findUnique({
    where: { id: req.params.id },
    include: { screening: true, donor: true },
  });
  if (!schedule) return res.status(404).json({ error: "Jadwal tidak ditemukan" });
  if (schedule.pmiId !== pmi.id) {
    return res.status(403).json({ error: "Jadwal ini bukan di PMI Anda" });
  }
  if (schedule.checkupId) {
    return res.status(400).json({ error: "Checkup sudah pernah diinput untuk jadwal ini" });
  }

  // Aturan lolos cek fisik
  const d = parsed.data;
  const checkupPassed =
    d.hemoglobinLevel >= 12.5 && d.hemoglobinLevel <= 17.0 &&
    d.systolicBP >= 100 && d.systolicBP <= 160 &&
    d.diastolicBP >= 60 && d.diastolicBP <= 100 &&
    d.bodyTempC >= 36.5 && d.bodyTempC <= 37.5 &&
    d.pulseRate >= 50 && d.pulseRate <= 100 &&
    d.weight >= 45;

  // Compute eligibility: checkup AND screening sama-sama lolos
  const screeningPassed = schedule.screening?.passed ?? false;
  const isEligible = checkupPassed && screeningPassed;

  // Build alasan kalau tidak eligible (kasih konteks ke PMI)
  const reasons: string[] = [];
  if (!checkupPassed) reasons.push("Cek fisik tidak memenuhi rentang standar");
  if (!screeningPassed) reasons.push("Skrining donor menemukan kontraindikasi");

  // Transaksi: create checkup + link ke schedule + update eligibility
  const result = await prisma.$transaction(async (tx) => {
    const checkup = await tx.pemeriksaanDonor.create({
      data: {
        donorId: schedule.donorId,
        pmiId: pmi.id,
        examinedBy: req.user!.id,
        hemoglobinLevel: d.hemoglobinLevel,
        systolicBP: d.systolicBP,
        diastolicBP: d.diastolicBP,
        bodyTempC: d.bodyTempC,
        pulseRate: d.pulseRate,
        weight: d.weight,
        notes: d.notes,
        passed: checkupPassed,
      },
    });

    const updatedSchedule = await tx.jadwalDonor.update({
      where: { id: schedule.id },
      data: {
        checkupId: checkup.id,
        isEligible,
        eligibilityReason: reasons.length ? reasons.join("; ") : null,
      },
      include: { checkup: true, screening: true, donor: { include: { user: true } } },
    });

    // Update profil pendonor: berat + eligibility flag
    await tx.pendonor.update({
      where: { id: schedule.donorId },
      data: {
        weight: d.weight,
        isEligible,
        eligibilityReason: reasons.length ? reasons.join("; ") : null,
      },
    });

    return { checkup, schedule: updatedSchedule };
  });

  await writeAudit({
    userId: req.user!.id,
    action: "CREATE",
    entity: "PemeriksaanDonor",
    entityId: result.checkup.id,
    after: { ...result.checkup, scheduleId: schedule.id, isEligible },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: isEligible
      ? "Pemeriksaan tersimpan — donor LAYAK donor"
      : "Pemeriksaan tersimpan — donor BELUM LAYAK donor",
    isEligible,
    eligibilityReason: result.schedule.eligibilityReason,
    schedule: result.schedule,
  });
}

// =====================================================================
// PATCH /api/pmi/schedules/:id/status
// PMI confirm/reject/complete jadwal donor mereka.
// =====================================================================
const scheduleStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED", "COMPLETED", "CANCELLED"]),
  note: z.string().max(500).optional(),
});

export async function updateScheduleStatus(req: AuthedRequest, res: Response) {
  const parsed = scheduleStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa akses" });

  const existing = await prisma.jadwalDonor.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Jadwal tidak ditemukan" });
  if (existing.pmiId !== pmi.id) {
    return res.status(403).json({ error: "Jadwal ini bukan di PMI Anda" });
  }

  const updated = await prisma.jadwalDonor.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status,
      note: parsed.data.note ?? existing.note,
    },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "JadwalDonor",
    entityId: existing.id,
    before: { status: existing.status },
    after: { status: updated.status },
    ipAddress: req.ip,
  });

  return res.json({ message: "Status jadwal diperbarui", schedule: updated });
}

// =====================================================================
// POST /api/pmi/broadcasts
// PMI broadcast minta stok darah → notif ke donor di KOTA YANG SAMA
// dengan PMI tersebut yang golongan darahnya compatible.
// =====================================================================
const broadcastSchema = z.object({
  bloodType: z.enum(["A", "B", "AB", "O"]),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]),
  targetQuantity: z.number().int().positive("Target jumlah kantong minimal 1"),
  message: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
});

// Donor X bisa donor ke recipient golongan Y kalau donor.golongan in COMPAT[Y]
// Tapi karena PMI minta stok untuk golongan Y, kita cari donor yang
// GOLONGANNYA Y atau yang BISA donor ke Y (universal donor).
//
// Untuk simplifikasi MVP: kita match exact golongan dulu (donor O+ untuk PMI minta O+).
// Plus universal donor (O- bisa untuk semua recipient).
const UNIVERSAL_DONOR_KEY = "O-";

export async function createBroadcast(req: AuthedRequest, res: Response) {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pmi = await prisma.pMI.findUnique({
    where: { userId: req.user!.id },
    include: { user: { select: { city: true } } },
  });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa broadcast" });
  if (pmi.status !== "VERIFIED") return res.status(403).json({ error: "PMI belum diverifikasi" });

  const pmiCity = pmi.user.city;

  // Create broadcast record
  const broadcast = await prisma.pmiBroadcast.create({
    data: {
      pmiId: pmi.id,
      bloodType: parsed.data.bloodType,
      rhesusType: parsed.data.rhesusType,
      targetQuantity: parsed.data.targetQuantity,
      message: parsed.data.message,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  // Find target donors: kota sama dengan PMI + golongan compatible + active
  const targetKey = `${parsed.data.bloodType}${parsed.data.rhesusType === "POSITIVE" ? "+" : "-"}`;
  const candidates = await prisma.pendonor.findMany({
    where: {
      isActive: true,
      user: { city: pmiCity },
      OR: [
        // Exact golongan
        { bloodType: parsed.data.bloodType, rhesusType: parsed.data.rhesusType },
        // Universal donor (O-) untuk semua recipient
        ...(targetKey !== UNIVERSAL_DONOR_KEY
          ? [{ bloodType: "O" as const, rhesusType: "NEGATIVE" as const }]
          : []),
      ],
    },
    include: { user: { select: { email: true, name: true, id: true } } },
    take: 200,
  });

  // Fire-and-forget notifikasi — supaya respons cepat
  const golonganLabel = `${parsed.data.bloodType}${parsed.data.rhesusType === "POSITIVE" ? "+" : "-"}`;
  Promise.all(
    candidates.map((c) =>
      notifyUser({
        userId: c.user.id,
        email: c.user.email,
        type: NotificationType.PMI_BROADCAST,
        title: `🩸 ${pmi.pmiName} butuh donor ${golonganLabel}`,
        body:
          parsed.data.message ??
          `PMI di kota Anda butuh ${parsed.data.targetQuantity} kantong darah ${golonganLabel}. Anda kompatibel — silakan daftar jadwal donor.`,
        meta: { broadcastId: broadcast.id, pmiId: pmi.id, bloodType: golonganLabel },
      })
    )
  ).catch((err) => console.error("[broadcast] notif batch error:", err));

  await writeAudit({
    userId: req.user!.id,
    action: "CREATE",
    entity: "PmiBroadcast",
    entityId: broadcast.id,
    after: { ...broadcast, notifiedDonors: candidates.length },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: `Broadcast dikirim ke ${candidates.length} donor di ${pmiCity}.`,
    broadcast,
    notifiedDonors: candidates.length,
  });
}

// =====================================================================
// GET /api/pmi/broadcasts — list broadcast milik PMI ini
// =====================================================================
export async function listMyBroadcasts(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa akses" });

  const data = await prisma.pmiBroadcast.findMany({
    where: { pmiId: pmi.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ data });
}

// =====================================================================
// PATCH /api/pmi/broadcasts/:id/close — tutup broadcast manual
// =====================================================================
export async function closeBroadcast(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa akses" });

  const existing = await prisma.pmiBroadcast.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Broadcast tidak ditemukan" });
  if (existing.pmiId !== pmi.id) return res.status(403).json({ error: "Bukan broadcast PMI Anda" });

  const updated = await prisma.pmiBroadcast.update({
    where: { id: existing.id },
    data: { status: "CLOSED" },
  });
  return res.json({ message: "Broadcast ditutup", broadcast: updated });
}

