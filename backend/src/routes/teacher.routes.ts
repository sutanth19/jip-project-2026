import { Router } from "express";

import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  updateTeacherStatusController,
  resendTeacherSetupLinkController,
} from "../controllers/teacher.controller.js";

const router = Router();

router.post("/", createTeacherController);
router.get("/", getTeachersController);
router.get("/:id", getTeacherByIdController);
router.put("/:id", updateTeacherController);
router.patch("/:id/status", updateTeacherStatusController);
router.post("/:id/resend-setup-link", resendTeacherSetupLinkController);

export default router;