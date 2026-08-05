import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createTeacher,
  createTeacherPermissionGrant,
  getTeacherById,
  listTeacherPermissionGrants,
  listTeachers,
  resendTeacherSetup,
  revokeTeacherPermissionGrant,
  updateTeacher,
  updateTeacherStatus,
  type TeacherAuditContext,
} from "../services/teacher.service.js";
import {
  createTeacherGrantSchema,
  createTeacherSchema,
  listTeachersQuerySchema,
  teacherGrantParamsSchema,
  teacherIdParamsSchema,
  updateTeacherSchema,
  updateTeacherStatusSchema,
} from "../validators/teacher.validator.js";

function getAuditContext(req: AuthenticatedRequest): TeacherAuditContext {
  if (!req.auth) {
    throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  }

  return {
    actor: {
      userId: req.auth.userId,
      profileId: req.auth.profileId,
      role: req.auth.role,
      schoolId: req.auth.schoolId,
    },
    permissionGrant: req.permissionGrant,
    requestIp: req.ip || null,
    userAgent: req.get("user-agent") || null,
  };
}

export async function createTeacherController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await createTeacher(
      createTeacherSchema.parse(req.body),
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Akaun guru berjaya dicipta.", result);
  } catch (error) {
    next(error);
  }
}

export async function listTeachersController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listTeachers(listTeachersQuerySchema.parse(req.query));
    successResponse(res, 200, "Senarai guru berjaya diperoleh.", result);
  } catch (error) {
    next(error);
  }
}

export async function getTeacherByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = teacherIdParamsSchema.parse(req.params);
    const teacher = await getTeacherById(teacherId);
    successResponse(res, 200, "Maklumat guru berjaya diperoleh.", { teacher });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = teacherIdParamsSchema.parse(req.params);
    const teacher = await updateTeacher(
      teacherId,
      updateTeacherSchema.parse(req.body),
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Akaun guru berjaya dikemas kini.", { teacher });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = teacherIdParamsSchema.parse(req.params);
    const { status } = updateTeacherStatusSchema.parse(req.body);
    const teacher = await updateTeacherStatus(
      teacherId,
      status,
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Status guru berjaya dikemas kini.", { teacher });
  } catch (error) {
    next(error);
  }
}

export async function resendTeacherSetupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = teacherIdParamsSchema.parse(req.params);
    const result = await resendTeacherSetup(teacherId, getAuditContext(req as AuthenticatedRequest));
    const message = result.invitation.status === "SENT"
      ? "Jemputan persediaan guru berjaya dihantar semula."
      : "E-mel penyediaan tidak dapat dihantar. Sila cuba lagi.";
    successResponse(res, 200, message, result);
  } catch (error) {
    next(error);
  }
}

export async function createTeacherGrantController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = teacherIdParamsSchema.parse(req.params);
    const grant = await createTeacherPermissionGrant(
      teacherId,
      createTeacherGrantSchema.parse(req.body),
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 201, "Kebenaran guru berjaya diberikan.", { grant });
  } catch (error) {
    next(error);
  }
}

export async function listTeacherGrantsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId } = teacherIdParamsSchema.parse(req.params);
    const grants = await listTeacherPermissionGrants(teacherId);
    successResponse(res, 200, "Senarai kebenaran guru berjaya diperoleh.", { grants });
  } catch (error) {
    next(error);
  }
}

export async function revokeTeacherGrantController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teacherId, grantId } = teacherGrantParamsSchema.parse(req.params);
    const grant = await revokeTeacherPermissionGrant(
      teacherId,
      grantId,
      getAuditContext(req as AuthenticatedRequest),
    );
    successResponse(res, 200, "Kebenaran guru berjaya ditarik balik.", { grant });
  } catch (error) {
    next(error);
  }
}
