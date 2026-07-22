import { Router } from "express";

import {
  createParentController,
  getParentsController,
  getParentByIdController,
  updateParentController,
  updateParentStatusController,
  resendParentSetupLinkController,
} from "../controllers/parent.controller.js";

import {
  getStudentsByParentController,
} from "../controllers/parentStudent.controller.js";

const router = Router();

router.post("/", createParentController);

router.get("/", getParentsController);

// Get all children for a parent
router.get(
  "/:id/students",
  getStudentsByParentController
);

router.get("/:id", getParentByIdController);

router.put("/:id", updateParentController);

router.patch(
  "/:id/status",
  updateParentStatusController
);

router.post(
  "/:id/resend-setup-link",
  resendParentSetupLinkController
);

export default router;