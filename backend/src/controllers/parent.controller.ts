import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createParent, getParentById, getParentStudents, linkParentStudent, listParents, resendParentSetup,
  unlinkParentStudent, updateParent, updateParentStatus, type ParentAuditContext,
} from "../services/parent.service.js";
import {
  createParentSchema, linkParentStudentSchema, listParentsQuerySchema, parentIdParamsSchema,
  parentStudentParamsSchema, updateParentSchema, updateParentStatusSchema,
} from "../validators/parent.validator.js";

function auditContext(req: AuthenticatedRequest): ParentAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip || null, userAgent: req.get("user-agent") || null };
}

export async function createParentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 201, "Akaun ibu bapa berjaya dicipta.", await createParent(createParentSchema.parse(req.body), auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function listParentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 200, "Senarai ibu bapa berjaya diperoleh.", await listParents(listParentsQuerySchema.parse(req.query), auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function getParentByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId } = parentIdParamsSchema.parse(req.params); successResponse(res, 200, "Maklumat ibu bapa berjaya diperoleh.", { parent: await getParentById(parentId, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function updateParentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId } = parentIdParamsSchema.parse(req.params); successResponse(res, 200, "Akaun ibu bapa berjaya dikemas kini.", { parent: await updateParent(parentId, updateParentSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function updateParentStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId } = parentIdParamsSchema.parse(req.params); const { status } = updateParentStatusSchema.parse(req.body); successResponse(res, 200, "Status ibu bapa berjaya dikemas kini.", { parent: await updateParentStatus(parentId, status, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function resendParentSetupController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId } = parentIdParamsSchema.parse(req.params); successResponse(res, 200, "Jemputan persediaan ibu bapa berjaya dihantar semula.", await resendParentSetup(parentId, auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function getParentStudentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId } = parentIdParamsSchema.parse(req.params); successResponse(res, 200, "Senarai murid berjaya diperoleh.", { students: await getParentStudents(parentId, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function linkParentStudentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId, studentId } = parentStudentParamsSchema.parse(req.params); successResponse(res, 201, "Ibu bapa berjaya dipautkan kepada murid.", { link: await linkParentStudent(parentId, studentId, linkParentStudentSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function unlinkParentStudentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { parentId, studentId } = parentStudentParamsSchema.parse(req.params); await unlinkParentStudent(parentId, studentId, auditContext(req as AuthenticatedRequest)); successResponse(res, 200, "Hubungan ibu bapa dan murid berjaya dialih keluar.", null); } catch (caught) { next(caught); }
}
