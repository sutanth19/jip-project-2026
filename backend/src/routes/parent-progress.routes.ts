import { UserRole } from "@prisma/client";
import { Router } from "express";
import { parentProgressController, parentSkillProgressController } from "../controllers/pbd.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
const router = Router(); router.use(authenticate, requirePasswordChanged, requireRole(UserRole.PARENT)); router.get("/children/:studentId/progress", parentProgressController); router.get("/children/:studentId/progress/skills/:remedialSkillId", parentSkillProgressController); export default router;
