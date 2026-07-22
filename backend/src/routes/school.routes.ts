import { Router } from "express";
import { createSchoolController } from "../controllers/school.controller.js";

const router = Router();

router.post("/", createSchoolController);

export default router;