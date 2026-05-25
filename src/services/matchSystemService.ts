import { Prisma, RequestStatus, StockStatus, NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { notifyUser } from "../lib/notification";

/**
 * =====================================================================
 * SERVICE: MatchSystem Engine (Fitur B)
 * =====================================================================
 * Use Case: REQUEST, MATCH STOCK, MATCH REQUEST, CHECK AVAILABILITY
 * Activity Diagram #15 (Match Stok) + #14 (Match Donor)
 *
 * Sequence:
 *   requestBlood()  ──► processMatch(requestId)
 *                          │
 *                          ├─ Step 1: matchStockToRequest()
 *                          │     ├─ FOUND  → allocate stock, FULFILLED. END.
 *                          │     └─ NONE   → fallthrough
 *                          │
 *                          └─ Step 2: matchDonorToRequest()
 *                                ├─ FOUND donors → notify, MATCHED_DONOR
 *                                └─ NONE         → request tetap PENDING (manual escalation)
 *
 * Konkurensi:
 *   - Menggunakan prisma.$transaction(SERIALIZABLE) supaya 2 RS yang
 *     request bersamaan tidak double-claim stok yang sama (race condition).
 *   - SELECT ... FOR UPDATE (via raw lock) memastikan baris stok terkunci
 *     selama transaksi berlangsung.
 * =====================================================================
 */

// ---------------------------------------------------------------------
// Kompatibilitas golongan darah (UML: checkCompatibleBlood)
// Recipient → Donor types yang compatible
// Versi sederhana (whole blood); untuk komponen tertentu rule berbeda.
// ---------------------------------------------------------------------
const COMPAT: Record<string, string[]> = {
  "O-":  ["O-"],
  "O+":  ["O-", "O+"],
  "A-":  ["O-", "A-"],
  "A+":  ["O-", "O+", "A-", "A+"],
  "B-":  ["O-", "B-"],
  "B+":  ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], // universal recipient
};

function key(bt: string, rh: string) {
  return `${bt}${rh === "POSITIVE" ? "+" : "-"}`;
}

function compatiblePairs(recipientBt: string, recipientRh: string) {
  const recipientKey = key(recipientBt, recipientRh);
  const list = COMPAT[recipientKey] ?? [];
  return list.map((k) => {
    const rh = k.endsWith("+") ? "POSITIVE" : "NEGATIVE";
    const bt = k.replace(/[+-]$/, "");
    return { bloodType: bt as any, rhesusType: rh as any };
  });
}

// =====================================================================
// PUBLIC ENTRY POINT
// =====================================================================
export interface MatchResult {
  requestId: string;
  status: RequestStatus;
  source: "STOCK" | "DONOR" | "UNFULFILLED";
  allocatedFrom?: { stockId: string; quantity: number }[];
  notifiedDonors?: string[];
  message: string;
}

export async function processMatch(requestId: string): Promise<MatchResult> {
  // Langkah 1: coba dari stok dulu (lebih cepat & instan)
  const stockResult = await matchStockToRequest(requestId);
  if (stockResult.source === "STOCK") return stockResult;

  // Langkah 2: stok kosong → cari pendonor eligible
  return matchDonorToRequest(requestId);
}

