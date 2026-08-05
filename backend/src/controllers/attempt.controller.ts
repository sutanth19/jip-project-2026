import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import * as service from "../services/attempt.service.js";
import { attemptIdParamsSchema, saveAttemptSchema } from "../validators/attempt.validator.js";

function context(req: AuthenticatedRequest): service.AttemptContext { if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token."); return { actor: req.auth, requestIp: req.ip ?? null, userAgent: req.get("user-agent") ?? null }; }
function respond(res: Response, next: NextFunction, status: number, message: string, op: () => Promise<unknown>): Promise<void> { return op().then((data) => { successResponse(res, status, message, data); }).catch(next); }
export const openAttemptController = (req: Request, res: Response, next: NextFunction) => respond(res, next, 200, "Percubaan berjaya dibuka.", async () => service.openOrResumeAttempt(attemptIdParamsSchema.parse(req.params).attemptId, context(req as AuthenticatedRequest)));
export const saveAttemptController = (req: Request, res: Response, next: NextFunction) => respond(res, next, 200, "Percubaan berjaya disimpan.", async () => service.saveAttempt(attemptIdParamsSchema.parse(req.params).attemptId, saveAttemptSchema.parse(req.body), context(req as AuthenticatedRequest)));
export const submitAttemptController = (req: Request, res: Response, next: NextFunction) => respond(res, next, 200, "Percubaan berjaya dihantar.", async () => service.submitAttempt(attemptIdParamsSchema.parse(req.params).attemptId, context(req as AuthenticatedRequest)));
