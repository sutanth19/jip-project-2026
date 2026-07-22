import { Router } from "express";

import {
  loginController,
  meController,
  setupPasswordController,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", loginController);
router.post("/setup-password", setupPasswordController);

router.get("/me", authenticate, meController);

export default router;