import { Router } from "express";

import {
  createSchoolClassController,
  getSchoolClassesController,
  getSchoolClassByIdController,
  updateSchoolClassController,
  updateSchoolClassStatusController,
} from "../controllers/schoolClass.controller.js";

const router = Router();

router.get("/", getSchoolClassesController);
router.get("/:id", getSchoolClassByIdController);

router.post("/", createSchoolClassController);

router.put("/:id", updateSchoolClassController);

router.patch(
  "/:id/status",
  updateSchoolClassStatusController
);

export default router;