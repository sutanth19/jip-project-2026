import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createStudent, getStudentById, getStudentParents, linkStudentParent, listStudents,
  resetStudentPin, transferStudentClass, unlinkStudentParent, updateStudent, updateStudentStatus,
  type StudentAuditContext,
} from "../services/student.service.js";
import {
  createStudentSchema, linkStudentParentSchema, listStudentsQuerySchema, studentParentParamsSchema,
  studentProfileIdParamsSchema, transferStudentClassSchema, updateStudentSchema, updateStudentStatusSchema,
} from "../validators/student.validator.js";

function auditContext(req: AuthenticatedRequest): StudentAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip || null, userAgent: req.get("user-agent") || null };
}

export async function createStudentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 201, "Murid berjaya didaftarkan.", await createStudent(createStudentSchema.parse(req.body), auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function getStudentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 200, "Senarai murid berjaya diperoleh.", await listStudents(listStudentsQuerySchema.parse(req.query), auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function getStudentByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId } = studentProfileIdParamsSchema.parse(req.params); successResponse(res, 200, "Maklumat murid berjaya diperoleh.", await getStudentById(studentProfileId, auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function updateStudentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId } = studentProfileIdParamsSchema.parse(req.params); successResponse(res, 200, "Maklumat murid berjaya dikemas kini.", { student: await updateStudent(studentProfileId, updateStudentSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function updateStudentStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId } = studentProfileIdParamsSchema.parse(req.params); const { status } = updateStudentStatusSchema.parse(req.body); successResponse(res, 200, "Status murid berjaya dikemas kini.", { student: await updateStudentStatus(studentProfileId, status, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function resetStudentPinController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId } = studentProfileIdParamsSchema.parse(req.params); successResponse(res, 200, "PIN murid berjaya ditetapkan semula.", await resetStudentPin(studentProfileId, auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function transferStudentClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId } = studentProfileIdParamsSchema.parse(req.params); const { classId } = transferStudentClassSchema.parse(req.body); successResponse(res, 200, "Kelas murid berjaya ditukar.", { student: await transferStudentClass(studentProfileId, classId, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function getStudentParentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId } = studentProfileIdParamsSchema.parse(req.params); successResponse(res, 200, "Senarai ibu bapa murid berjaya diperoleh.", await getStudentParents(studentProfileId, auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function linkStudentParentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId, parentId } = studentParentParamsSchema.parse(req.params); const { relationship } = linkStudentParentSchema.parse(req.body); successResponse(res, 201, "Ibu bapa berjaya dipautkan kepada murid.", { link: await linkStudentParent(studentProfileId, parentId, relationship, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function unlinkStudentParentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { studentProfileId, parentId } = studentParentParamsSchema.parse(req.params); await unlinkStudentParent(studentProfileId, parentId, auditContext(req as AuthenticatedRequest)); successResponse(res, 200, "Hubungan ibu bapa dan murid berjaya dialih keluar.", null); } catch (caught) { next(caught); }
}
