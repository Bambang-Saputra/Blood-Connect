import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";
import { writeAudit } from "../lib/audit";

/**
 * STOK DARAH CONTROLLER (di PMI)
 *   POST /stocks         — PMI tambah stok (langsung AVAILABLE, no quarantine)
 *   GET  /stocks         — public check availability
 *   GET  /stocks/mine    — PMI list stok mereka
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
      status: "AVAILABLE",  // langsung AVAILABLE — no quarantine
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
    message: "Stok dibuat & siap digunakan.",
    stock,
  });
}

// Public lookup
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

// PMI list stok mereka
export async function listMyStocks(req: AuthedRequest, res: Response) {
  const pmi = await prisma.pMI.findUnique({ where: { userId: req.user!.id } });
  if (!pmi) return res.status(403).json({ error: "Hanya PMI yang bisa lihat stok sendiri" });

  const stocks = await prisma.stokDarah.findMany({
    where: { pmiId: pmi.id },
    orderBy: { expiryDate: "asc" },
  });
  return res.json({ data: stocks });
}
