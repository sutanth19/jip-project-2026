import type { Request, Response, NextFunction } from "express";
import { performance } from "node:perf_hooks";
import { AppError } from "../errors/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { TeacherPermission, UserRole } from "@prisma/client";
import { markRequestPerformance } from "../utils/request-performance.js";

export interface AuthenticatedSession {
  userId: string;
  role: UserRole;
  profileId: string;
  schoolId: string | null;
  isFirstLogin: boolean;
  requiresPinChange?: boolean;
}

export interface PermissionGrantContext {
  id: string;
  permission: TeacherPermission;
  teacherId: string;
  grantedById: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedSession;
  auth?: AuthenticatedSession;
  permissionGrant?: PermissionGrantContext;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const startedAt = performance.now();
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Access token is required.",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyAccessToken(token);

    const auth = {
      userId: decoded.sub,
      role: decoded.role,
      profileId: decoded.profileId,
      schoolId: decoded.schoolId,
      isFirstLogin: decoded.isFirstLogin,
      requiresPinChange: decoded.requiresPinChange,
    };

    req.user = auth;
    req.auth = auth;
    markRequestPerformance(req, "authMs", performance.now() - startedAt);

    next();
  } catch {
    markRequestPerformance(req, "authMs", performance.now() - startedAt);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
}

export function requirePasswordChanged(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const startedAt = performance.now();
  const auth = req.auth ?? req.user;

  if (!auth) {
    markRequestPerformance(req, "passwordGateMs", performance.now() - startedAt);
    next(
      new AppError(
        "AUTH_INVALID_TOKEN",
        401,
        "Invalid or expired token.",
      )
    );
    return;
  }

  if (auth.isFirstLogin) {
    markRequestPerformance(req, "passwordGateMs", performance.now() - startedAt);
    next(
      new AppError(
        "AUTH_PASSWORD_CHANGE_REQUIRED",
        403,
        "Anda mesti menukar kata laluan sebelum meneruskan.",
      )
    );
    return;
  }

  markRequestPerformance(req, "passwordGateMs", performance.now() - startedAt);
  next();
}

export function requireStudentPinChanged(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const auth = req.auth ?? req.user;

  if (!auth) {
    next(
      new AppError(
        "AUTH_INVALID_TOKEN",
        401,
        "Invalid or expired token.",
      )
    );
    return;
  }

  if (auth.role === UserRole.STUDENT && auth.requiresPinChange === true) {
    next(
      new AppError(
        "AUTH_PIN_CHANGE_REQUIRED",
        403,
        "Anda mesti menukar PIN sebelum meneruskan.",
      )
    );
    return;
  }

  next();
}
