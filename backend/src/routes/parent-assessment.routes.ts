import { UserRole } from "@prisma/client";
import { Router } from "express";
import { listParentAssessmentsController } from "../controllers/assessment.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requirePasswordChanged, requireRole(UserRole.PARENT));
router.get("/children/:studentId/assessments", listParentAssessmentsController);

export default router;
