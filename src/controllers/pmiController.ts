import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";
import { notifyUser } from "../lib/notification";
import { checkEligible } from "../services/eligibilityService";

/**
 * PMI CONTROLLER
 * Endpoints khusus PMI dashboard:
 *   GET  /pmi/donors             — list pendonor yang preferred PMI ini
 *   POST /pmi/checkup            — input pemeriksaan fisik + cek kelayakan
 *   POST /pmi/take-blood/:donorId — ambil darah, stok bertambah
 *   POST /pmi/broadcast           — broadcast minta donor untuk stok kritis
 *   GET  /pmi/schedules           — jadwal donor masuk
 *   POST /pmi/requests/:id/acc    — ACC permintaan pasien + alokasi stok
 */

// ===================== GET /pmi/donors =====================
// List pendonor yang preferred PMI ini (untuk dropdown)
export async function listMyDonors(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI" });

  const donors = await prisma.pendonor.findMany({
    where: { preferredPmiId: pmi.id },
    include: {
      user: { select: { name: true, email: true, phoneNum: true, birthDate: true } },
      checkups: { orderBy: { examinedAt: "desc" }, take: 1 },
      screenings: { orderBy: { answeredAt: "desc" }, take: 1 },
    },
    orderBy: { user: { name: "asc" } },
  });

  return res.json({ data: donors });
}

// ===================== POST /pmi/checkup =====================
// PMI input pemeriksaan fisik. Setelah disimpan, auto-eval kelayakan.
const checkupSchema = z.object({
  donorId: z.string(),
  hemoglobinLevel: z.number().min(5).max(25),
  systolicBP: z.number().int().min(60).max(220),
  diastolicBP: z.number().int().min(40).max(140),
  bodyTempC: z.number().min(34).max(42),
  pulseRate: z.number().int().min(40).max(180),
  weight: z.number().min(30).max(200),
  notes: z.string().optional(),
});

