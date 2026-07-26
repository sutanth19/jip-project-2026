import { Router } from "express";
import { UserRole } from "@prisma/client";

import {
  createParentStudentController,
  updateParentStudentController,
  deleteParentStudentController,
} from "../controllers/parentStudent.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

// Legacy relationship endpoints remain available, but cannot bypass Parent Management RBAC.
router.use(authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.post("/", createParentStudentController);

router.put("/:id", updateParentStudentController);

router.delete("/:id", deleteParentStudentController);

export default router;
