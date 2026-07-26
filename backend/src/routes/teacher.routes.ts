import { TeacherPermission, UserRole } from "@prisma/client";
import rateLimit from "express-rate-limit";
import { Router } from "express";

import {
  createTeacherController,
  createTeacherGrantController,
  getTeacherByIdController,
  listTeacherGrantsController,
  listTeachersController,
  resendTeacherSetupController,
  revokeTeacherGrantController,
  updateTeacherController,
  updateTeacherStatusController,
} from "../controllers/teacher.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole, requireRoleOrTeacherPermission } from "../middleware/role.middleware.js";

const router = Router();

const resendSetupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/",
  authenticate,
  requirePasswordChanged,
  requireRoleOrTeacherPermission(
    [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    TeacherPermission.CREATE_TEACHER,
  ),
  createTeacherController,
);

router.use(
  authenticate,
  requirePasswordChanged,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
);

router.get("/", listTeachersController);
router.get("/:teacherId", getTeacherByIdController);
router.patch("/:teacherId", updateTeacherController);
router.patch("/:teacherId/status", updateTeacherStatusController);
router.post("/:teacherId/resend-setup", resendSetupRateLimiter, resendTeacherSetupController);
router.post("/:teacherId/grants", createTeacherGrantController);
router.get("/:teacherId/grants", listTeacherGrantsController);
router.delete("/:teacherId/grants/:grantId", revokeTeacherGrantController);

export default router;
