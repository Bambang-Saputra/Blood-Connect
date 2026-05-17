import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * Use Case: UPDATE STOCK & CHECK AVAILABILITY
 * Activity Diagram #12
 *
 * Catatan keamanan:
 *   - hospitalId selalu diambil dari session (req.user) — tidak menerima dari body
 *     untuk mencegah mass assignment
 *   - Default StockStatus = QUARANTINE — harus di-verify dulu baru AVAILABLE
 */

const createStockSchema = z.object({
  bloodType: z.enum(["A", "B", "AB", "O"]),
  rhesusType: z.enum(["POSITIVE", "NEGATIVE"]),
  component: z.enum(["WHOLE_BLOOD", "PRC", "FFP", "TC", "CRYO"]).default("WHOLE_BLOOD"),
  quantity: z.number().int().positive(),
  expiryDate: z.string().datetime(),
  location: z.string(),
  source: z.string().optional(),
  donorId: z.string().optional(),
});

export async function createStock(req: AuthedRequest, res: Response) {
  const parsed = createStockSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (new Date(parsed.data.expiryDate) <= new Date()) {
    return res.status(400).json({ error: "ExpiryDate harus di masa depan" });
  }

  // Ambil hospitalId dari session — TIDAK pernah dari body
  const rs = await prisma.rumahSakit.findUnique({ where: { userId: req.user!.id } });
  if (!rs) return res.status(403).json({ error: "Hanya RS yang bisa menambah stok" });
  if (rs.status !== "VERIFIED") {
    return res.status(403).json({ error: "Akun RS belum diverifikasi admin" });
  }

  const stock = await prisma.stokDarah.create({
    data: {
      hospitalId: rs.id,
      bloodType: parsed.data.bloodType,
      rhesusType: parsed.data.rhesusType,
      component: parsed.data.component,
      quantity: parsed.data.quantity,
      expiryDate: new Date(parsed.data.expiryDate),
      location: parsed.data.location,
      source: parsed.data.source,
      donorId: parsed.data.donorId,
    },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "CREATE",
    entity: "StokDarah",
    entityId: stock.id,
    after: stock,
    ipAddress: req.ip,
  });

  return res.status(201).json({
    message: "Stok dibuat dengan status QUARANTINE. Tunggu uji laboratorium sebelum AVAILABLE.",
    stock,
  });
}

// Verifikasi stok lolos uji lab → status AVAILABLE
export async function verifyStock(req: AuthedRequest, res: Response) {
  const stock = await prisma.stokDarah.findUnique({ where: { id: req.params.id } });
  if (!stock) return res.status(404).json({ error: "Stok tidak ditemukan" });
  if (stock.status !== "QUARANTINE") {
    return res.status(400).json({ error: `Stok sudah berstatus ${stock.status}` });
  }

  const updated = await prisma.stokDarah.update({
    where: { id: stock.id },
    data: { status: "AVAILABLE" },
  });

  await writeAudit({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    entity: "StokDarah",
    entityId: stock.id,
    before: { status: "QUARANTINE" },
    after: { status: "AVAILABLE" },
    ipAddress: req.ip,
  });

  return res.json({ message: "Stok lolos uji & tersedia", stock: updated });
}

// Use Case: CHECK AVAILABILITY
export async function checkAvailability(req: AuthedRequest, res: Response) {
  const { bloodType, rhesusType, component, location } = req.query;

  const stocks = await prisma.stokDarah.findMany({
    where: {
      status: "AVAILABLE",
      expiryDate: { gt: new Date() },
      ...(bloodType && { bloodType: bloodType as any }),
      ...(rhesusType && { rhesusType: rhesusType as any }),
      ...(component && { component: component as any }),
      ...(location && { location: { contains: location as string, mode: "insensitive" } }),
    },
    select: {
      id: true,
      bloodType: true,
      rhesusType: true,
      component: true,
      quantity: true,
      expiryDate: true,
      location: true,
      hospital: { select: { hospitalName: true, hospitalLoc: true } },
    },
  });

  const summary = stocks.reduce<Record<string, number>>((acc, s) => {
    const k = `${s.bloodType}-${s.rhesusType}-${s.component}`;
    acc[k] = (acc[k] ?? 0) + s.quantity;
    return acc;
  }, {});

  return res.json({ stocks, summary });
}

// Stok milik RS yang login
export async function listMyStocks(req: AuthedRequest, res: Response) {
  const rs = await prisma.rumahSakit.findUnique({ where: { userId: req.user!.id } });
  if (!rs) return res.status(403).json({ error: "Hanya RS yang bisa lihat stok sendiri" });

  const stocks = await prisma.stokDarah.findMany({
    where: { hospitalId: rs.id },
    orderBy: { expiryDate: "asc" },
  });
  return res.json({ data: stocks });
}
