import { UserRole } from "@prisma/client";
import { Router } from "express";
import * as controller from "../controllers/submission.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER));
router.get("/", controller.listSubmissionsController);
router.get("/:submissionId", controller.getSubmissionController);
router.post("/:submissionId/start-review", controller.startReviewController);
router.patch("/:submissionId/items/:activityItemId/review", controller.updateItemReviewController);
router.post("/:submissionId/complete-review", controller.completeReviewController);
router.post("/:submissionId/cancel", controller.cancelSubmissionController);
router.post("/:submissionId/archive", controller.archiveSubmissionController);
export default router;
