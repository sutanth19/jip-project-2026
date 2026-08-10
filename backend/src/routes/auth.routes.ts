import { Router } from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

import {
  changeFirstPinController,
  changeFirstPasswordController,
  forgotPasswordController,
  loginController,
  meController,
  resetPasswordController,
  setupPasswordController,
  studentLoginController,
} from "../controllers/auth.controller.js";
import { PASSWORD_RESET_GENERIC_MESSAGE } from "../services/auth.service.js";

import { authenticate } from "../middleware/auth.middleware.js";

interface AuthRouteHandlers {
  changeFirstPinController: typeof changeFirstPinController;
  changeFirstPasswordController: typeof changeFirstPasswordController;
  forgotPasswordController: typeof forgotPasswordController;
  loginController: typeof loginController;
  meController: typeof meController;
  resetPasswordController: typeof resetPasswordController;
  setupPasswordController: typeof setupPasswordController;
  studentLoginController: typeof studentLoginController;
}

const defaultHandlers: AuthRouteHandlers = {
  changeFirstPinController,
  changeFirstPasswordController,
  forgotPasswordController,
  loginController,
  meController,
  resetPasswordController,
  setupPasswordController,
  studentLoginController,
};

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

const forgotPasswordRateLimitHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: PASSWORD_RESET_GENERIC_MESSAGE,
  });
};

const forgotPasswordIpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: forgotPasswordRateLimitHandler,
});

const forgotPasswordEmailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const body = req.body;
    if (!body || typeof body !== "object" || !("email" in body) || typeof body.email !== "string") {
      return "email:unknown";
    }

    return `email:${body.email.trim().toLowerCase()}`;
  },
  handler: forgotPasswordRateLimitHandler,
});

const resetPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createAuthRouter(handlers: AuthRouteHandlers = defaultHandlers) {
  const router = Router();

  router.post("/login", loginRateLimiter, handlers.loginController);
  router.post("/student/login", studentLoginRateLimiter, handlers.studentLoginController);
  router.post("/setup-password", handlers.setupPasswordController);
  router.post(
    "/forgot-password",
    forgotPasswordIpRateLimiter,
    forgotPasswordEmailRateLimiter,
    handlers.forgotPasswordController
  );
  router.post("/reset-password", resetPasswordRateLimiter, handlers.resetPasswordController);
  router.post(
    "/change-first-password",
    changeFirstPasswordRateLimiter,
    authenticate,
    handlers.changeFirstPasswordController
  );
  router.post(
    "/student/change-first-pin",
    changeFirstPinRateLimiter,
    authenticate,
    handlers.changeFirstPinController
  );

  router.get("/me", authenticate, handlers.meController);

  return router;
}

export default createAuthRouter();
