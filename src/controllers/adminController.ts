import { Response } from "express";
import { z } from "zod";
import { HospitalStatus, NotificationType, ScheduleStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { notifyUser } from "../lib/notification";
import { writeAudit } from "../lib/audit";

/**
 * Endpoints khusus admin pusat Blood Connect.
 *   - GET  /admin/schedules?status=PENDING
 *   - PATCH /admin/schedules/:id          (Use Case CONFIRM)
 *   - GET  /admin/requests?status=PENDING
 *   - GET  /admin/hospitals?status=UNVERIFIED
 *   - PATCH /admin/hospitals/:id/verify
 */

// ===== 1) List jadwal pending (Use Case CONFIRM) =====
export async function listSchedules(req: AuthedRequest, res: Response) {
  const status = req.query.status as ScheduleStatus | undefined;
  const data = await prisma.jadwalDonor.findMany({
    where: status ? { status } : undefined,
    include: { donor: { include: { user: { select: { name: true, phoneNum: true, city: true } } } } },
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

  // Validasi reschedule butuh newDate
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

// ===== 3) List request darah (untuk admin escalation) =====
export async function listRequests(req: AuthedRequest, res: Response) {
  const status = req.query.status as string | undefined;
  const data = await prisma.permintaanDonor.findMany({
    where: status ? { reqStatus: status as any } : undefined,
    include: {
      patient: { include: { user: { select: { name: true, city: true } } } },
      hospital: { select: { hospitalName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json({ data });
}

// ===== 3b) List stok yang menunggu verifikasi (QUARANTINE) =====
export async function listQuarantineStocks(_req: AuthedRequest, res: Response) {
  const data = await prisma.stokDarah.findMany({
    where: { status: "QUARANTINE" },
    include: { hospital: { select: { hospitalName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ data });
}

// ===== 4) List RS yang menunggu verifikasi =====
export async function listHospitals(req: AuthedRequest, res: Response) {
  const status = req.query.status as HospitalStatus | undefined;
  const data = await prisma.rumahSakit.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { email: true, phoneNum: true, city: true } } },
    orderBy: { user: { createdAt: "desc" } },
  });
  return res.json({ data });
}

// ===== 5) Verify / suspend RS =====
const verifyHospitalSchema = z.object({
  status: z.enum(["VERIFIED", "SUSPENDED", "UNVERIFIED"]),
});

export async function verifyHospital(req: AuthedRequest, res: Response) {
  const parsed = verifyHospitalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.rumahSakit.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  });
  if (!existing) return res.status(404).json({ error: "RS tidak ditemukan" });

  const updated = await prisma.rumahSakit.update({
    where: { id: req.params.id },
    data: {
      status: parsed.data.status as HospitalStatus,
      verifiedAt: parsed.data.status === "VERIFIED" ? new Date() : null,
      verifiedById: parsed.data.status === "VERIFIED" ? req.user!.id : null,
    },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "RumahSakit",
    entityId: existing.id,
    before: { status: existing.status },
    after: { status: updated.status },
    ipAddress: req.ip,
  });

  await notifyUser({
    userId: existing.userId,
    email: existing.user.email,
    type: NotificationType.ACCOUNT_VERIFICATION,
    title: `Status Rumah Sakit: ${parsed.data.status}`,
    body: parsed.data.status === "VERIFIED"
      ? "Akun RS Anda telah diverifikasi. Sekarang Anda bisa mengelola stok & request darah."
      : `Status RS Anda diubah menjadi ${parsed.data.status}.`,
  });

  return res.json({ message: "Status RS diperbarui", hospital: updated });
}
