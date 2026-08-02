import { UserRole } from "@prisma/client";
import { Router } from "express";
import { listParentSubmissionsController } from "../controllers/submission.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
router.use(authenticate, requirePasswordChanged, requireRole(UserRole.PARENT));
router.get("/children/:studentId/submissions", listParentSubmissionsController);
export default router;
