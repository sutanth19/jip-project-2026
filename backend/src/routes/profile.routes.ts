import { UserRole } from "@prisma/client";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Router } from "express";

import { changeMyPasswordController, changeMyPinController, getMyAccountController, getMyProfileController, updateMyAvatarController, updateMyProfileController } from "../controllers/profile.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged, type AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const rateKey = (req: AuthenticatedRequest) => `${req.auth?.userId ?? "unauthenticated"}:${ipKeyGenerator(req.ip ?? "")}`;
const passwordRateLimiter = rateLimit({ windowMs: 15 * 60 * 1_000, limit: 5, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => rateKey(req as AuthenticatedRequest) });
const pinRateLimiter = rateLimit({ windowMs: 15 * 60 * 1_000, limit: 5, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => rateKey(req as AuthenticatedRequest) });
const avatarRateLimiter = rateLimit({ windowMs: 15 * 60 * 1_000, limit: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => rateKey(req as AuthenticatedRequest) });

router.use(authenticate);
router.get("/me", getMyProfileController);
router.get("/account", getMyAccountController);
router.patch("/me", requirePasswordChanged, requireStudentPinChanged, updateMyProfileController);
router.patch("/me/avatar", requirePasswordChanged, requireStudentPinChanged, avatarRateLimiter, updateMyAvatarController);
router.post("/change-password", requirePasswordChanged, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.PARENT), passwordRateLimiter, changeMyPasswordController);
router.post("/change-pin", requireStudentPinChanged, requireRole(UserRole.STUDENT), pinRateLimiter, changeMyPinController);

export default router;
