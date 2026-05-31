import { Response } from "express";
import { z } from "zod";
import { Prisma, RequestStatus, StockStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * =====================================================================
 * CONTROLLER: MatchSystem & Request Darah
 * =====================================================================
 * Endpoints:
 *   POST   /api/requests              — pasien buat request (broadcast ke semua PMI)
 *   POST   /api/requests/:id/match    — trigger MatchSystem manual
 *   GET    /api/requests              — list (behavior per-role)
 *   GET    /api/requests/:id          — track 1 request
 *   PATCH  /api/requests/:id/status   — PMI yang accept update status
 *   POST   /api/requests/:id/accept   — PMI claim request
 * =====================================================================
 */

// ---------------------------------------------------------------------
// Validator — quantity HARUS > 0 (bug fix), no urgency input dari pasien
// ---------------------------------------------------------------------
const requestBloodSchema = z.object({
  bloodType: z.enum(["A", "B", "AB", "O"]),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]),
  // .int().positive() menolak 0, negatif, decimal — bug "kantong negatif/nol" tertutup
  quantity: z.number().int().positive("Jumlah kantong minimal 1"),
  component: z.enum(["WHOLE_BLOOD", "PRC", "FFP", "TC", "CRYO"]).optional(),
  // Target RS tempat pasien dirawat (free-text)
  targetHospitalName: z.string().min(2, "Nama RS tujuan wajib diisi"),
  targetHospitalAddress: z.string().optional(),
  reason: z.string().max(500).optional(),
  doctorName: z.string().optional(),
});

// =====================================================================
// Helper: compute urgency dari ketersediaan stok PMI untuk golongan ini.
// Aggregate stok AVAILABLE across SEMUA PMI yang VERIFIED.
//   <  5 kantong  → CRITICAL  (merah)
//   <  20 kantong → URGENT    (oranye)
//   ≥  20 kantong → NORMAL    (hijau)
// =====================================================================
async function computeUrgencyFromStock(
  bloodType: string,
  rhesusType: string,
): Promise<{ urgency: "CRITICAL" | "URGENT" | "NORMAL"; totalStock: number }> {
  const stocks = await prisma.stokDarah.findMany({
    where: {
      bloodType: bloodType as any,
      rhesusType: rhesusType as any,
      status: "AVAILABLE",
      expiryDate: { gt: new Date() },
      pmi: { status: "VERIFIED" },
    },
    select: { quantity: true },
  });
  const totalStock = stocks.reduce((s, x) => s + x.quantity, 0);
  let urgency: "CRITICAL" | "URGENT" | "NORMAL" = "NORMAL";
  if (totalStock < 5) urgency = "CRITICAL";
  else if (totalStock < 20) urgency = "URGENT";
  return { urgency, totalStock };
}

// =====================================================================
// 1) POST /api/requests — pasien submit request, broadcast ke semua PMI
// =====================================================================
export async function createRequest(req: AuthedRequest, res: Response) {
  const parsed = requestBloodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validasi gagal",
      detail: parsed.error.flatten().fieldErrors,
    });
  }

  // Hanya pasien yang bisa submit (PMI tidak)
  const profile = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pasien: true },
  });
  if (!profile?.pasien) {
    return res.status(403).json({ error: "Hanya Pasien yang bisa request darah" });
  }

  // Urgency dihitung dari stok saat create (bisa juga selalu compute on read,
  // tapi simpan baseline biar konsisten kalau stok berubah)
  const { urgency } = await computeUrgencyFromStock(
    parsed.data.bloodType,
    parsed.data.rhesusType,
  );

  const request = await prisma.permintaanDonor.create({
    data: {
      patientId: profile.pasien.id,
      targetHospitalName: parsed.data.targetHospitalName,
      targetHospitalAddress: parsed.data.targetHospitalAddress,
      bloodType: parsed.data.bloodType,
      rhesusType: parsed.data.rhesusType,
      component: parsed.data.component,
      quantity: parsed.data.quantity,
      urgency,
      reason: parsed.data.reason,
      doctorName: parsed.data.doctorName,
      reqStatus: RequestStatus.PENDING,
    },
  });

  // PENTING: TIDAK trigger MatchSystem auto-allocate stock.
  // Stok hanya akan dipotong saat PMI yang accept klik [Fulfill] secara eksplisit.
  // Ini menjamin:
  //   1. PMI bisa lihat request di dashboard sebagai PENDING
  //   2. Stok PMI tidak bocor otomatis untuk request orang lain
  //   3. PMI punya kontrol penuh kapan men-deduct stoknya

  return res.status(201).json({
    message: "Permintaan darah berhasil dibuat. Semua PMI nasional akan menerima notifikasi.",
    request,
  });
}

