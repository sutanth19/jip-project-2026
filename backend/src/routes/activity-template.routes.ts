import { UserRole } from "@prisma/client";
import { Router } from "express";

import {
  archiveActivityTemplateController,
  createActivityTemplateController,
  getActivityTemplateController,
  listActivityTemplatesController,
  updateActivityTemplateController,
  updateActivityTemplateStatusController,
} from "../controllers/activity-template.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const read = requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER);
const registryManagement = requireRole(UserRole.SUPER_ADMIN);

router.use(authenticate, requirePasswordChanged);

router.get("/", read, listActivityTemplatesController);
router.get("/:templateId", read, getActivityTemplateController);
router.post("/", registryManagement, createActivityTemplateController);
router.patch("/:templateId", registryManagement, updateActivityTemplateController);
router.post("/:templateId/archive", registryManagement, archiveActivityTemplateController);
router.patch("/:templateId/status", registryManagement, updateActivityTemplateStatusController);

export default router;
