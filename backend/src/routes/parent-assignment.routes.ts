import { UserRole } from "@prisma/client";
import { Router } from "express";
import { getParentChildrenAssignmentsController } from "../controllers/assignment.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requirePasswordChanged, requireRole(UserRole.PARENT));
router.get("/children/:studentId/assignments", getParentChildrenAssignmentsController);
export default router;
