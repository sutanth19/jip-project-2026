import { UserRole } from "@prisma/client";
import { Router } from "express";
import { getStudentFeedbackController, getStudentSubmissionController, listStudentSubmissionsController, reviseSubmissionController } from "../controllers/submission.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requireStudentPinChanged, requirePasswordChanged, requireRole(UserRole.STUDENT));
router.get("/", listStudentSubmissionsController);
router.get("/:submissionId", getStudentSubmissionController);
router.get("/:submissionId/feedback", getStudentFeedbackController);
router.post("/:submissionId/revise", reviseSubmissionController);
export default router;
