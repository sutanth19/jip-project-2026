import { UserRole } from "@prisma/client";
import { Router } from "express";

import { adminDashboardController, parentDashboardController, studentDashboardController, superAdminDashboardController, teacherDashboardController } from "../controllers/dashboard.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.get("/super-admin", authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN), superAdminDashboardController);
router.get("/admin", authenticate, requirePasswordChanged, requireRole(UserRole.ADMIN), adminDashboardController);
router.get("/teacher", authenticate, requirePasswordChanged, requireRole(UserRole.TEACHER), teacherDashboardController);
router.get("/student", authenticate, requireStudentPinChanged, requireRole(UserRole.STUDENT), studentDashboardController);
router.get("/parent", authenticate, requirePasswordChanged, requireRole(UserRole.PARENT), parentDashboardController);
export default router;
