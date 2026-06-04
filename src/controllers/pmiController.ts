import { Response } from "express";
import { z } from "zod";
import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { notifyUser } from "../lib/notification";
import { writeAudit } from "../lib/audit";
import { donorTypesForRecipient, bloodKey } from "../lib/bloodCompat";

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

  // Alasan tidak-eligible.
  //  - scheduleReason : per-event (konteks PMI sudah implisit di schedule).
  //  - globalReason   : untuk flag GLOBAL donor yang context-free, jadi kita
  //                     sebutkan PMI + tanggal supaya pesan di profil donor
  //                     self-explanatory ("kenapa & dari mana penilaiannya").
  const reasons: string[] = [];
  if (!checkupPassed) reasons.push("Cek fisik tidak memenuhi rentang standar");
  if (!screeningPassed) reasons.push("Skrining donor menemukan kontraindikasi");
  const scheduleReason = reasons.length ? reasons.join("; ") : null;

  const examDateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
  const globalReason = isEligible
    ? null
    : `${scheduleReason} — per pemeriksaan ${pmi.pmiName} (${examDateStr})`;

  // Transaksi: create checkup + link ke schedule + refresh cache eligibility donor.
  const doCheckupTxn = () => prisma.$transaction(async (tx) => {
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

    // (1) schedule.isEligible = AUTHORITATIVE per-event. Selalu di-set untuk
    //     jadwal yang sedang diperiksa — ini "kebenaran" untuk donasi ini.
    const updatedSchedule = await tx.jadwalDonor.update({
      where: { id: schedule.id },
      data: {
        checkupId: checkup.id,
        isEligible,
        eligibilityReason: scheduleReason,
      },
      include: { checkup: true, screening: true, donor: { include: { user: true } } },
    });

    // (2) pendonor.isEligible = CACHE dari checkup TERBARU donor (by examinedAt).
    //     Guard: hanya refresh kalau checkup ini memang yang paling baru. Tujuan:
    //       - global flag selalu mencerminkan kondisi medis termutakhir,
    //       - tidak "flip-flop" hanya karena urutan eksekusi input antar-PMI
    //         (checkup lama yang di-input belakangan TIDAK menimpa yang baru).
    //     schedule.isEligible (poin 1) tetap jadi sumber kebenaran per-jadwal.
    const latestCheckup = await tx.pemeriksaanDonor.findFirst({
      where: { donorId: schedule.donorId },
      orderBy: { examinedAt: "desc" },
      select: { id: true },
    });
    if (latestCheckup?.id === checkup.id) {
      await tx.pendonor.update({
        where: { id: schedule.donorId },
        data: { weight: d.weight, isEligible, eligibilityReason: globalReason },
      });
    }

    return { checkup, schedule: updatedSchedule };
  }, { maxWait: 10_000, timeout: 20_000 });

  // Robustness terhadap koneksi Neon (serverless) yang sesekali lambat/putus di
  // tengah transaksi interaktif (P2028) — terutama saat DB cold-start. Tanpa
  // penanganan ini, satu blip koneksi meng-crash SELURUH server (kelas bug yang
  // sama dengan Bug #1). Strategi: timeout transaksi dinaikkan (di atas) + retry
  // dengan backoff kecil; bila tetap gagal balas 503 dan server tetap hidup.
  const TRANSIENT_DB_ERRORS = new Set(["P2028", "P1001", "P1017"]);
  const MAX_ATTEMPTS = 3;
  let result: Awaited<ReturnType<typeof doCheckupTxn>> | undefined;
  let lastDbErr: any;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      result = await doCheckupTxn();
      lastDbErr = undefined;
      break;
    } catch (err: any) {
      lastDbErr = err;
      if (!TRANSIENT_DB_ERRORS.has(err?.code) || attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, 300 * attempt)); // backoff sebelum retry
    }
  }
  if (!result) {
    console.error("[checkup] transaksi pemeriksaan gagal:", lastDbErr);
    return res.status(503).json({
      error: "Koneksi database sedang tidak stabil. Mohon coba lagi sebentar.",
    });
  }

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

  // Target donors: SEMUA donor type yang bisa donate ke recipient yang diminta.
  // Pakai bloodCompat matrix biar coverage donor maksimal (bukan cuma exact + O-).
  // Contoh: PMI minta A+ → notify donor A+, A-, O+, O- di kota tersebut.
  const compatibleDonorTypes = donorTypesForRecipient(
    parsed.data.bloodType,
    parsed.data.rhesusType,
  );

  const candidates = await prisma.pendonor.findMany({
    where: {
      isActive: true,
      user: { city: pmiCity },
      OR: compatibleDonorTypes,
    },
    include: { user: { select: { email: true, name: true, id: true } } },
    take: 200,
  });

  // Fire-and-forget notifikasi — supaya respons cepat
  const golonganLabel = bloodKey(parsed.data.bloodType, parsed.data.rhesusType);
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

