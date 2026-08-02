import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAdminDashboard, getParentDashboard, getStudentDashboard, getSuperAdminDashboard, getTeacherDashboard } from "../services/dashboard.service.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { dashboardQuerySchema } from "../validators/dashboard.validator.js";

function context(req: AuthenticatedRequest) {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return req.auth;
}
async function auditDashboard(req: AuthenticatedRequest, name: string) { const actor = context(req); await recordAuditEvent({ actorUserId: actor.userId, actorProfileId: actor.profileId, actorRole: actor.role, actorName: null, action: "DASHBOARD_VIEWED", resourceType: "DASHBOARD", resourceId: name, schoolId: actor.schoolId, before: null, after: null, metadata: { dashboard: name }, timestamp: new Date(), requestIp: req.ip ?? null, userAgent: req.get("user-agent") ?? null }, { strict: false }); }
export async function superAdminDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = await getSuperAdminDashboard(context(req as AuthenticatedRequest), dashboardQuerySchema.parse(req.query)); await auditDashboard(req as AuthenticatedRequest, "SUPER_ADMIN"); successResponse(res, 200, "Dashboard Super Admin berjaya diperoleh.", data); } catch (caught) { next(caught); } }
export async function adminDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = await getAdminDashboard(context(req as AuthenticatedRequest), dashboardQuerySchema.parse(req.query)); await auditDashboard(req as AuthenticatedRequest, "ADMIN"); successResponse(res, 200, "Dashboard pentadbir berjaya diperoleh.", data); } catch (caught) { next(caught); } }
export async function teacherDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = await getTeacherDashboard(context(req as AuthenticatedRequest), dashboardQuerySchema.parse(req.query)); await auditDashboard(req as AuthenticatedRequest, "TEACHER"); successResponse(res, 200, "Dashboard guru berjaya diperoleh.", data); } catch (caught) { next(caught); } }
export async function studentDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = await getStudentDashboard(context(req as AuthenticatedRequest)); await auditDashboard(req as AuthenticatedRequest, "STUDENT"); successResponse(res, 200, "Dashboard murid berjaya diperoleh.", data); } catch (caught) { next(caught); } }
export async function parentDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { const data = await getParentDashboard(context(req as AuthenticatedRequest)); await auditDashboard(req as AuthenticatedRequest, "PARENT"); successResponse(res, 200, "Dashboard ibu bapa berjaya diperoleh.", data); } catch (caught) { next(caught); } }
