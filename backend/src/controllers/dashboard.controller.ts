import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAdminDashboard, getParentDashboard, getStudentDashboard, getSuperAdminDashboard, getTeacherDashboard } from "../services/dashboard.service.js";
import { dashboardQuerySchema } from "../validators/dashboard.validator.js";

function context(req: AuthenticatedRequest) {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return req.auth;
}
export async function superAdminDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { successResponse(res, 200, "Dashboard Super Admin berjaya diperoleh.", await getSuperAdminDashboard(context(req as AuthenticatedRequest), dashboardQuerySchema.parse(req.query))); } catch (caught) { next(caught); } }
export async function adminDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { successResponse(res, 200, "Dashboard pentadbir berjaya diperoleh.", await getAdminDashboard(context(req as AuthenticatedRequest), dashboardQuerySchema.parse(req.query))); } catch (caught) { next(caught); } }
export async function teacherDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { successResponse(res, 200, "Dashboard guru berjaya diperoleh.", await getTeacherDashboard(context(req as AuthenticatedRequest), dashboardQuerySchema.parse(req.query))); } catch (caught) { next(caught); } }
export async function studentDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { successResponse(res, 200, "Dashboard murid berjaya diperoleh.", await getStudentDashboard(context(req as AuthenticatedRequest))); } catch (caught) { next(caught); } }
export async function parentDashboardController(req: Request, res: Response, next: NextFunction): Promise<void> { try { successResponse(res, 200, "Dashboard ibu bapa berjaya diperoleh.", await getParentDashboard(context(req as AuthenticatedRequest))); } catch (caught) { next(caught); } }
