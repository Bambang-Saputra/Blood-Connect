import { Response } from "express";
import { z } from "zod";
import { PmiStatus, NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { notifyUser } from "../lib/notification";
import { writeAudit } from "../lib/audit";

/**
 * ADMIN CONTROLLER (SIMPLIFIED)
 * Tugas admin: verify PMI registration only.
 * NO quarantine, NO schedule confirmation (PMI urus sendiri).
 *
 *   GET   /admin/pmis?status=UNVERIFIED  — list PMI menunggu
 *   PATCH /admin/pmis/:id/verify         — approve/suspend
 *   GET   /admin/requests                — view all requests (read-only audit)
 *   GET   /admin/users                   — view all users (audit)
 */

export async function listPmis(req: AuthedRequest, res: Response) {
  const status = req.query.status as PmiStatus | undefined;
  const data = await prisma.pMI.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { email: true, phoneNum: true, city: true } } },
    orderBy: { user: { createdAt: "desc" } },
  });
  return res.json({ data });
}

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
      ? "Akun PMI Anda telah diverifikasi. Sekarang Anda bisa kelola stok & terima request."
      : `Status PMI Anda diubah menjadi ${parsed.data.status}.`,
  });

  return res.json({ message: "Status PMI diperbarui", pmi: updated });
}

// Read-only audit view
export async function listAllRequests(_req: AuthedRequest, res: Response) {
  const data = await prisma.permintaanDonor.findMany({
    include: {
      patient: { include: { user: { select: { name: true } } } },
      pmi: { select: { pmiName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json({ data });
}

export async function listAllUsers(_req: AuthedRequest, res: Response) {
  const data = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, city: true,
      createdAt: true, isBlocked: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return res.json({ data });
}
