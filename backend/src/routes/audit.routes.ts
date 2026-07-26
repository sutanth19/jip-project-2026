import { UserRole } from "@prisma/client";
import { Router } from "express";

import { getAuditLogByIdController, listAuditLogsController } from "../controllers/audit.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.use(authenticate, requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN));
router.get("/", listAuditLogsController);
router.get("/:auditLogId", getAuditLogByIdController);

export default router;
