import { UserRole } from "@prisma/client";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";

export const notificationDenied = (): AppError => new AppError("NOTIFICATION_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses notifikasi ini.");
export function canManageSchool(actor: AuthenticatedSession, schoolId: string | null): boolean { return actor.role === UserRole.SUPER_ADMIN || (actor.role === UserRole.ADMIN && (actor.schoolId === null || actor.schoolId === schoolId)); }
export function canPublishAnnouncement(actor: AuthenticatedSession): boolean { return actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN || actor.role === UserRole.TEACHER; }
export function requireSchoolScope(actor: AuthenticatedSession, schoolId: string | null): void { if (!canManageSchool(actor, schoolId)) throw notificationDenied(); }
