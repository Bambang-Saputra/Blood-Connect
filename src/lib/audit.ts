import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Audit log helper — wajib untuk compliance UU PDP & regulasi medis.
 * Setiap mutasi penting (stok, request, status) HARUS write audit.
 *
 * Dipakai best-effort: jangan gagalkan transaksi utama jika audit error.
 */
interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before as Prisma.InputJsonValue | undefined,
        after: entry.after as Prisma.InputJsonValue | undefined,
        ipAddress: entry.ipAddress,
      },
    });
  } catch (err) {
    console.error("[audit] gagal tulis log:", err);
  }
}