// =====================================================================
// 3) GET /api/requests — list per-role
//    Pasien   : request milik sendiri
//    PMI      : SEMUA request PENDING (broadcast) + yang sudah dia accept
//    Admin    : semua
// =====================================================================
export async function listMyRequests(req: AuthedRequest, res: Response) {
  const profile = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pasien: true, pmi: true },
  });
  if (!profile) return res.status(404).json({ error: "User tidak ditemukan" });

  let whereClause: Prisma.PermintaanDonorWhereInput = {};

  if (profile.role === "ADMIN") {
    whereClause = {};
  } else if (profile.pmi) {
    // PMI view: broadcast PENDING + request yang sudah dia claim
    whereClause = {
      OR: [
        { reqStatus: "PENDING", acceptedByPmiId: null },
        { acceptedByPmiId: profile.pmi.id },
      ],
    };
  } else if (profile.pasien) {
    whereClause = { patientId: profile.pasien.id };
  } else {
    return res.status(403).json({ error: "Tidak ada role yang dikenali" });
  }

  const data = await prisma.permintaanDonor.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      patient: {
        include: {
          user: { select: { name: true, email: true, city: true } },
        },
      },
      acceptedByPmi: { select: { pmiName: true, pmiLoc: true } },
    },
  });

  return res.json({ data });
}

// =====================================================================
// 3b) GET /api/requests/:id — track 1 request
// =====================================================================
export async function getRequest(req: AuthedRequest, res: Response) {
  const request = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.id },
    include: {
      patient: { include: { user: { select: { id: true, name: true, email: true, city: true } } } },
      acceptedByPmi: { select: { id: true, pmiName: true, pmiLoc: true, userId: true } },
      allocations: { include: { stock: true } },
      donorNotifs: {
        include: { donor: { include: { user: { select: { name: true, phoneNum: true } } } } },
      },
    },
  });
  if (!request) return res.status(404).json({ error: "Request tidak ditemukan" });

  const u = req.user!;
  const isOwner =
    request.patient?.userId === u.id ||
    request.acceptedByPmi?.userId === u.id ||
    u.role === "ADMIN" ||
    // PMI bisa lihat semua PENDING (broadcast)
    (u.role === "PMI" && request.reqStatus === "PENDING");
  if (!isOwner) return res.status(403).json({ error: "Forbidden" });

  return res.json(request);
}

// =====================================================================
// 4) POST /api/requests/:id/accept — PMI claim request PENDING
// =====================================================================
export async function acceptRequest(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa accept request" });
  if (pmi.status !== "VERIFIED") return res.status(403).json({ error: "PMI belum diverifikasi" });

  const existing = await prisma.permintaanDonor.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Request tidak ditemukan" });
  if (existing.acceptedByPmiId) {
    return res.status(409).json({ error: "Request sudah di-claim PMI lain" });
  }
  if (existing.reqStatus !== "PENDING") {
    return res.status(400).json({ error: `Request berstatus ${existing.reqStatus}, tidak bisa di-claim` });
  }

  const updated = await prisma.permintaanDonor.update({
    where: { id: existing.id },
    data: { acceptedByPmiId: pmi.id, reqStatus: "PROCESSING" },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "PermintaanDonor",
    entityId: updated.id,
    before: { acceptedByPmiId: null, status: "PENDING" },
    after: { acceptedByPmiId: pmi.id, status: "PROCESSING" },
    ipAddress: req.ip,
  });

  return res.json({ message: "Request diterima — siap diproses", request: updated });
}

