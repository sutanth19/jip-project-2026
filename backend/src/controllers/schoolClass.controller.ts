import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  assignSchoolClassTeacher, assignStudentToSchoolClass, createSchoolClass, getSchoolClassById,
  createTeacherSchoolClass, getSchoolClasses, getSchoolClassStudents, removeStudentFromSchoolClass, updateSchoolClass,
  updateSchoolClassStatus, type SchoolClassAuditContext,
} from "../services/schoolClass.service.js";
import {
  assignSchoolClassTeacherSchema, classIdParamsSchema, classStudentParamsSchema, createSchoolClassSchema,
  createTeacherSchoolClassSchema,
  listClassStudentsQuerySchema, listSchoolClassesQuerySchema, updateSchoolClassSchema, updateSchoolClassStatusSchema,
} from "../validators/schoolClass.validator.js";
import { UserRole } from "@prisma/client";

function auditContext(req: AuthenticatedRequest): SchoolClassAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip || null, userAgent: req.get("user-agent") || null };
}

export async function createSchoolClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const context = auditContext(req as AuthenticatedRequest);
    const created = context.actor.role === UserRole.TEACHER
      ? await createTeacherSchoolClass(createTeacherSchoolClassSchema.parse(req.body), context)
      : await createSchoolClass(createSchoolClassSchema.parse(req.body), context);
    successResponse(res, 201, "Kelas berjaya diwujudkan.", { class: created });
  } catch (caught) { next(caught); }
}
export async function getSchoolClassesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 200, "Senarai kelas berjaya diperoleh.", await getSchoolClasses(listSchoolClassesQuerySchema.parse(req.query), auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function getSchoolClassByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId } = classIdParamsSchema.parse(req.params); successResponse(res, 200, "Maklumat kelas berjaya diperoleh.", await getSchoolClassById(classId, auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function updateSchoolClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId } = classIdParamsSchema.parse(req.params); successResponse(res, 200, "Maklumat kelas berjaya dikemas kini.", { class: await updateSchoolClass(classId, updateSchoolClassSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function updateSchoolClassStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId } = classIdParamsSchema.parse(req.params); const { status } = updateSchoolClassStatusSchema.parse(req.body); successResponse(res, 200, "Status kelas berjaya dikemas kini.", { class: await updateSchoolClassStatus(classId, status, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function assignSchoolClassTeacherController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId } = classIdParamsSchema.parse(req.params); const { teacherId } = assignSchoolClassTeacherSchema.parse(req.body); successResponse(res, 200, "Guru kelas berjaya dikemas kini.", { class: await assignSchoolClassTeacher(classId, teacherId, auditContext(req as AuthenticatedRequest)) }); } catch (caught) { next(caught); }
}
export async function getSchoolClassStudentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId } = classIdParamsSchema.parse(req.params); successResponse(res, 200, "Senarai murid kelas berjaya diperoleh.", await getSchoolClassStudents(classId, listClassStudentsQuerySchema.parse(req.query), auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function assignStudentToSchoolClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId, studentId } = classStudentParamsSchema.parse(req.params); successResponse(res, 200, "Murid berjaya ditempatkan ke dalam kelas.", await assignStudentToSchoolClass(classId, studentId, auditContext(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
export async function removeStudentFromSchoolClassController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { const { classId, studentId } = classStudentParamsSchema.parse(req.params); await removeStudentFromSchoolClass(classId, studentId, auditContext(req as AuthenticatedRequest)); } catch (caught) { next(caught); }
}
