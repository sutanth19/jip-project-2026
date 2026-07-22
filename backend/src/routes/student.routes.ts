import { Router } from "express";

import {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  updateStudentStatusController,
  resetStudentPinController,
} from "../controllers/student.controller.js";

import {
  getParentsByStudentController,
} from "../controllers/parentStudent.controller.js";

const router = Router();
router.get("/", getStudentsController);

router.get(
  "/:id/parents",
  getParentsByStudentController
);

router.get("/:id", getStudentByIdController);

router.post("/", createStudentController);

router.post(
  "/:id/reset-pin",
  resetStudentPinController
);

router.put("/:id", updateStudentController);

router.patch(
  "/:id/status",
  updateStudentStatusController
);

export default router;