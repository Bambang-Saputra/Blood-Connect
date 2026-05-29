import { Response } from "express";
import { z } from "zod";
import { RequestStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";
import { notifyUser } from "../lib/notification";

/**
 * REQUEST DARAH CONTROLLER
 * Flow: PENDING → ACC → SHIPPED → DELIVERED → FULFILLED
 */

async function findPmiForCity(city: string, province?: string | null) {
  let pmi = await prisma.pMI.findFirst({
    where: { status: "VERIFIED", user: { city } },
  });
  if (!pmi && province) {
    pmi = await prisma.pMI.findFirst({
      where: { status: "VERIFIED", user: { province } },
    });
  }
  if (!pmi) {
    pmi = await prisma.pMI.findFirst({ where: { status: "VERIFIED" } });
  }
  return pmi;
}

const requestBloodSchema = z.object({
  bloodType: z.enum(["A", "B", "AB", "O"]),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]),
  quantity: z.number().int().positive().max(20),
  targetHospitalName: z.string().min(2),
  targetHospitalAddress: z.string().min(5),
  doctorName: z.string().optional(),
  familyContact: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export async function createRequest(req: AuthedRequest, res: Response) {
  const parsed = requestBloodSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validasi gagal",
      detail: parsed.error.flatten().fieldErrors,
    });
  }

  const profile = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pasien: true },
  });
  if (!profile?.pasien) {
    return res.status(403).json({ error: "Hanya Pasien yang bisa request darah" });
  }

  // PMI routing: pakai patient.city sebagai approximation
  // (asumsi: pasien biasanya dirawat di RS di kota tempat tinggal)
  // Future: parse targetHospitalAddress untuk city detection
  const targetPmi = await findPmiForCity(profile.city, profile.province);
  if (!targetPmi) {
    return res.status(503).json({ error: "Tidak ada PMI tersedia. Coba lagi nanti." });
  }

  const request = await prisma.permintaanDonor.create({
    data: {
      patientId: profile.pasien.id,
      pmiId: targetPmi.id,
      bloodType: parsed.data.bloodType,
      rhesusType: parsed.data.rhesusType,
      quantity: parsed.data.quantity,
      targetHospitalName: parsed.data.targetHospitalName,
      targetHospitalAddress: parsed.data.targetHospitalAddress,
      doctorName: parsed.data.doctorName,
      familyContact: parsed.data.familyContact,
      reason: parsed.data.reason,
      reqStatus: "PENDING",
    },
  });

  const pmiUser = await prisma.pMI.findUnique({
    where: { id: targetPmi.id },
    include: { user: true },
  });
  if (pmiUser) {
    await notifyUser({
      userId: pmiUser.user.id,
      type: "REQUEST_STATUS_UPDATE",
      title: "🩸 Permintaan Darah Baru",
      body: `Pasien ${profile.name} request ${parsed.data.bloodType}${parsed.data.rhesusType === "POSITIVE" ? "+" : "-"} ${parsed.data.quantity} kantong untuk ${parsed.data.targetHospitalName}.`,
      meta: { requestId: request.id },
    });
  }

  await writeAudit({
    userId: req.user!.id,
    action: "CREATE",
    entity: "PermintaanDonor",
    entityId: request.id,
    after: request,
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: "Permintaan dikirim ke PMI. Menunggu konfirmasi.",
    request,
  });
}

export async function listMyRequests(req: AuthedRequest, res: Response) {
  const profile = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { pasien: true, pmi: true },
  });
  if (!profile) return res.status(404).json({ error: "User tidak ditemukan" });

  let where: any = {};
  if (profile.role === "ADMIN") {
    where = {};
  } else if (profile.pmi) {
    where = { pmiId: profile.pmi.id };
  } else if (profile.pasien) {
    where = { patientId: profile.pasien.id };
  } else {
    return res.json({ data: [] });
  }

  const data = await prisma.permintaanDonor.findMany({
    where,
    include: {
      patient: { include: { user: { select: { name: true, phoneNum: true, city: true, email: true } } } },
      pmi: { select: { pmiName: true, pmiCode: true, pmiLoc: true } },
      allocations: {
        include: {
          stock: {
            include: { pmi: { select: { pmiName: true, pmiLoc: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json({ data });
}

export async function getRequest(req: AuthedRequest, res: Response) {
  const request = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.id },
    include: {
      patient: { include: { user: { select: { id: true, name: true, city: true, phoneNum: true, email: true } } } },
      pmi: { include: { user: { select: { phoneNum: true, email: true } } } },
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
    request.pmi?.userId === u.id ||
    u.role === "ADMIN";
  if (!isOwner) return res.status(403).json({ error: "Forbidden" });

  return res.json(request);
}

const updateStatusSchema = z.object({
  newStatus: z.enum(["ACC", "SHIPPED", "DELIVERED", "FULFILLED", "REJECTED", "CANCELLED", "SEARCHING"]),
  rejectedReason: z.string().optional(),
});

export async function updateRequestStatus(req: AuthedRequest, res: Response) {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const before = await prisma.permintaanDonor.findUnique({
    where: { id: req.params.id },
    include: { patient: { include: { user: true } } },
  });
  if (!before) return res.status(404).json({ error: "Request tidak ditemukan" });

  const updateData: any = { reqStatus: parsed.data.newStatus as RequestStatus };
  if (parsed.data.newStatus === "SHIPPED") updateData.shippedAt = new Date();
  if (parsed.data.newStatus === "DELIVERED") updateData.deliveredAt = new Date();
  if (parsed.data.newStatus === "FULFILLED") updateData.fulfilledAt = new Date();
  if (parsed.data.newStatus === "REJECTED" && parsed.data.rejectedReason) {
    updateData.rejectedReason = parsed.data.rejectedReason;
  }

  const updated = await prisma.permintaanDonor.update({
    where: { id: req.params.id },
    data: updateData,
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "PermintaanDonor",
    entityId: updated.id,
    before: { status: before.reqStatus },
    after: { status: updated.reqStatus },
    ipAddress: req.ip,
  });

  if (before.patient) {
    const statusLabel: Record<string, string> = {
      ACC: "✅ Permintaan Anda diterima PMI",
      SHIPPED: "🚚 Darah sedang dikirim ke RS",
      DELIVERED: "🏥 Darah sudah sampai di RS",
      FULFILLED: "✅ Transaksi selesai",
      REJECTED: "❌ Permintaan ditolak",
      SEARCHING: "🔍 Mencari pendonor sukarela",
    };
    await notifyUser({
      userId: before.patient.userId,
      email: before.patient.user.email,
      type: "REQUEST_STATUS_UPDATE",
      title: statusLabel[parsed.data.newStatus] ?? "Status Permintaan Berubah",
      body: parsed.data.rejectedReason ?? `Status berubah menjadi ${parsed.data.newStatus}`,
      meta: { requestId: updated.id },
    });
  }

  return res.json({ message: "Status diperbarui", request: updated });
}
