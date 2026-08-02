import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Router } from "express";

import { deleteMediaController, getMediaFileController, uploadMediaController } from "../controllers/media.controller.js";
import { authenticate, requirePasswordChanged, requireStudentPinChanged, type AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { singleMediaUpload } from "../middleware/upload.middleware.js";

const router = Router();

function actorAndIp(req: AuthenticatedRequest): string {
  return `${req.auth?.userId ?? "unauthenticated"}:${ipKeyGenerator(req.ip ?? "")}`;
}

const uploadRateLimiter = rateLimit({ windowMs: 15 * 60 * 1_000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => actorAndIp(req as AuthenticatedRequest) });
const deleteRateLimiter = rateLimit({ windowMs: 15 * 60 * 1_000, limit: 20, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => actorAndIp(req as AuthenticatedRequest) });

router.get("/files/*key", getMediaFileController);
router.use(authenticate, requirePasswordChanged, requireStudentPinChanged);
router.post("/upload", uploadRateLimiter, singleMediaUpload, uploadMediaController);
router.delete("/files", deleteRateLimiter, deleteMediaController);

export default router;
