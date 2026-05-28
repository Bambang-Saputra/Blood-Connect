import { Response } from "express";
import { z } from "zod";
import { Prisma, RequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { processMatch } from "../services/matchSystemService";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * =====================================================================
 * CONTROLLER: MatchSystem & Request Darah
 * =====================================================================
 * Endpoints:
 *   POST   /api/requests              — Use Case REQUEST (requestBlood)
 *   POST   /api/requests/:id/match    — Trigger MatchSystem manual
 *   GET    /api/requests/:id          — Use Case TRACK REQUEST
 *   PATCH  /api/requests/:id/status   — Use Case UPDATE STATUS (Rumah Sakit)
 * =====================================================================
 */

// ---------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------
const requestBloodSchema = z.object({
  bloodType: z.enum(["A", "B", "AB", "O"]),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]),
  quantity: z.number().int().positive(),
  urgency: z.enum(["NORMAL", "URGENT", "CRITICAL"]).default("NORMAL"),
  reason: z.string().max(500).optional(),
});

// =====================================================================
// 1) POST /api/requests — Use Case REQUEST (Activity Diagram #9)
//    Aktor: Pasien atau Rumah Sakit
// =====================================================================
export async function createRequest(req: AuthedRequest, res: Response) {
  // [Activity 2.1] Validasi input
  const parsed = requestBloodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validasi gagal",
      detail: parsed.error.flatten().fieldErrors,
    });
  }

  // Pastikan user adalah Pasien/RS dan ambil profile-nya
  const profile = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pasien: true, rumahSakit: true },
  });
  if (!profile || (!profile.pasien && !profile.rumahSakit)) {
    return res.status(403).json({ error: "Hanya Pasien/Rumah Sakit yang bisa request" });
  }

  // RS harus diverifikasi admin sebelum bisa transact
  if (profile.rumahSakit && profile.rumahSakit.status !== "VERIFIED") {
    return res.status(403).json({ error: "Akun RS belum diverifikasi admin" });
  }

  // [Activity 3.1] Buat entry Permintaan Donor — ReqStatus = PENDING
  const request = await prisma.permintaanDonor.create({
    data: {
      patientId: profile.pasien?.id ?? null,
      hospitalId: profile.rumahSakit?.id ?? null,
      bloodType: parsed.data.bloodType,
      rhesusType: parsed.data.rhesusType,
      quantity: parsed.data.quantity,
      urgency: parsed.data.urgency,
      reason: parsed.data.reason,
      reqStatus: RequestStatus.PENDING,
    },
  });

  // [Activity 3.3] Trigger MatchSystem async — return ke client lebih cepat
  // Note: di production gunakan BullMQ queue. Untuk MVP kita fire-and-forget.
  triggerMatchWithRetry(request.id).catch((err) =>
    console.error("[match] fatal:", err)
  );

  return res.status(201).json({
    message: "Permintaan darah berhasil dibuat. MatchSystem sedang memproses.",
    request,
  });
}

// =====================================================================
// 2) POST /api/requests/:id/match — Trigger ulang MatchSystem
//    Berguna untuk admin yang ingin re-process request stuck di PENDING
// =====================================================================
export async function triggerMatch(req: AuthedRequest, res: Response) {
  try {
    const result = await triggerMatchWithRetry(req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: "MatchSystem error", detail: err.message });
  }
}

// =====================================================================
// 3a) GET /api/requests?mine=true — list semua request milik user yang login
// =====================================================================
// =====================================================================
// 3a) GET /api/requests?mine=true — list semua request atau request RS
// =====================================================================
export async function listMyRequests(req: AuthedRequest, res: Response) {
  const profile = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pasien: true, rumahSakit: true },
  });
  if (!profile) return res.status(404).json({ error: "User tidak ditemukan" });

  const isMineOnly = req.query.mine === "true";
  let whereClause: Prisma.PermintaanDonorWhereInput = {};

  if (profile.rumahSakit && !isMineOnly) {
    // Mode RS: Lihat request buatan sendiri ATAU request dari pasien mandiri
    whereClause = {
      OR: [
        { hospitalId: profile.rumahSakit.id },
        { hospitalId: null },
      ],
    };
  } else {
    // Mode "Mine": Pasien murni cuma lihat miliknya, RS lihat miliknya
    whereClause = {
      OR: [
        ...(profile.pasien ? [{ patientId: profile.pasien.id }] : []),
        ...(profile.rumahSakit ? [{ hospitalId: profile.rumahSakit.id }] : []),
      ],
    };
  }

  const data = await prisma.permintaanDonor.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      // Tambahkan include ini agar RS bisa melihat nama pasiennya
      patient: { include: { user: { select: { name: true, city: true } } } },
      hospital: { select: { hospitalName: true } },
    }
  });
  
  return res.json({ data });
}

// =====================================================================
// 3) GET /api/requests/:id — Use Case TRACK REQUEST
// =====================================================================
export async function getRequest(req: AuthedRequest, res: Response) {
  // [Activity 1.1] Ambil data permintaan berdasarkan id (+ otorisasi)
  const request = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.id },
    include: {
      patient: { include: { user: { select: { id: true, name: true, city: true } } } },
      hospital: true,
      allocations: { include: { stock: true } },
      donorNotifs: {
        include: { donor: { include: { user: { select: { name: true, phoneNum: true } } } } },
      },
    },
  });
  if (!request) return res.status(404).json({ error: "Request tidak ditemukan" });

  // [Exception 1.1] Otorisasi: hanya pemilik / RS / admin
  const u = req.user!;
  const isOwner =
    request.patient?.userId === u.id ||
    request.hospital?.userId === u.id ||
    u.role === "ADMIN";
  if (!isOwner) return res.status(403).json({ error: "Forbidden" });

  return res.json(request);
}

// =====================================================================
// 4) PATCH /api/requests/:id/status — Use Case UPDATE STATUS (RS/Sistem)
// =====================================================================
const updateStatusSchema = z.object({
  newStatus: z.enum([
    "PROCESSING",
    "MATCHED_STOCK",
    "MATCHED_DONOR",
    "FULFILLED",
    "REJECTED",
    "CANCELLED",
  ]),
  note: z.string().max(500).optional(),
});

export async function updateRequestStatus(req: AuthedRequest, res: Response) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const before = await prisma.permintaanDonor.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: "Request tidak ditemukan" });

  const updated = await prisma.permintaanDonor.update({
    where: { id: req.params.id },
    data: {
      reqStatus: parsed.data.newStatus as any,
      fulfilledAt: parsed.data.newStatus === "FULFILLED" ? new Date() : undefined,
    },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "PermintaanDonor",
    entityId: updated.id,
    before: { status: before.reqStatus },
    after: { status: updated.reqStatus, note: parsed.data.note },
    ipAddress: req.ip,
  });

  return res.json({ message: "Status diperbarui", request: updated });
}

// =====================================================================
// Helper: retry MatchSystem saat terjadi serialization conflict
// =====================================================================
async function triggerMatchWithRetry(requestId: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await processMatch(requestId);
    } catch (err: any) {
      const isSerial =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === "P2034" || err.message.includes("serialization"));
      if (!isSerial || i === attempts - 1) throw err;
      // backoff sebelum retry
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
}
