import { Router } from "express";
import * as auth from "../controllers/authController";
import * as match from "../controllers/matchController";
import * as donor from "../controllers/donorController";
import * as stock from "../controllers/stockController";
import * as medical from "../controllers/medicalController";
import * as admin from "../controllers/adminController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// ---------------------- AUTH -----------------------------------------
router.post("/auth/register", auth.register);
router.post("/auth/login", auth.login);
router.post("/auth/logout", requireAuth, auth.logout);

// ---------------------- REQUEST DARAH + MATCHSYSTEM ------------------
router.get("/requests", requireAuth, match.listMyRequests);          // ?mine=true implicit
router.post("/requests", requireAuth, requireRole("PASIEN", "RUMAH_SAKIT"), match.createRequest);
router.get("/requests/:id", requireAuth, match.getRequest);
router.patch("/requests/:id/status", requireAuth, requireRole("RUMAH_SAKIT", "ADMIN"), match.updateRequestStatus);
router.post("/requests/:id/match", requireAuth, requireRole("ADMIN"), match.triggerMatch);

// ---------------------- PENDONOR -------------------------------------
router.get("/donor/me", requireAuth, requireRole("PENDONOR"), donor.getMe);
router.post("/donor/check-eligible", requireAuth, requireRole("PENDONOR"), donor.checkEligibleHandler);
router.post("/donor/schedules", requireAuth, requireRole("PENDONOR"), donor.createSchedule);
router.get("/donor/history", requireAuth, requireRole("PENDONOR"), donor.getDonorHistory);
router.get("/donor/notifications", requireAuth, requireRole("PENDONOR"), donor.listMyNotifications);
router.post("/donor/notifications/:id/respond", requireAuth, requireRole("PENDONOR"), donor.respondNotification);

// ---------------------- MEDICAL (Pemeriksaan + Screening) ------------
router.get("/medical/donor-lookup", requireAuth, requireRole("ADMIN", "RUMAH_SAKIT"), medical.lookupDonor);
router.post("/medical/checkup", requireAuth, requireRole("ADMIN", "RUMAH_SAKIT"), medical.createCheckup);
router.post("/medical/screening", requireAuth, requireRole("PENDONOR"), medical.submitScreening);
router.get("/medical/me", requireAuth, requireRole("PENDONOR"), medical.getMyCheckups);

// ---------------------- STOCK ----------------------------------------
router.get("/stocks", requireAuth, stock.checkAvailability);                                  // public lookup
router.post("/stocks", requireAuth, requireRole("RUMAH_SAKIT"), stock.createStock);
router.get("/stocks/mine", requireAuth, requireRole("RUMAH_SAKIT"), stock.listMyStocks);
router.patch("/stocks/:id/verify", requireAuth, requireRole("ADMIN"), stock.verifyStock);

// ---------------------- ADMIN ----------------------------------------
router.get("/admin/schedules", requireAuth, requireRole("ADMIN"), admin.listSchedules);
router.patch("/admin/schedules/:id", requireAuth, requireRole("ADMIN"), admin.updateSchedule);
router.get("/admin/requests", requireAuth, requireRole("ADMIN"), admin.listRequests);
router.get("/admin/hospitals", requireAuth, requireRole("ADMIN"), admin.listHospitals);
router.patch("/admin/hospitals/:id/verify", requireAuth, requireRole("ADMIN"), admin.verifyHospital);
router.get("/admin/stocks/quarantine", requireAuth, requireRole("ADMIN"), admin.listQuarantineStocks);

export default router;
