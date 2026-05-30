import { Response } from "express";
import { z } from "zod";
import { PmiStatus, NotificationType, ScheduleStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { notifyUser } from "../lib/notification";
import { writeAudit } from "../lib/audit";

/**
 * Endpoints khusus admin pusat Blood Connect.
 *   - GET    /admin/schedules?status=PENDING
 *   - PATCH  /admin/schedules/:id          (Use Case CONFIRM)
 *   - GET    /admin/requests?status=PENDING
 *   - GET    /admin/pmis?status=UNVERIFIED
 *   - PATCH  /admin/pmis/:id/verify
 *   - GET    /admin/stocks/quarantine
 */

// ===== 1) List jadwal pending =====
export async function listSchedules(req: AuthedRequest, res: Response) {
  const status = req.query.status as ScheduleStatus | undefined;
  const data = await prisma.jadwalDonor.findMany({
    where: status ? { status } : undefined,
    include: {
      donor: { include: { user: { select: { name: true, phoneNum: true, city: true } } } },
      pmi: { select: { pmiName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json({ data });
}

// ===== 2) Confirm / Reject / Reschedule jadwal =====
const scheduleActionSchema = z.object({
  status: z.enum(["CONFIRMED", "REJECTED", "RESCHEDULED"]),
  newDate: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export async function updateSchedule(req: AuthedRequest, res: Response) {
  const parsed = scheduleActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.jadwalDonor.findUnique({
    where: { id: req.params.id },
    include: { donor: { include: { user: true } } },
  });
  if (!existing) return res.status(404).json({ error: "Jadwal tidak ditemukan" });

  if (parsed.data.status === "RESCHEDULED" && !parsed.data.newDate) {
    return res.status(400).json({ error: "newDate wajib untuk reschedule" });
  }

  const updated = await prisma.jadwalDonor.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status as ScheduleStatus,
      newDate: parsed.data.newDate ? new Date(parsed.data.newDate) : undefined,
      note: parsed.data.note,
    },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "JadwalDonor",
    entityId: existing.id,
    before: { status: existing.status },
    after: { status: updated.status, newDate: updated.newDate },
    ipAddress: req.ip,
  });

  await notifyUser({
    userId: existing.donor.userId,
    email: existing.donor.user.email,
    type: NotificationType.SCHEDULE_UPDATE,
    title: `Jadwal donor Anda di-${parsed.data.status.toLowerCase()}`,
    body: parsed.data.status === "RESCHEDULED"
      ? `Jadwal baru: ${new Date(parsed.data.newDate!).toLocaleDateString("id-ID")}. ${parsed.data.note ?? ""}`
      : parsed.data.note ?? `Status jadwal diperbarui menjadi ${parsed.data.status}.`,
    meta: { scheduleId: existing.id },
  });

  return res.json({ message: "Jadwal diperbarui", schedule: updated });
}

// ===== 3) List request darah =====
export async function listRequests(req: AuthedRequest, res: Response) {
  const status = req.query.status as string | undefined;
  const data = await prisma.permintaanDonor.findMany({
    where: status ? { reqStatus: status as any } : undefined,
    include: {
      patient: { include: { user: { select: { name: true, email: true, city: true } } } },
      acceptedByPmi: { select: { pmiName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json({ data });
}

// ===== 4) List PMI yang menunggu verifikasi =====
export async function listPmis(req: AuthedRequest, res: Response) {
  const status = req.query.status as PmiStatus | undefined;
  const data = await prisma.pMI.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { email: true, phoneNum: true, city: true } } },
    orderBy: { user: { createdAt: "desc" } },
  });
  return res.json({ data });
}

// ===== 5) Verify / suspend PMI =====
const verifyPmiSchema = z.object({
  status: z.enum(["VERIFIED", "SUSPENDED", "UNVERIFIED"]),
});

export async function verifyPmi(req: AuthedRequest, res: Response) {
  const parsed = verifyPmiSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.pMI.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!existing) return res.status(404).json({ error: "PMI tidak ditemukan" });

  const updated = await prisma.pMI.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status as PmiStatus,
      verifiedAt: parsed.data.status === "VERIFIED" ? new Date() : null,
      verifiedById: parsed.data.status === "VERIFIED" ? req.user!.id : null,
    },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "PMI",
    entityId: existing.id,
    before: { status: existing.status },
    after: { status: updated.status },
    ipAddress: req.ip,
  });

  await notifyUser({
    userId: existing.userId,
    email: existing.user.email,
    type: NotificationType.ACCOUNT_VERIFICATION,
    title: `Status PMI: ${parsed.data.status}`,
    body: parsed.data.status === "VERIFIED"
      ? "Akun PMI Anda telah diverifikasi. Sekarang Anda bisa mengelola stok & request darah."
      : `Status PMI Anda diubah menjadi ${parsed.data.status}.`,
  });

  return res.json({ message: "Status PMI diperbarui", pmi: updated });
}
