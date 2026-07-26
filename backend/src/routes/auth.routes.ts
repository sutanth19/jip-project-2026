import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  changeFirstPinController,
  changeFirstPasswordController,
  loginController,
  meController,
  setupPasswordController,
  studentLoginController,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const changeFirstPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const studentLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const changeFirstPinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginRateLimiter, loginController);
router.post("/student/login", studentLoginRateLimiter, studentLoginController);
router.post("/setup-password", setupPasswordController);
router.post(
  "/change-first-password",
  changeFirstPasswordRateLimiter,
  authenticate,
  changeFirstPasswordController
);
router.post(
  "/student/change-first-pin",
  changeFirstPinRateLimiter,
  authenticate,
  changeFirstPinController
);

router.get("/me", authenticate, meController);

export default router;
