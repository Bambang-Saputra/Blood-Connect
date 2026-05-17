import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { NotificationType, Prisma } from "@prisma/client";

/**
 * Notification helper
 * ----------------------------------------------------
 * Activity Diagram: "Kirim notifikasi kepada pendonor eligible"
 * (Match Donor — diagram 14/15) dan "Kirim notifikasi pasien" (Update Status).
 *
 * Strategi: dual-channel
 *   1. In-app Notification (persist ke DB → real-time via SSE/Pusher)
 *   2. Email (Nodemailer) → fallback agar pendonor tetap dapat info offline
 */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  email?: string; // optional → trigger email
}

export async function notifyUser(p: NotifyParams) {
  // 1) Persist in-app notification (untuk inbox dashboard)
  await prisma.notification.create({
    data: {
      userId: p.userId,
      type: p.type,
      title: p.title,
      body: p.body,
      meta: p.meta as Prisma.JsonObject | undefined,
    },
  });

  // 2) Best-effort email — JANGAN gagalkan transaksi utama jika SMTP error
  if (p.email && process.env.SMTP_HOST) {
    transporter
      .sendMail({
        from: process.env.SMTP_FROM,
        to: p.email,
        subject: p.title,
        text: p.body,
      })
      .catch((err) => console.error("[notify] email error:", err.message));
  }
}
