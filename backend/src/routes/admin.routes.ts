import { UserRole } from "@prisma/client";
import rateLimit from "express-rate-limit";
import { Router } from "express";

import {
  createAdminController,
  getAdminByIdController,
  listAdminsController,
  resendAdminSetupController,
  updateAdminController,
  updateAdminStatusController,
} from "../controllers/admin.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

const resendSetupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN));

router.post("/", createAdminController);
router.get("/", listAdminsController);
router.get("/:adminId", getAdminByIdController);
router.patch("/:adminId", updateAdminController);
router.patch("/:adminId/status", updateAdminStatusController);
router.post("/:adminId/resend-setup", resendSetupRateLimiter, resendAdminSetupController);

export default router;
