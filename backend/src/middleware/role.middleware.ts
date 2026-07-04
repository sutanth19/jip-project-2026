import type { Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import type { AuthenticatedRequest } from "./auth.middleware.js";

export function authorize(...roles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden.",
      });
    }

    next();
  };
}