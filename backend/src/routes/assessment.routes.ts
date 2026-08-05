import { UserRole } from "@prisma/client";
import { Router } from "express";
import * as controller from "../controllers/assessment.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER));
router.get("/", controller.listAssessmentsController);
router.get("/:assessmentId", controller.getAssessmentController);
router.post("/:assessmentId/recalculate", controller.recalculateAssessmentController);
router.post("/:assessmentId/items/:activityItemId/manual-score", controller.scoreManualItemController);
router.post("/:assessmentId/adjustments", controller.createAdjustmentController);
router.post("/:assessmentId/invalidate", controller.invalidateAssessmentController);
router.post("/:assessmentId/archive", controller.archiveAssessmentController);

export default router;
