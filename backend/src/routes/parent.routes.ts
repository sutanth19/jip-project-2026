import { UserRole } from "@prisma/client";
import rateLimit from "express-rate-limit";
import { Router } from "express";

import {
  createParentController, getParentByIdController, getParentStudentsController, linkParentStudentController,
  listParentsController, resendParentSetupController, unlinkParentStudentController, updateParentController,
  updateParentStatusController,
} from "../controllers/parent.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const resendSetupRateLimiter = rateLimit({ windowMs: 15 * 60 * 1_000, limit: 5, standardHeaders: true, legacyHeaders: false });

router.use(authenticate, requirePasswordChanged);

router.get("/", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), listParentsController);
router.get("/:parentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), getParentByIdController);
router.get("/:parentId/students", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), getParentStudentsController);

router.post("/", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), createParentController);
router.patch("/:parentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), updateParentController);
router.patch("/:parentId/status", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), updateParentStatusController);
router.post("/:parentId/resend-setup", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), resendSetupRateLimiter, resendParentSetupController);
router.post("/:parentId/students/:studentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), linkParentStudentController);
router.delete("/:parentId/students/:studentId", requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER), unlinkParentStudentController);

export default router;
