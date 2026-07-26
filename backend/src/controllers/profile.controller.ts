import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { ZodError } from "zod";

import { AppError } from "../errors/app-error.js";
import { successResponse } from "../helpers/response.helper.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { changeMyPassword, changeMyPin, getMyAccount, getMyProfile, updateMyAvatar, updateMyProfile, type ProfileAuditContext, type SelfProfileUpdate } from "../services/profile.service.js";
import { adminProfileUpdateSchema, avatarUpdateSchema, changePasswordSchema, changePinSchema, parentProfileUpdateSchema, studentProfileUpdateSchema, teacherProfileUpdateSchema, type AvatarUpdateRequest, type ChangePasswordRequest, type ChangePinRequest } from "../validators/profile.validator.js";

function context(req: AuthenticatedRequest): ProfileAuditContext {
  if (!req.auth) throw new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
  return { actor: req.auth, requestIp: req.ip || null, userAgent: req.get("user-agent") || null };
}

function profileUpdateForRole(role: UserRole, body: unknown): SelfProfileUpdate {
  if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) return adminProfileUpdateSchema.parse(body);
  if (role === UserRole.TEACHER) return teacherProfileUpdateSchema.parse(body);
  if (role === UserRole.PARENT) return parentProfileUpdateSchema.parse(body);
  return studentProfileUpdateSchema.parse(body);
}

function validationError(caught: unknown, code: string, message: string): never {
  if (caught instanceof ZodError) throw new AppError(code, 400, message);
  throw caught;
}

export async function getMyProfileController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 200, "Profil pengguna berjaya diperoleh.", await getMyProfile(context(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}

export async function updateMyProfileController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auditContext = context(req as AuthenticatedRequest);
    let input: SelfProfileUpdate;
    try { input = profileUpdateForRole(auditContext.actor.role, req.body); } catch (caught) { validationError(caught, "PROFILE_UPDATE_NOT_ALLOWED", "Maklumat profil tidak sah."); }
    successResponse(res, 200, "Profil pengguna berjaya dikemas kini.", await updateMyProfile(input, auditContext));
  } catch (caught) { next(caught); }
}

export async function updateMyAvatarController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let input: AvatarUpdateRequest;
    try { input = avatarUpdateSchema.parse(req.body); } catch (caught) { validationError(caught, "PROFILE_AVATAR_INVALID", "Rujukan avatar tidak sah."); }
    successResponse(res, 200, "Avatar pengguna berjaya dikemas kini.", await updateMyAvatar(input.mediaKey, context(req as AuthenticatedRequest)));
  } catch (caught) { next(caught); }
}

export async function changeMyPasswordController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let input: ChangePasswordRequest;
    try { input = changePasswordSchema.parse(req.body); } catch (caught) { validationError(caught, "AUTH_PASSWORD_POLICY_FAILED", "Maklumat kata laluan tidak sah."); }
    await changeMyPassword(input, context(req as AuthenticatedRequest));
    successResponse(res, 200, "Kata laluan berjaya ditukar.", null);
  } catch (caught) { next(caught); }
}

export async function changeMyPinController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let input: ChangePinRequest;
    try { input = changePinSchema.parse(req.body); } catch (caught) { validationError(caught, "AUTH_PIN_POLICY_FAILED", "Maklumat PIN tidak sah."); }
    await changeMyPin(input, context(req as AuthenticatedRequest));
    successResponse(res, 200, "PIN berjaya ditukar.", null);
  } catch (caught) { next(caught); }
}

export async function getMyAccountController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { successResponse(res, 200, "Maklumat akaun berjaya diperoleh.", await getMyAccount(context(req as AuthenticatedRequest))); } catch (caught) { next(caught); }
}
