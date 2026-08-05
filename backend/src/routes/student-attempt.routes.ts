import { UserRole } from "@prisma/client";
import { Router } from "express";
import { saveAttemptController, submitAttemptController } from "../controllers/attempt.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requireStudentPinChanged, requirePasswordChanged, requireRole(UserRole.STUDENT));
router.post("/:attemptId/save", saveAttemptController);
router.post("/:attemptId/submit", submitAttemptController);
export default router;
