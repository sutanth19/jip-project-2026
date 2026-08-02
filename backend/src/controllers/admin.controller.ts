import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createAdmin,
  getAdminById,
  listAdmins,
  resendAdminSetup,
  updateAdmin,
  updateAdminStatus,
  type AdminAuditContext,
} from "../services/admin.service.js";
import {
  adminIdParamsSchema,
  createAdminSchema,
  listAdminsQuerySchema,
  updateAdminSchema,
  updateAdminStatusSchema,
} from "../validators/admin.validator.js";

function getAuditContext(req: AuthenticatedRequest): AdminAuditContext {
  if (!req.auth) {
    throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  }

  return {
    actor: {
      userId: req.auth.userId,
      profileId: req.auth.profileId,
      role: req.auth.role,
    },
    requestIp: req.ip || null,
    userAgent: req.get("user-agent") || null,
  };
}

export async function createAdminController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createAdmin(
      createAdminSchema.parse(req.body),
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Akaun pentadbir berjaya dicipta.", result);
  } catch (error) {
    next(error);
  }
}

export async function listAdminsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listAdmins(listAdminsQuerySchema.parse(req.query));
    successResponse(res, 200, "Senarai pentadbir berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { adminId } = adminIdParamsSchema.parse(req.params);
    const admin = await getAdminById(adminId);
    successResponse(res, 200, "Maklumat pentadbir berjaya diperoleh.", { admin });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { adminId } = adminIdParamsSchema.parse(req.params);
    const admin = await updateAdmin(
      adminId,
      updateAdminSchema.parse(req.body),
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Akaun pentadbir berjaya dikemas kini.", { admin });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { adminId } = adminIdParamsSchema.parse(req.params);
    const { status } = updateAdminStatusSchema.parse(req.body);
    const admin = await updateAdminStatus(
      adminId,
      status,
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Status pentadbir berjaya dikemas kini.", { admin });
  } catch (error) {
    next(error);
  }
}

export async function resendAdminSetupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { adminId } = adminIdParamsSchema.parse(req.params);
    const result = await resendAdminSetup(
      adminId,
      getAuditContext(req as AuthenticatedRequest),
    );
    const message = result.invitation.status === "SENT"
      ? "Jemputan persediaan pentadbir berjaya dihantar semula."
      : "E-mel penyediaan tidak dapat dihantar. Sila cuba lagi.";
    successResponse(res, 200, message, result);
  } catch (error) {
    next(error);
  }
}
