import { UserRole } from "@prisma/client";
import { Router } from "express";
import { getStudentAssessmentController, listStudentAssessmentsController } from "../controllers/assessment.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requireStudentPinChanged, requirePasswordChanged, requireRole(UserRole.STUDENT));
router.get("/", listStudentAssessmentsController);
router.get("/:assessmentId", getStudentAssessmentController);

export default router;
