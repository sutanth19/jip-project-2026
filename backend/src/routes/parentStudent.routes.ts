import { Router } from "express";

import {
  createParentStudentController,
  updateParentStudentController,
  deleteParentStudentController,
} from "../controllers/parentStudent.controller.js";

const router = Router();

router.post("/", createParentStudentController);

router.put("/:id", updateParentStudentController);

router.delete("/:id", deleteParentStudentController);

export default router;