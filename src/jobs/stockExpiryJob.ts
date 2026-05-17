import cron from "node-cron";
import { StockStatus, NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { notifyUser } from "../lib/notification";

/**
 * =====================================================================
 * CRON JOB: Stock Auto-Update (Fitur C)
 * =====================================================================
 * Use Case: UPDATE STOCK (auto branch — Activity Diagram #12)
 *   "Auto-update Status → Expired jika kadaluarsa"
 *
 * Schedule: setiap hari pukul 00:05 WIB
 * Aksi:
 *   1. Cari semua StokDarah AVAILABLE dengan expiryDate < NOW
 *   2. Set status = EXPIRED
 *   3. Notifikasi admin rumah sakit terkait (untuk audit)
 *
 * Juga: stock alert untuk batch yang akan expired < 3 hari.
 * =====================================================================
 */

export async function runStockExpiryCheck() {
  console.log("[cron] Menjalankan stock expiry check...");

  // [1] Tandai batch yang sudah lewat tanggal kadaluarsa
  const expired = await prisma.stokDarah.updateMany({
    where: {
      status: StockStatus.AVAILABLE,
      expiryDate: { lt: new Date() },
    },
    data: { status: StockStatus.EXPIRED },
  });
  console.log(`[cron] ${expired.count} batch stok di-set EXPIRED`);

  // [2] Notifikasi early-warning: stok yang akan expired < 3 hari
  const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const soonExpire = await prisma.stokDarah.findMany({
    where: {
      status: StockStatus.AVAILABLE,
      expiryDate: { gte: new Date(), lt: threeDays },
    },
    include: { hospital: { include: { user: true } } },
  });

  for (const batch of soonExpire) {
    await notifyUser({
      userId: batch.hospital.userId,
      type: NotificationType.STOCK_ALERT,
      title: "⚠️ Stok Darah Akan Kadaluarsa",
      body: `Batch ${batch.bloodType}${
        batch.rhesusType === "POSITIVE" ? "+" : "-"
      } (${batch.quantity} kantong) di ${batch.location} akan kadaluarsa pada ${batch.expiryDate.toISOString().slice(0, 10)}.`,
      meta: { stockId: batch.id },
    });
  }

  return { expiredCount: expired.count, soonExpireCount: soonExpire.length };
}

// Schedule daily at 00:05
export function startStockExpiryCron() {
  cron.schedule("5 0 * * *", () => {
    runStockExpiryCheck().catch((err) => console.error("[cron] error:", err));
  });
  console.log("✅ Cron stockExpiryJob terjadwal: setiap hari 00:05");
}

// Boleh dijalankan manual: `npm run job:expiry`
if (require.main === module) {
  runStockExpiryCheck().then((r) => {
    console.log("[cron] selesai:", r);
    process.exit(0);
  });
}
