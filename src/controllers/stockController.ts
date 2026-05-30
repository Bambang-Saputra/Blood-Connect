import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * Use Case: UPDATE STOCK & CHECK AVAILABILITY
 *
 * Catatan:
 *   - pmiId selalu diambil dari session (req.user) — tidak menerima dari body
 *     untuk mencegah mass assignment.
 *   - Stok langsung AVAILABLE (default schema). Admin tidak lagi terlibat
 *     verifikasi quarantine — PMI bertanggung jawab penuh validasi internal.
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

  // Ambil pmiId dari session — TIDAK pernah dari body
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa menambah stok" });
  if (pmi.status !== "VERIFIED") {
    return res.status(403).json({ error: "Akun PMI belum diverifikasi admin" });
  }

  const stock = await prisma.stokDarah.create({
    data: {
      pmiId: pmi.id,
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
    message: "Stok berhasil ditambahkan & langsung AVAILABLE.",
    stock,
  });
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
      pmi: { select: { pmiName: true, pmiLoc: true } },
    },
  });

  const summary = stocks.reduce<Record<string, number>>((acc, s) => {
    const k = `${s.bloodType}-${s.rhesusType}-${s.component}`;
    acc[k] = (acc[k] ?? 0) + s.quantity;
    return acc;
  }, {});

  return res.json({ stocks, summary });
}

// Stok milik PMI yang login
export async function listMyStocks(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa lihat stok sendiri" });

  const stocks = await prisma.stokDarah.findMany({
    where: { pmiId: pmi.id },
    orderBy: { expiryDate: "asc" },
  });
  return res.json({ data: stocks });
}

/**
 * GET /api/stocks/summary
 * Agregat stok per golongan darah untuk chart di dashboard PMI.
 * Hanya count stok AVAILABLE + belum expired milik PMI yang login.
 * Format response cocok untuk recharts BarChart.
 */
export async function getStockSummary(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa akses" });

  const stocks = await prisma.stokDarah.findMany({
    where: {
      pmiId: pmi.id,
      status: "AVAILABLE",
      expiryDate: { gt: new Date() },
    },
    select: { bloodType: true, rhesusType: true, quantity: true },
  });

  // Build matrix 8 slot: A+, A-, B+, B-, AB+, AB-, O+, O-
  const tally: Record<string, number> = {};
  for (const bt of ["A", "B", "AB", "O"]) {
    for (const rh of ["+", "-"]) {
      tally[`${bt}${rh}`] = 0;
    }
  }
  for (const s of stocks) {
    const key = `${s.bloodType}${s.rhesusType === "POSITIVE" ? "+" : "-"}`;
    tally[key] = (tally[key] ?? 0) + s.quantity;
  }

  const data = Object.entries(tally).map(([label, total]) => ({ label, total }));
  return res.json({ data, totalAll: stocks.reduce((s, x) => s + x.quantity, 0) });
}
