import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  createSchoolController,
  getSchoolByIdController,
  listSchoolsController,
  updateSchoolController,
  updateSchoolStatusController,
} from "../controllers/school.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(
  authenticate,
  requirePasswordChanged,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
);

router.post("/", createSchoolController);
router.get("/", listSchoolsController);
router.get("/:schoolId", getSchoolByIdController);
router.patch("/:schoolId", updateSchoolController);
router.patch("/:schoolId/status", updateSchoolStatusController);

export default router;
