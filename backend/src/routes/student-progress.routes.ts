import { UserRole } from "@prisma/client";
import { Router } from "express";
import { studentProgressController, studentSkillProgressController } from "../controllers/pbd.controller.js";
import { authenticate, requirePasswordChanged } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
const router = Router(); router.use(authenticate, requirePasswordChanged, requireRole(UserRole.STUDENT)); router.get("/progress", studentProgressController); router.get("/progress/skills/:remedialSkillId", studentSkillProgressController); export default router;