// =====================================================================
// STEP 1 — matchStockToRequest (Activity Diagram #15)
// =====================================================================
export async function matchStockToRequest(requestId: string): Promise<MatchResult> {
  /**
   * Activity flow:
   *   1.1 Cek Stok Darah: BloodType, RhesusType, Quantity, !EXPIRED
   *   2.1 Cocokkan stok yang sesuai
   *   2.2 Alokasikan stok dan kurangi Quantity
   *   2.3 Update ReqStatus → FULFILLED
   *
   * Wrapped dalam $transaction dengan isolation level Serializable.
   * Jika dua request bersamaan menarget stok sama, salah satu akan
   * mendapat serialization error → kita retry dengan caller-level retry.
   */
  return prisma.$transaction(
    async (tx) => {
      const request = await tx.permintaanDonor.findUnique({ where: { id: requestId } });
      if (!request) throw new Error("Request tidak ditemukan");
      if (request.reqStatus !== RequestStatus.PENDING && request.reqStatus !== RequestStatus.PROCESSING) {
        return {
          requestId,
          status: request.reqStatus,
          source: "UNFULFILLED" as const,
          message: "Request tidak dalam status yang bisa diproses",
        };
      }

      // Tandai PROCESSING dulu agar request lain tidak ikut memproses
      await tx.permintaanDonor.update({
        where: { id: requestId },
        data: { reqStatus: RequestStatus.PROCESSING },
      });

      // [1.1] Cari stok kompatibel, belum expired, masih AVAILABLE
      const compatPairs = compatiblePairs(request.bloodType, request.rhesusType);

      // Raw SQL agar dapat FOR UPDATE lock → critical untuk konkurensi
      const lockedStocks = await tx.$queryRaw<
        { id: string; quantity: number }[]
      >(Prisma.sql`
        SELECT id, quantity
        FROM "StokDarah"
        WHERE status = 'AVAILABLE'
          AND "expiryDate" > NOW()
          AND (${Prisma.join(
            compatPairs.map(
              (p) => Prisma.sql`("bloodType" = ${p.bloodType}::"BloodType" AND "rhesusType" = ${p.rhesusType}::"RhesusType")`
            ),
            " OR "
          )})
        ORDER BY "expiryDate" ASC      -- FEFO: First Expiry First Out
        FOR UPDATE SKIP LOCKED         -- supaya konkurensi tidak deadlock
      `);

      // [2.1] Alokasikan stok sampai quantity terpenuhi
      let remaining = request.quantity;
      const allocations: { stockId: string; quantity: number }[] = [];

      for (const stock of lockedStocks) {
        if (remaining <= 0) break;
        const take = Math.min(stock.quantity, remaining);
        allocations.push({ stockId: stock.id, quantity: take });
        remaining -= take;
      }

      // [Exception 1.1] Stok tidak mencukupi → rollback PROCESSING, lanjut ke donor
      if (remaining > 0) {
        await tx.permintaanDonor.update({
          where: { id: requestId },
          data: { reqStatus: RequestStatus.PENDING },
        });
        return {
          requestId,
          status: RequestStatus.PENDING,
          source: "UNFULFILLED" as const,
          message: "Stok tidak mencukupi, lanjut pencarian pendonor",
        };
      }

      // [2.2] Kurangi quantity di tiap batch + buat allocation record
      for (const alloc of allocations) {
        const newQty = lockedStocks.find((s) => s.id === alloc.stockId)!.quantity - alloc.quantity;
        await tx.stokDarah.update({
          where: { id: alloc.stockId },
          data: {
            quantity: newQty,
            status: newQty === 0 ? StockStatus.USED : StockStatus.AVAILABLE,
          },
        });
        await tx.stockAllocation.create({
          data: { requestId, stockId: alloc.stockId, quantity: alloc.quantity },
        });
      }

      // [2.3] Update ReqStatus → MATCHED_STOCK (admin RS akan konfirmasi handover → FULFILLED)
      await tx.permintaanDonor.update({
        where: { id: requestId },
        data: { reqStatus: RequestStatus.MATCHED_STOCK, fulfilledAt: new Date() },
      });

      return {
        requestId,
        status: RequestStatus.MATCHED_STOCK,
        source: "STOCK" as const,
        allocatedFrom: allocations,
        message: `Stok ditemukan dari ${allocations.length} batch`,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 15_000,
    }
  );
}

// =====================================================================
// STEP 2 — matchDonorToRequest (Activity Diagram #14)
// =====================================================================
export async function matchDonorToRequest(requestId: string): Promise<MatchResult> {
  /**
   * Activity flow:
   *   1.1 Cek kompatibilitas golongan darah (checkCompatibleBlood)
   *   2.1 Cari pendonor BloodType + RhesusType cocok & isEligible
   *   2.2 Cocokkan pendonor dengan permintaan (dengan filter kota terdekat)
   *   2.3 Kirim notifikasi (notifyEligibleDonor)
   */
  const request = await prisma.permintaanDonor.findUnique({
    where: { id: requestId },
    include: {
      patient: { include: { user: true } },
      hospital: { include: { user: true } },
    },
  });
  if (!request) throw new Error("Request tidak ditemukan");

  const targetUser = request.patient?.user ?? request.hospital?.user;
  const targetCity = targetUser?.city ?? null;
  const targetProvince = targetUser?.province ?? null;
  const targetZone = targetUser?.zone ?? null;
  const compatPairs = compatiblePairs(request.bloodType, request.rhesusType);

  // [2.1] Tiered location matching:
  //   Tier 1: SAME CITY (paling dekat)
  //   Tier 2: SAME ZONE (region terdekat — Jabodetabek, Bandung Raya, dll)
  //   Tier 3: SAME PROVINCE
  //   Tier 4: ANY (kalau urgent / fallback)
  // Cari secara berurutan, berhenti saat dapat >=10 kandidat
  const baseFilter = {
    isEligible: true,
    isActive: true,
    OR: compatPairs.map((p) => ({ bloodType: p.bloodType, rhesusType: p.rhesusType })),
  };

  const tiers: { name: string; locationFilter: any }[] = [
    ...(targetCity ? [{ name: "city", locationFilter: { user: { city: targetCity } } }] : []),
    ...(targetZone ? [{ name: "zone", locationFilter: { user: { zone: targetZone } } }] : []),
    ...(targetProvince ? [{ name: "province", locationFilter: { user: { province: targetProvince } } }] : []),
    { name: "any", locationFilter: {} }, // fallback nasional
  ];

  let candidates: any[] = [];
  let matchedTier = "any";
  for (const tier of tiers) {
    candidates = await prisma.pendonor.findMany({
      where: { ...baseFilter, ...tier.locationFilter },
      include: { user: true },
      take: 50,
      orderBy: { lastDonationDate: "asc" },
    });
    if (candidates.length >= 10) {
      matchedTier = tier.name;
      break;
    }
    if (candidates.length > 0) matchedTier = tier.name;
  }

  if (candidates.length === 0) {
    // Tidak ada — biarkan PENDING, admin perlu eskalasi manual
    return {
      requestId,
      status: RequestStatus.PENDING,
      source: "UNFULFILLED",
      message: "Tidak ada pendonor eligible & stok tidak tersedia. Eskalasi ke admin.",
    };
  }

  // [2.2 + 2.3] Buat record notifikasi + kirim notif (in-app + email)
  await prisma.$transaction([
    prisma.permintaanDonor.update({
      where: { id: requestId },
      data: { reqStatus: RequestStatus.MATCHED_DONOR },
    }),
    prisma.donorNotification.createMany({
      data: candidates.map((c) => ({ donorId: c.id, requestId })),
      skipDuplicates: true,
    }),
  ]);

  // Fire-and-forget notifikasi (jangan block response)
  Promise.all(
    candidates.map((c) =>
      notifyUser({
        userId: c.userId,
        email: c.user.email,
        type: NotificationType.ELIGIBLE_DONOR_REQUEST,
        title: "Permintaan Donor Darah Mendesak",
        body: `Dibutuhkan darah ${request.bloodType}${
          request.rhesusType === "POSITIVE" ? "+" : "-"
        } sebanyak ${request.quantity} kantong di ${targetCity ?? "lokasi terdekat"}. Anda eligible — mohon respons jika bersedia.`,
        meta: { requestId, urgency: request.urgency },
      })
    )
  ).catch((err) => console.error("[matchSystem] notif batch error:", err));

  return {
    requestId,
    status: RequestStatus.MATCHED_DONOR,
    source: "DONOR",
    notifiedDonors: candidates.map((c) => c.id),
    message: `${candidates.length} pendonor eligible telah dinotifikasi (radius: ${matchedTier})`,
  };
}
