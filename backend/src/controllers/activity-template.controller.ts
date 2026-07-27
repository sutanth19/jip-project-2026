import type { NextFunction, Request, Response } from "express";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  archiveActivityTemplate,
  createActivityTemplate,
  getActivityTemplate,
  listActivityTemplates,
  updateActivityTemplate,
  updateActivityTemplateStatus,
  type ActivityTemplateAuditContext,
} from "../services/activity-template.service.js";
import {
  activityTemplateIdParamsSchema,
  createActivityTemplateSchema,
  listActivityTemplatesQuerySchema,
  updateActivityTemplateSchema,
  updateActivityTemplateStatusSchema,
} from "../validators/activity-template.validator.js";

function auditContext(req: AuthenticatedRequest): ActivityTemplateAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip ?? null, userAgent: req.get("user-agent") ?? null };
}

async function respond(res: Response, next: NextFunction, status: number, message: string, operation: () => Promise<unknown>): Promise<void> {
  try {
    successResponse(res, status, message, await operation());
  } catch (error) {
    next(error);
  }
}

export function createActivityTemplateController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 201, "Templat aktiviti berjaya diwujudkan.", async () => ({ template: await createActivityTemplate(createActivityTemplateSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) }));
}

export function listActivityTemplatesController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Senarai templat aktiviti berjaya diperoleh.", () => listActivityTemplates(listActivityTemplatesQuerySchema.parse(req.query), auditContext(req as AuthenticatedRequest)));
}

export function getActivityTemplateController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Templat aktiviti berjaya diperoleh.", async () => {
    const { templateId } = activityTemplateIdParamsSchema.parse(req.params);
    return { template: await getActivityTemplate(templateId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function updateActivityTemplateController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Templat aktiviti berjaya dikemas kini.", async () => {
    const { templateId } = activityTemplateIdParamsSchema.parse(req.params);
    return { template: await updateActivityTemplate(templateId, updateActivityTemplateSchema.parse(req.body), auditContext(req as AuthenticatedRequest)) };
  });
}

export function archiveActivityTemplateController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Templat aktiviti berjaya diarkibkan.", async () => {
    const { templateId } = activityTemplateIdParamsSchema.parse(req.params);
    return { template: await archiveActivityTemplate(templateId, auditContext(req as AuthenticatedRequest)) };
  });
}

export function updateActivityTemplateStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  return respond(res, next, 200, "Status templat aktiviti berjaya dikemas kini.", async () => {
    const { templateId } = activityTemplateIdParamsSchema.parse(req.params);
    const { status } = updateActivityTemplateStatusSchema.parse(req.body);
    return { template: await updateActivityTemplateStatus(templateId, status, auditContext(req as AuthenticatedRequest)) };
  });
}