export async function createCheckup(req: AuthedRequest, res: Response) {
  const parsed = checkupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI" });

  const donor = await prisma.pendonor.findUnique({ where: { id: parsed.data.donorId } });
  if (!donor) return res.status(404).json({ error: "Pendonor tidak ditemukan" });

  const d = parsed.data;
  // STRICT criteria evaluation
  const checks = {
    hemoglobin: d.hemoglobinLevel >= 12.5 && d.hemoglobinLevel <= 17.0,
    systolic: d.systolicBP >= 100 && d.systolicBP <= 160,
    diastolic: d.diastolicBP >= 60 && d.diastolicBP <= 100,
    temperature: d.bodyTempC >= 36.5 && d.bodyTempC <= 37.5,
    pulse: d.pulseRate >= 50 && d.pulseRate <= 100,
    weight: d.weight >= 45,
  };
  const passed = Object.values(checks).every((v) => v);

  const checkup = await prisma.pemeriksaanDonor.create({
    data: {
      donorId: d.donorId,
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

  await prisma.pendonor.update({
    where: { id: d.donorId },
    data: { weight: d.weight },
  });

  // Auto-trigger eligibility evaluation
  const eligibility = await checkEligible(d.donorId);

  await writeAudit({
    userId: req.user!.id,
    action: "CREATE",
    entity: "PemeriksaanDonor",
    entityId: checkup.id,
    after: checkup,
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: passed ? "Pemeriksaan LOLOS, donor eligible" : "Pemeriksaan TIDAK LOLOS",
    checkup,
    passed,
    eligibility,
    failedChecks: Object.entries(checks)
      .filter(([_, v]) => !v)
      .map(([k]) => k),
  });
}

// ===================== POST /pmi/take-blood =====================
// PMI ambil darah dari donor yang sudah eligible. Stok bertambah.
const takeBloodSchema = z.object({
  donorId: z.string(),
  volumeMl: z.number().int().positive().default(450),
  component: z.enum(["WHOLE_BLOOD", "PRC", "FFP", "TC", "CRYO"]).default("WHOLE_BLOOD"),
  location: z.string(),
});

export async function takeBlood(req: AuthedRequest, res: Response) {
  const parsed = takeBloodSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI" });

  const donor = await prisma.pendonor.findUnique({
    where: { id: parsed.data.donorId },
    include: { user: true },
  });
  if (!donor) return res.status(404).json({ error: "Pendonor tidak ditemukan" });
  if (!donor.isEligible) {
    return res.status(400).json({ error: "Pendonor belum eligible, jalankan pemeriksaan dulu" });
  }

  // Shelf life: WHOLE_BLOOD = 35 hari, PRC = 42 hari, FFP = 365, TC = 5, CRYO = 365
  const shelfDays: Record<string, number> = {
    WHOLE_BLOOD: 35,
    PRC: 42,
    FFP: 365,
    TC: 5,
    CRYO: 365,
  };
  const expiryDate = new Date(Date.now() + shelfDays[parsed.data.component] * 24 * 60 * 60 * 1000);

  // 1. Tambah stok PMI
  const stock = await prisma.stokDarah.create({
    data: {
      pmiId: pmi.id,
      bloodType: donor.bloodType,
      rhesusType: donor.rhesusType,
      component: parsed.data.component,
      quantity: 1,
      expiryDate,
      location: parsed.data.location,
      status: "AVAILABLE",
      source: "Donor: " + donor.user.name,
      donorId: donor.id,
    },
  });

  // 2. Update donor: lastDonationDate, totalDonations, isEligible = false (cooldown 60 hari)
  await prisma.pendonor.update({
    where: { id: donor.id },
    data: {
      lastDonationDate: new Date(),
      totalDonations: { increment: 1 },
      isEligible: false,
      eligibilityReason: "Masa tunggu 60 hari setelah donor terakhir",
    },
  });

  // 3. Tambah ke history
  await prisma.donorHistory.create({
    data: {
      donorId: donor.id,
      location: parsed.data.location,
      volumeMl: parsed.data.volumeMl,
      component: parsed.data.component,
    },
  });

  // 4. Notif donor terima kasih
  await notifyUser({
    userId: donor.userId,
    email: donor.user.email,
    type: "GENERIC",
    title: "🙏 Terima Kasih Sudah Donor",
    body: `Anda telah mendonorkan 1 kantong ${donor.bloodType}${donor.rhesusType === "POSITIVE" ? "+" : "-"} di ${pmi.pmiName}. Total donasi: ${donor.totalDonations + 1}.`,
  });

  return res.status(201).json({
    message: "Darah berhasil diambil, stok bertambah",
    stock,
  });
}

// ===================== POST /pmi/broadcast =====================
// PMI broadcast minta donor untuk stok kritis tertentu
const broadcastSchema = z.object({
  bloodType: z.enum(["A", "B", "AB", "O"]),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]),
  urgencyLevel: z.enum(["NORMAL", "URGENT", "CRITICAL"]).default("URGENT"),
  message: z.string().max(500).optional(),
});

export async function broadcastBloodRequest(req: AuthedRequest, res: Response) {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI" });

  // Find donors compatible — registered at this PMI
  const donors = await prisma.pendonor.findMany({
    where: {
      preferredPmiId: pmi.id,
      bloodType: parsed.data.bloodType,
      rhesusType: parsed.data.rhesusType,
      isActive: true,
    },
    include: { user: true },
  });

  if (donors.length === 0) {
    return res.json({ message: "Tidak ada pendonor terdaftar dengan golongan ini", notifiedCount: 0 });
  }

  const urgencyEmoji = {
    NORMAL: "🟢",
    URGENT: "🟠",
    CRITICAL: "🔴",
  }[parsed.data.urgencyLevel];

  // Notifikasi semua donor compatible
  await Promise.all(
    donors.map((d) =>
      notifyUser({
        userId: d.userId,
        email: d.user.email,
        type: "ELIGIBLE_DONOR_REQUEST",
        title: `${urgencyEmoji} Stok ${parsed.data.bloodType}${parsed.data.rhesusType === "POSITIVE" ? "+" : "-"} ${parsed.data.urgencyLevel}`,
        body: parsed.data.message ?? `${pmi.pmiName} membutuhkan darah Anda. Yuk donor!`,
        meta: { pmiId: pmi.id, urgency: parsed.data.urgencyLevel },
      })
    )
  );

  return res.json({
    message: `Broadcast terkirim ke ${donors.length} pendonor`,
    notifiedCount: donors.length,
  });
}

// ===================== GET /pmi/schedules =====================
// Jadwal donor yang akan datang ke PMI ini
export async function getIncomingSchedules(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI" });

  const data = await prisma.jadwalDonor.findMany({
    where: { pmiId: pmi.id, status: { in: ["PENDING", "CONFIRMED"] } },
    include: {
      donor: { include: { user: { select: { name: true, phoneNum: true, email: true } } } },
    },
    orderBy: { jadwal: "asc" },
  });
  return res.json({ data });
}

// ===================== POST /pmi/requests/:id/acc =====================
// PMI ACC permintaan pasien — alokasi stok
export async function accRequest(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI" });

  const request = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.id },
    include: { patient: { include: { user: true } } },
  });
  if (!request) return res.status(404).json({ error: "Request tidak ditemukan" });
  if (request.pmiId !== pmi.id) return res.status(403).json({ error: "Request ini bukan untuk PMI Anda" });
  if (request.reqStatus !== "PENDING") {
    return res.status(400).json({ error: `Request sudah ${request.reqStatus}` });
  }

  // Cek stok kompatibel
  const stocks = await prisma.stokDarah.findMany({
    where: {
      pmiId: pmi.id,
      bloodType: request.bloodType,
      rhesusType: request.rhesusType,
      status: "AVAILABLE",
      expiryDate: { gt: new Date() },
    },
    orderBy: { expiryDate: "asc" },  // FEFO
  });

  let remaining = request.quantity;
  const allocations: { stockId: string; quantity: number }[] = [];

  for (const stock of stocks) {
    if (remaining <= 0) break;
    const take = Math.min(stock.quantity, remaining);
    allocations.push({ stockId: stock.id, quantity: take });
    remaining -= take;
  }

  if (remaining > 0) {
    return res.status(400).json({
      error: "Stok tidak mencukupi. Broadcast ke pendonor dulu.",
      needed: request.quantity,
      available: request.quantity - remaining,
    });
  }

  // Alokasi stok + ubah status request → ACC
  await prisma.$transaction(async (tx) => {
    for (const alloc of allocations) {
      const stock = stocks.find((s) => s.id === alloc.stockId)!;
      const newQty = stock.quantity - alloc.quantity;
      await tx.stokDarah.update({
        where: { id: alloc.stockId },
        data: { quantity: newQty, status: newQty === 0 ? "USED" : "AVAILABLE" },
      });
      await tx.stockAllocation.create({
        data: { requestId: request.id, stockId: alloc.stockId, quantity: alloc.quantity },
      });
    }
    await tx.permintaanDonor.update({
      where: { id: request.id },
      data: { reqStatus: "ACC" },
    });
  });

  // Notif pasien
  if (request.patient) {
    await notifyUser({
      userId: request.patient.userId,
      email: request.patient.user.email,
      type: "REQUEST_STATUS_UPDATE",
      title: "✅ Permintaan Anda Diterima PMI",
      body: `${pmi.pmiName} telah mengkonfirmasi permintaan darah ${request.bloodType}${request.rhesusType === "POSITIVE" ? "+" : "-"} (${request.quantity} kantong). Akan dikirim ke ${request.targetHospitalName}.`,
      meta: { requestId: request.id },
    });
  }

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "PermintaanDonor",
    entityId: request.id,
    before: { status: "PENDING" },
    after: { status: "ACC", allocations },
    ipAddress: req.ip,
  });

  return res.json({ message: "Request di-ACC, stok dialokasikan", allocations });
}

// ===================== GET /pmi/list — public list of verified PMIs (for donor preferredPmi dropdown) =====================
export async function listPublicPmis(_req: any, res: Response) {
  const pmis = await prisma.pMI.findMany({
    where: { status: "VERIFIED" },
    select: {
      id: true, pmiName: true, pmiCode: true, pmiLoc: true,
      user: { select: { city: true, province: true } },
    },
    orderBy: { pmiName: "asc" },
  });
  return res.json({ data: pmis });
}
