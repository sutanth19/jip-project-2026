import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getAuditLogById, listAuditLogs, type AuditReadContext } from "../services/audit.service.js";
import { auditLogIdParamsSchema, listAuditLogsQuerySchema } from "../validators/audit.validator.js";

function auditContext(req: AuthenticatedRequest): AuditReadContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { role: req.auth.role };
}

function auditQueryError(caught: unknown): never {
  if (caught instanceof ZodError) throw new AppError("AUDIT_QUERY_INVALID", 400, "Pertanyaan audit tidak sah.");
  throw caught;
}

export async function listAuditLogsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let query;
    try { query = listAuditLogsQuerySchema.parse(req.query); } catch (caught) { auditQueryError(caught); }
    successResponse(res, 200, "Senarai rekod audit berjaya diperoleh.", await listAuditLogs(query, auditContext(req as AuthenticatedRequest)));
  } catch (caught) { next(caught); }
}

export async function getAuditLogByIdController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let auditLogId: string;
    try { ({ auditLogId } = auditLogIdParamsSchema.parse(req.params)); } catch (caught) { auditQueryError(caught); }
    successResponse(res, 200, "Rekod audit berjaya diperoleh.", { auditLog: await getAuditLogById(auditLogId, auditContext(req as AuthenticatedRequest)) });
  } catch (caught) { next(caught); }
}
