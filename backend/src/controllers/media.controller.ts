import type { NextFunction, Request, Response } from "express";
import { rm } from "node:fs/promises";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { deleteMedia, getMediaReadFile, uploadMedia, type MediaAuditContext, type MediaUploadFile } from "../services/media.service.js";
import { mediaDeleteSchema, mediaUploadFieldsSchema } from "../validators/media.validator.js";

function auditContext(req: AuthenticatedRequest): MediaAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip || null, userAgent: req.get("user-agent") || null };
}

function uploadedFile(req: Request): MediaUploadFile {
  if (!req.file) throw new AppError("MEDIA_FILE_REQUIRED", 400, "Fail media diperlukan.");
  return { path: req.file.path, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size };
}

function routeKey(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("/");
  throw new AppError("MEDIA_FILENAME_INVALID", 400, "Kunci fail media tidak sah.");
}

export async function uploadMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  let file: MediaUploadFile | null = null;
  let serviceOwnsCleanup = false;
  try {
    file = uploadedFile(req);
    const fields = mediaUploadFieldsSchema.parse(req.body);
    // Context IDs are syntactically validated but deliberately not used until their
    // ownership can be verified by future resource-specific media endpoints.
    serviceOwnsCleanup = true;
    const storedFile = await uploadMedia({ file, purpose: fields.purpose }, auditContext(req as AuthenticatedRequest));
    successResponse(res, 201, "Fail berjaya dimuat naik.", { file: storedFile });
  } catch (caught) {
    if (file && !serviceOwnsCleanup) await rm(file.path, { force: true }).catch(() => undefined);
    next(caught);
  }
}

export async function getMediaFileController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = await getMediaReadFile(routeKey(req.params.key));
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");
    res.sendFile(file.path, (caught) => {
      if (caught && !res.headersSent) next(new AppError("MEDIA_FILE_NOT_FOUND", 404, "Fail media tidak ditemui."));
    });
  } catch (caught) { next(caught); }
}

export async function deleteMediaController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { key } = mediaDeleteSchema.parse(req.body);
    await deleteMedia(key, auditContext(req as AuthenticatedRequest));
    successResponse(res, 200, "Fail media berjaya dipadam.", null);
  } catch (caught) { next(caught); }
}
