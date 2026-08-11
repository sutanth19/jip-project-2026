import type { NextFunction, Request, Response } from "express";
import { performance } from "node:perf_hooks";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createSchool,
  getSchoolById,
  listSchools,
  updateSchool,
  updateSchoolStatus,
  type SchoolAuditContext,
} from "../services/school.service.js";
import {
  createSchoolSchema,
  listSchoolsQuerySchema,
  schoolIdParamsSchema,
  updateSchoolSchema,
  updateSchoolStatusSchema,
} from "../validators/school.validator.js";
import {
  logRequestPerformance,
  markRequestPerformance,
} from "../utils/request-performance.js";

function getAuditContext(req: AuthenticatedRequest): SchoolAuditContext {
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

export async function createSchoolController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = createSchoolSchema.parse(req.body);
    const school = await createSchool(
      data,
      getAuditContext(req as AuthenticatedRequest),
    );

    successResponse(res, 201, "Sekolah berjaya didaftarkan.", { school });
  } catch (error) {
    next(error);
  }
}

export async function listSchoolsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const startedAt = performance.now();
  try {
    const query = listSchoolsQuerySchema.parse(req.query);
    const result = await listSchools(query, { request: req });
    markRequestPerformance(req, "controllerMs", performance.now() - startedAt);
    logRequestPerformance(req, {
      payloadBytes: Buffer.byteLength(JSON.stringify(result)),
      itemCount: result.schools.length,
    });

    successResponse(res, 200, "Senarai sekolah berjaya diperoleh.", result);
  } catch (error) {
    markRequestPerformance(req, "controllerMs", performance.now() - startedAt);
    next(error);
  }
}

export async function getSchoolByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { schoolId } = schoolIdParamsSchema.parse(req.params);
    const school = await getSchoolById(schoolId);

    successResponse(res, 200, "Maklumat sekolah berjaya diperoleh.", { school });
  } catch (error) {
    next(error);
  }
}

export async function updateSchoolController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { schoolId } = schoolIdParamsSchema.parse(req.params);
    const data = updateSchoolSchema.parse(req.body);
    const school = await updateSchool(
      schoolId,
      data,
      getAuditContext(req as AuthenticatedRequest),
    );

    successResponse(res, 200, "Sekolah berjaya dikemas kini.", { school });
  } catch (error) {
    next(error);
  }
}

export async function updateSchoolStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { schoolId } = schoolIdParamsSchema.parse(req.params);
    const { status } = updateSchoolStatusSchema.parse(req.body);
    const school = await updateSchoolStatus(
      schoolId,
      status,
      getAuditContext(req as AuthenticatedRequest),
    );

    successResponse(res, 200, "Status sekolah berjaya dikemas kini.", { school });
  } catch (error) {
    next(error);
  }
}
