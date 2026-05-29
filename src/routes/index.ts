import { Router } from "express";
import * as auth from "../controllers/authController";
import * as match from "../controllers/matchController";
import * as donor from "../controllers/donorController";
import * as stock from "../controllers/stockController";
import * as medical from "../controllers/medicalController";
import * as admin from "../controllers/adminController";
import * as notif from "../controllers/notificationController";
import * as pmi from "../controllers/pmiController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ============ AUTH ============
router.post("/auth/register", auth.register);             // Pendonor + Pasien
router.post("/auth/pmiregister", auth.registerPmi);       // PMI (link tersembunyi)
router.post("/auth/login", auth.login);
router.post("/auth/logout", requireAuth, auth.logout);
router.get("/auth/me", requireAuth, auth.getMe);
router.patch("/auth/me", requireAuth, auth.updateMe);
router.post("/auth/me/enable-mode", requireAuth, auth.enableMode);
router.post("/auth/switch-role", requireAuth, auth.switchRole);

// ============ NOTIFICATIONS ============
router.get("/notifications", requireAuth, notif.listMyNotifications);
router.get("/notifications/count", requireAuth, notif.unreadCount);
router.patch("/notifications/read-all", requireAuth, notif.markAllRead);
router.patch("/notifications/:id/read", requireAuth, notif.markRead);

// ============ REQUEST DARAH (Pasien & PMI) ============
router.get("/requests", requireAuth, match.listMyRequests);
router.post("/requests", requireAuth, requireRole("PASIEN"), match.createRequest);
router.get("/requests/:id", requireAuth, match.getRequest);
router.patch("/requests/:id/status", requireAuth, requireRole("PMI", "ADMIN"), match.updateRequestStatus);

// ============ PENDONOR ============
router.get("/donor/me", requireAuth, requireRole("PENDONOR"), donor.getMe);
router.get("/donor/screening/latest", requireAuth, requireRole("PENDONOR"), donor.getLatestScreening);
router.post("/donor/check-eligible", requireAuth, requireRole("PENDONOR"), donor.checkEligibleHandler);
router.post("/donor/schedules", requireAuth, requireRole("PENDONOR"), donor.createSchedule);
router.get("/donor/schedules", requireAuth, requireRole("PENDONOR"), donor.getMySchedules);
router.get("/donor/history", requireAuth, requireRole("PENDONOR"), donor.getDonorHistory);
router.get("/donor/notifications", requireAuth, requireRole("PENDONOR"), donor.listMyNotifications);
router.post("/donor/notifications/:id/respond", requireAuth, requireRole("PENDONOR"), donor.respondNotification);

// ============ MEDICAL (Skrining oleh donor sendiri) ============
router.post("/medical/screening", requireAuth, requireRole("PENDONOR"), medical.submitScreening);
router.get("/medical/me", requireAuth, requireRole("PENDONOR"), medical.getMyCheckups);

// ============ PMI (dashboard PMI) ============
router.get("/pmi/list", pmi.listPublicPmis);                                            // PUBLIC — buat dropdown register donor
router.get("/pmi/donors", requireAuth, requireRole("PMI"), pmi.listMyDonors);
router.post("/pmi/checkup", requireAuth, requireRole("PMI"), pmi.createCheckup);
router.post("/pmi/take-blood", requireAuth, requireRole("PMI"), pmi.takeBlood);
router.post("/pmi/broadcast", requireAuth, requireRole("PMI"), pmi.broadcastBloodRequest);
router.get("/pmi/schedules", requireAuth, requireRole("PMI"), pmi.getIncomingSchedules);
router.post("/pmi/requests/:id/acc", requireAuth, requireRole("PMI"), pmi.accRequest);

// ============ STOCK (PMI manage, public lookup) ============
router.get("/stocks", requireAuth, stock.checkAvailability);
router.post("/stocks", requireAuth, requireRole("PMI"), stock.createStock);
router.get("/stocks/mine", requireAuth, requireRole("PMI"), stock.listMyStocks);

// ============ ADMIN (verify PMI only) ============
router.get("/admin/pmis", requireAuth, requireRole("ADMIN"), admin.listPmis);
router.patch("/admin/pmis/:id/verify", requireAuth, requireRole("ADMIN"), admin.verifyPmi);
router.get("/admin/requests", requireAuth, requireRole("ADMIN"), admin.listAllRequests);
router.get("/admin/users", requireAuth, requireRole("ADMIN"), admin.listAllUsers);

export default router;
