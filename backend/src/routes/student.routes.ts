import { UserRole } from "@prisma/client";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Router } from "express";

import {
  createStudentController, getStudentByIdController, getStudentParentsController, getStudentsController,
  linkStudentParentController, resetStudentPinController, transferStudentClassController,
  unlinkStudentParentController, updateStudentController, updateStudentStatusController,
} from "../controllers/student.controller.js";
import { authenticate, requirePasswordChanged, type AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { requireRole, requireTeacherStudentAccess } from "../middleware/role.middleware.js";

const router = Router();
const resetPinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authenticated = req as AuthenticatedRequest;
    return `${authenticated.auth?.userId ?? "unauthenticated"}:${ipKeyGenerator(req.ip ?? "")}`;
  },
});
const managementRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
const readRoles = [...managementRoles, UserRole.TEACHER];
const teacherStudentAccess = requireTeacherStudentAccess({ key: "studentProfileId", bypassRoles: managementRoles });

router.use(authenticate, requirePasswordChanged);

router.post("/", requireRole(...managementRoles), createStudentController);
router.get("/", requireRole(...readRoles), getStudentsController);

router.get("/:studentProfileId/parents", requireRole(...readRoles), teacherStudentAccess, getStudentParentsController);
router.post("/:studentProfileId/parents/:parentId", requireRole(...managementRoles), linkStudentParentController);
router.delete("/:studentProfileId/parents/:parentId", requireRole(...managementRoles), unlinkStudentParentController);
router.post("/:studentProfileId/reset-pin", requireRole(...readRoles), teacherStudentAccess, resetPinRateLimiter, resetStudentPinController);
router.patch("/:studentProfileId/class", requireRole(...managementRoles), transferStudentClassController);
router.patch("/:studentProfileId/status", requireRole(...managementRoles), updateStudentStatusController);
router.get("/:studentProfileId", requireRole(...readRoles), teacherStudentAccess, getStudentByIdController);
router.patch("/:studentProfileId", requireRole(...readRoles), teacherStudentAccess, updateStudentController);

export default router;
