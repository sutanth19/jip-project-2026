import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  assignSchoolClassTeacherController, assignStudentToSchoolClassController, createSchoolClassController,
  getSchoolClassByIdController, getSchoolClassesController, getSchoolClassStudentsController,
  removeStudentFromSchoolClassController, updateSchoolClassController, updateSchoolClassStatusController,
} from "../controllers/schoolClass.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const managementRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
const readRoles = [...managementRoles, UserRole.TEACHER];

router.use(authenticate, requirePasswordChanged);

router.post("/", requireRole(...managementRoles), createSchoolClassController);
router.get("/", requireRole(...readRoles), getSchoolClassesController);

router.get("/:classId/students", requireRole(...readRoles), getSchoolClassStudentsController);
router.post("/:classId/students/:studentId", requireRole(...managementRoles), assignStudentToSchoolClassController);
router.delete("/:classId/students/:studentId", requireRole(...managementRoles), removeStudentFromSchoolClassController);
router.patch("/:classId/status", requireRole(...managementRoles), updateSchoolClassStatusController);
router.patch("/:classId/teacher", requireRole(...managementRoles), assignSchoolClassTeacherController);
router.get("/:classId", requireRole(...readRoles), getSchoolClassByIdController);
router.patch("/:classId", requireRole(...managementRoles), updateSchoolClassController);

export default router;
