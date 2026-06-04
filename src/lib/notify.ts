import { prisma } from "./prisma";
import { NotificationType } from "@prisma/client";

/**
 * =====================================================================
 * NOTIFY — helper pembuat notifikasi in-app
 * =====================================================================
 * Semua penulisan notifikasi dibungkus try/catch supaya kegagalan
 * membuat notifikasi TIDAK PERNAH menggagalkan alur utama. Contoh:
 * accept/fulfill request harus tetap sukses walau penulisan notif gagal.
 * (Pelajaran dari Bug #1: error sekunder tak boleh menjatuhkan transaksi
 *  utama / meng-crash server.)
 */
export async function notifyUser(args: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        type: args.type,
        title: args.title,
        body: args.body,
        meta: (args.meta ?? undefined) as any,
      },
    });
  } catch (err) {
    console.error("[notify] gagal membuat notifikasi:", err);
  }
}

// ---------------------------------------------------------------------
// Pesan perubahan status permintaan darah — ditujukan ke PASIEN pemilik.
// ---------------------------------------------------------------------
const REQUEST_STATUS_MESSAGES: Record<
  string,
  (pmi?: string) => { title: string; body: string }
> = {
  PROCESSING: (pmi) => ({
    title: "Permintaan diterima PMI",
    body: `${pmi ?? "Sebuah PMI"} telah menerima dan sedang memproses permintaan darah Anda.`,
  }),
  IN_TRANSIT: (pmi) => ({
    title: "Darah sedang dikirim 🚑",
    body: `${pmi ?? "PMI"} sedang mengirim darah ke rumah sakit tujuan Anda.`,
  }),
  FULFILLED: (pmi) => ({
    title: "Permintaan terpenuhi 🎉",
    body: `Permintaan darah Anda telah dipenuhi oleh ${pmi ?? "PMI"}.`,
  }),
  REJECTED: () => ({
    title: "Permintaan ditolak",
    body: "Maaf, permintaan darah Anda ditolak. Anda dapat mengajukan permintaan baru.",
  }),
  CANCELLED: () => ({
    title: "Permintaan dibatalkan",
    body: "Permintaan darah Anda telah dibatalkan.",
  }),
};

/**
 * Kirim notifikasi perubahan status request ke pasien pemiliknya.
 * Aman dipanggil walau patientUserId null (request tanpa pasien → di-skip).
 */
export async function notifyRequestStatus(opts: {
  patientUserId: string | null | undefined;
  requestId: string;
  newStatus: string;
  pmiName?: string | null;
}): Promise<void> {
  if (!opts.patientUserId) return;
  const build = REQUEST_STATUS_MESSAGES[opts.newStatus];
  if (!build) return;
  const { title, body } = build(opts.pmiName ?? undefined);
  await notifyUser({
    userId: opts.patientUserId,
    type: NotificationType.REQUEST_STATUS_UPDATE,
    title,
    body,
    meta: { requestId: opts.requestId, newStatus: opts.newStatus, pmiName: opts.pmiName ?? null },
  });
}