// =====================================================================
// 5) PATCH /api/requests/:id/status — PMI yang accept atau Admin update status
// =====================================================================
const updateStatusSchema = z.object({
  newStatus: z.enum([
    "PROCESSING",
    "MATCHED_STOCK",
    "MATCHED_DONOR",
    "IN_TRANSIT",
    "FULFILLED",
    "REJECTED",
    "CANCELLED",
  ]),
  note: z.string().max(500).optional(),
});

export async function updateRequestStatus(req: AuthedRequest, res: Response) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const before = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.id },
    include: { acceptedByPmi: true },
  });
  if (!before) return res.status(404).json({ error: "Request tidak ditemukan" });

  // Authorization: ADMIN atau PMI yang sudah claim request ini
  if (req.user!.role !== "ADMIN") {
    const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
    if (!pmi || before.acceptedByPmiId !== pmi.id) {
      return res.status(403).json({ error: "Hanya PMI yang accept request ini boleh update statusnya" });
    }
  }

  // FULFILLED → allocate stok dari PMI yang accept request. Atomic transaction
  // memastikan kalau stok kurang, semuanya rollback dan PMI tahu via error message.
  if (parsed.data.newStatus === "FULFILLED") {
    if (!before.acceptedByPmiId) {
      return res.status(400).json({
        error: "Request belum di-accept PMI manapun. Accept dulu sebelum Fulfill.",
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Cari stok PMI ini yang AVAILABLE + belum expired, sorted FEFO
        const stocks = await tx.stokDarah.findMany({
          where: {
            pmiId: before.acceptedByPmiId!,
            status: StockStatus.AVAILABLE,
            expiryDate: { gt: new Date() },
            bloodType: before.bloodType,
            rhesusType: before.rhesusType,
            component: before.component,
          },
          orderBy: { expiryDate: "asc" },
        });

        let remaining = before.quantity;
        const allocations: { stockId: string; quantity: number }[] = [];

        for (const stock of stocks) {
          if (remaining <= 0) break;
          const take = Math.min(stock.quantity, remaining);
          allocations.push({ stockId: stock.id, quantity: take });
          remaining -= take;
        }

        if (remaining > 0) {
          throw new Error(
            `Stok PMI Anda tidak cukup untuk fulfill request ini. ` +
            `Butuh ${before.quantity} kantong, tersedia ${before.quantity - remaining}. ` +
            `Broadcast permintaan stok ke donor terlebih dahulu, lalu coba Fulfill lagi.`
          );
        }

        // Kurangi qty + create allocation records
        for (const alloc of allocations) {
          const stock = stocks.find((s) => s.id === alloc.stockId)!;
          const newQty = stock.quantity - alloc.quantity;
          await tx.stokDarah.update({
            where: { id: alloc.stockId },
            data: {
              quantity: newQty,
              status: newQty === 0 ? StockStatus.USED : StockStatus.AVAILABLE,
            },
          });
          await tx.stockAllocation.create({
            data: {
              requestId: before.id,
              stockId: alloc.stockId,
              quantity: alloc.quantity,
            },
          });
        }

        const updated = await tx.permintaanDonor.update({
          where: { id: req.params.id },
          data: {
            reqStatus: RequestStatus.FULFILLED,
            fulfilledAt: new Date(),
          },
        });

        return { updated, allocations };
      });

      await writeAudit({
        userId: req.user!.id,
        action: "STATUS_CHANGE",
        entity: "PermintaanDonor",
        entityId: result.updated.id,
        before: { status: before.reqStatus },
        after: {
          status: "FULFILLED",
          note: parsed.data.note,
          allocatedStocks: result.allocations.length,
        },
        ipAddress: req.ip,
      });

      return res.json({
        message: `Request fulfilled. Stok dari ${result.allocations.length} batch dipotong.`,
        request: result.updated,
        allocations: result.allocations,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message ?? "Gagal fulfill request" });
    }
  }

  // Untuk status lain (PROCESSING, REJECTED, dll), update tanpa stock allocation
  const updated = await prisma.permintaanDonor.update({
    where: { id: req.params.id },
    data: {
      reqStatus: parsed.data.newStatus as any,
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
