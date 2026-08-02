import { UserRole } from "@prisma/client";
import { Router } from "express";
import * as controller from "../controllers/assignment.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const manage = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);
router.use(authenticate);
router.get("/", requirePasswordChanged, manage, controller.listAssignmentsController);
router.post("/", requirePasswordChanged, manage, controller.createAssignmentController);
router.get("/:assignmentId", requirePasswordChanged, manage, controller.getAssignmentController);
router.patch("/:assignmentId", requirePasswordChanged, manage, controller.updateAssignmentController);
export default router;
