import { Router } from "express";
import * as auth from "../controllers/authController";
import * as match from "../controllers/matchController";
import * as donor from "../controllers/donorController";
import * as stock from "../controllers/stockController";
import * as medical from "../controllers/medicalController";
import * as admin from "../controllers/adminController";
import * as pmi from "../controllers/pmiController";
import * as notif from "../controllers/notificationController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ---------------------- AUTH -----------------------------------------
router.post("/auth/register", auth.register);              // Pendonor / Pasien only
router.post("/auth/register-pmi", auth.registerPmi);       // PMI registration (terpisah)
router.post("/auth/login", auth.login);
router.post("/auth/logout", requireAuth, auth.logout);
router.get("/auth/me", requireAuth, auth.getMe);
router.patch("/auth/me", requireAuth, auth.updateMe);
router.post("/auth/me/enable-mode", requireAuth, auth.enableMode);
router.post("/auth/switch-role", requireAuth, auth.switchRole);

// ---------------------- NOTIFICATION INBOX ---------------------------
router.get("/notifications", requireAuth, notif.listMyNotifications);
router.get("/notifications/count", requireAuth, notif.unreadCount);
router.patch("/notifications/read-all", requireAuth, notif.markAllRead);
router.patch("/notifications/:id/read", requireAuth, notif.markRead);

// ---------------------- REQUEST DARAH --------------------------------
// Auto-match dihapus — request stays PENDING sampai PMI accept eksplisit,
// dan stok hanya dipotong saat PMI klik Fulfill.
router.get("/requests", requireAuth, match.listMyRequests);
router.post("/requests", requireAuth, requireRole("PASIEN"), match.createRequest);   // Pasien only
router.get("/requests/:id", requireAuth, match.getRequest);
router.post("/requests/:id/accept", requireAuth, requireRole("PMI"), match.acceptRequest);
router.patch("/requests/:id/status", requireAuth, requireRole("PMI", "ADMIN"), match.updateRequestStatus);

// ---------------------- PENDONOR -------------------------------------
router.get("/donor/me", requireAuth, requireRole("PENDONOR"), donor.getMe);
router.patch("/donor/me/preferred-pmi", requireAuth, requireRole("PENDONOR"), donor.updatePreferredPmi);
router.post("/donor/check-eligible", requireAuth, requireRole("PENDONOR"), donor.checkEligibleHandler);
router.post("/donor/schedules", requireAuth, requireRole("PENDONOR"), donor.createSchedule);
router.get("/donor/schedules", requireAuth, requireRole("PENDONOR"), donor.listMySchedules);
router.get("/donor/history", requireAuth, requireRole("PENDONOR"), donor.getDonorHistory);
router.get("/donor/notifications", requireAuth, requireRole("PENDONOR"), donor.listMyNotifications);
router.post("/donor/notifications/:id/respond", requireAuth, requireRole("PENDONOR"), donor.respondNotification);
router.get("/donor/open-requests", requireAuth, requireRole("PENDONOR"), donor.listOpenRequests);
router.post("/donor/volunteer/:requestId", requireAuth, requireRole("PENDONOR"), donor.volunteerForRequest);
router.get("/donor/broadcasts", requireAuth, requireRole("PENDONOR"), donor.listNearbyBroadcasts);

// ---------------------- PMI DASHBOARD --------------------------------
router.get("/pmi/me", requireAuth, requireRole("PMI"), pmi.getMyPmi);
router.get("/pmi/list", requireAuth, pmi.listPublicPmis);                                  // public list — semua role bisa lihat
router.get("/pmi/schedules", requireAuth, requireRole("PMI"), pmi.listMySchedules);
router.post("/pmi/schedules/:id/checkup", requireAuth, requireRole("PMI"), pmi.inputScheduleCheckup);
router.patch("/pmi/schedules/:id/status", requireAuth, requireRole("PMI"), pmi.updateScheduleStatus);
// Broadcast minta stok ke donor terdekat (kota sama)
router.post("/pmi/broadcasts", requireAuth, requireRole("PMI"), pmi.createBroadcast);
router.get("/pmi/broadcasts", requireAuth, requireRole("PMI"), pmi.listMyBroadcasts);
router.patch("/pmi/broadcasts/:id/close", requireAuth, requireRole("PMI"), pmi.closeBroadcast);

// ---------------------- MEDICAL (cek fisik fallback + skrining) ------
router.get("/medical/donor-lookup", requireAuth, requireRole("ADMIN", "PMI"), medical.lookupDonor);
router.post("/medical/checkup", requireAuth, requireRole("ADMIN", "PMI"), medical.createCheckup);
router.post("/medical/screening", requireAuth, requireRole("PENDONOR"), medical.submitScreening);
router.get("/medical/me", requireAuth, requireRole("PENDONOR"), medical.getMyCheckups);

// ---------------------- STOCK ----------------------------------------
// Stok langsung AVAILABLE — tidak ada lagi /stocks/:id/verify (quarantine dihapus).
router.get("/stocks", requireAuth, stock.checkAvailability);
router.post("/stocks", requireAuth, requireRole("PMI"), stock.createStock);
router.get("/stocks/mine", requireAuth, requireRole("PMI"), stock.listMyStocks);
router.get("/stocks/summary", requireAuth, requireRole("PMI"), stock.getStockSummary);

// ---------------------- ADMIN ----------------------------------------
// Admin hanya urusan verifikasi PMI + read-only audit. TIDAK menyentuh stok.
router.get("/admin/schedules", requireAuth, requireRole("ADMIN"), admin.listSchedules);
router.patch("/admin/schedules/:id", requireAuth, requireRole("ADMIN"), admin.updateSchedule);
router.get("/admin/requests", requireAuth, requireRole("ADMIN"), admin.listRequests);
router.get("/admin/pmis", requireAuth, requireRole("ADMIN"), admin.listPmis);
router.patch("/admin/pmis/:id/verify", requireAuth, requireRole("ADMIN"), admin.verifyPmi);

// Backward-compat aliases (sementara) — FE lama masih panggil /admin/hospitals
router.get("/admin/hospitals", requireAuth, requireRole("ADMIN"), admin.listPmis);
router.patch("/admin/hospitals/:id/verify", requireAuth, requireRole("ADMIN"), admin.verifyPmi);

export default router;
