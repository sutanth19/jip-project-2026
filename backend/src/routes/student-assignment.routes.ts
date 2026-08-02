import { UserRole } from "@prisma/client";
import { Router } from "express";
import { getStudentAssignmentController, getStudentAssignmentDeliveryController, listStudentAssignmentsController } from "../controllers/assignment.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requireStudentPinChanged, requirePasswordChanged);
router.get("/assignments", requireRole(UserRole.STUDENT), listStudentAssignmentsController);
router.get("/assignments/:assignmentId", requireRole(UserRole.STUDENT), getStudentAssignmentController);
router.get("/assignments/:assignmentId/delivery", requireRole(UserRole.STUDENT), getStudentAssignmentDeliveryController);
export default router;
