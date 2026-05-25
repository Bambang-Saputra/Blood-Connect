import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

/**
 * In-app Notification Inbox
 *   GET   /api/notifications        — list semua notif user (terbaru dulu)
 *   GET   /api/notifications/count  — jumlah unread (untuk badge)
 *   PATCH /api/notifications/:id/read
 *   PATCH /api/notifications/read-all
 */

export async function listMyNotifications(req: AuthedRequest, res: Response) {
  const data = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ data });
}

export async function unreadCount(req: AuthedRequest, res: Response) {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });
  return res.json({ count });
}

export async function markRead(req: AuthedRequest, res: Response) {
  const notif = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!notif) return res.status(404).json({ error: "Notifikasi tidak ditemukan" });

  await prisma.notification.update({
    where: { id: notif.id },
    data: { isRead: true },
  });
  return res.json({ message: "Ditandai dibaca" });
}

export async function markAllRead(req: AuthedRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });
  return res.json({ message: "Semua notifikasi ditandai dibaca" });
}
