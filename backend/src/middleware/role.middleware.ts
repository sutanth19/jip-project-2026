import type { NextFunction, Response } from "express";
import { TeacherPermission, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type {
  AuthenticatedRequest,
  AuthenticatedSession,
  PermissionGrantContext,
} from "./auth.middleware.js";

/**
 * Secure route composition examples:
 * SUPER_ADMIN: authenticate -> requirePasswordChanged -> requireRole(UserRole.SUPER_ADMIN)
 * ADMIN: authenticate -> requirePasswordChanged -> requireRole(UserRole.ADMIN)
 * TEACHER: authenticate -> requirePasswordChanged -> requireRole(UserRole.TEACHER) -> requireTeacherPermission(...) -> requireSchoolAccess(...)
 * STUDENT: authenticate -> requireStudentPinChanged -> requireRole(UserRole.STUDENT) -> requireStudentSelfAccess(...)
 * PARENT: authenticate -> requirePasswordChanged -> requireRole(UserRole.PARENT) -> requireLinkedChildAccess(...)
 * Prefer resolver callbacks whenever a resource's school or owner can be derived from the database.
 */

type RequestValueSource = "params" | "body" | "query" | "resolver";

type RequestIdResolver = (
  req: AuthenticatedRequest,
) => string | null | Promise<string | null>;

export interface StudentAccessOptions {
  source?: RequestValueSource;
  key?: string;
  resolveStudentId?: RequestIdResolver;
  bypassRoles?: UserRole[];
}

export interface SchoolAccessOptions {
  source?: RequestValueSource;
  key?: string;
  resolveSchoolId?: RequestIdResolver;
}

interface TeacherPermissionGrantRecord extends PermissionGrantContext {
  isActive: boolean;
}

interface TeacherStudentRecord {
  id: string;
  schoolId: string;
  class: {
    id: string;
    schoolId: string;
    teacherId: string;
  } | null;
}

interface AuthorizationDb {
  teacherPermissionGrant: {
    findMany(
      args: Record<string, unknown>,
    ): Promise<TeacherPermissionGrantRecord[]>;
  };
  parentStudent: {
    findUnique(args: Record<string, unknown>): Promise<{ id: string } | null>;
  };
  student: {
    findUnique(
      args: Record<string, unknown>,
    ): Promise<TeacherStudentRecord | null>;
  };
}

export interface AuthorizationDependencies {
  db?: AuthorizationDb;
  now?: () => Date;
}

function invalidToken(): AppError {
  return new AppError("AUTH_INVALID_TOKEN", 401, "Invalid or expired token.");
}

function roleForbidden(): AppError {
  return new AppError(
    "AUTH_ROLE_FORBIDDEN",
    403,
    "Anda tidak mempunyai kebenaran untuk mengakses fungsi ini.",
  );
}

function permissionDenied(): AppError {
  return new AppError(
    "AUTH_PERMISSION_DENIED",
    403,
    "Anda tidak mempunyai kebenaran untuk melaksanakan tindakan ini.",
  );
}

function schoolAccessDenied(): AppError {
  return new AppError(
    "AUTH_SCHOOL_ACCESS_DENIED",
    403,
    "Anda tidak dibenarkan mengakses data sekolah ini.",
  );
}

function ownerAccessDenied(message: string): AppError {
  return new AppError("AUTH_OWNER_ACCESS_DENIED", 403, message);
}

function resourceContextMissing(): AppError {
  return new AppError(
    "AUTH_RESOURCE_CONTEXT_MISSING",
    400,
    "Konteks sumber yang diperlukan tidak ditemui.",
  );
}

function invalidIdentifier(): AppError {
  return new AppError("AUTH_INVALID_INPUT", 400, "ID yang diberikan tidak sah.");
}

function schoolContextRequired(): AppError {
  return new AppError(
    "AUTH_SCHOOL_CONTEXT_REQUIRED",
    403,
    "Konteks sekolah diperlukan untuk mengakses fungsi ini.",
  );
}

function getAuth(req: AuthenticatedRequest): AuthenticatedSession {
  if (!req.auth) {
    throw invalidToken();
  }

  return req.auth;
}

function getRecordValue(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}

function getSourceValue(
  req: AuthenticatedRequest,
  source: Exclude<RequestValueSource, "resolver">,
  key: string,
): string | null {
  if (source === "params") {
    return getRecordValue(req.params as unknown, key);
  }

  if (source === "query") {
    return getRecordValue(req.query as unknown, key);
  }

  return getRecordValue(req.body as unknown, key);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

async function resolveRequiredId(
  req: AuthenticatedRequest,
  options: {
    source?: RequestValueSource;
    key?: string;
    resolver?: RequestIdResolver;
    defaultKey: string;
  },
): Promise<string> {
  let value: string | null;

  try {
    if (options.resolver) {
      value = await options.resolver(req);
    } else {
      const source = options.source ?? "params";

      if (source === "resolver") {
        throw resourceContextMissing();
      }

      value = getSourceValue(req, source, options.key ?? options.defaultKey);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw resourceContextMissing();
  }

  if (!value) {
    if (options.resolver || options.source === "resolver") {
      throw resourceContextMissing();
    }

    throw invalidIdentifier();
  }

  if (!isUuid(value)) {
    throw invalidIdentifier();
  }

  return value;
}

function hasBypassRole(
  auth: AuthenticatedSession,
  bypassRoles: UserRole[] | undefined,
): boolean {
  return bypassRoles?.includes(auth.role) ?? false;
}

function isUsableGrant(
  grant: TeacherPermissionGrantRecord,
  teacherId: string,
  permission: TeacherPermission,
  now: Date,
): boolean {
  return (
    grant.teacherId === teacherId &&
    grant.permission === permission &&
    grant.isActive &&
    grant.usedCount < grant.maxUses &&
    (grant.expiresAt === null || grant.expiresAt > now)
  );
}

/** Requires authenticate to run earlier in the route chain. */
export function requireRole(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): void => {
    try {
      const auth = getAuth(req);

      if (!allowedRoles.includes(auth.role)) {
        throw roleForbidden();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Backwards-compatible alias for existing route code. */
export const authorize = requireRole;

export function requireTeacherPermission(
  permission: TeacherPermission,
  deps: AuthorizationDependencies = {},
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth(req);

      if (auth.role !== UserRole.TEACHER) {
        throw permissionDenied();
      }

      const db = deps.db ?? (prisma as unknown as AuthorizationDb);
      const now = deps.now?.() ?? new Date();
      const grants = await db.teacherPermissionGrant.findMany({
        where: {
          teacherId: auth.profileId,
          permission,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      const grant = grants.find((candidate) =>
        isUsableGrant(candidate, auth.profileId, permission, now),
      );

      if (!grant) {
        throw permissionDenied();
      }

      req.permissionGrant = {
        id: grant.id,
        permission: grant.permission,
        teacherId: grant.teacherId,
        grantedById: grant.grantedById,
        maxUses: grant.maxUses,
        usedCount: grant.usedCount,
        expiresAt: grant.expiresAt,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Allows system administrators to perform an action directly, while allowing
 * teachers only when the requested temporary permission is currently valid.
 */
export function requireRoleOrTeacherPermission(
  allowedRoles: UserRole[],
  permission: TeacherPermission,
  deps: AuthorizationDependencies = {},
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth(req);

      if (allowedRoles.includes(auth.role)) {
        next();
        return;
      }

      if (auth.role !== UserRole.TEACHER) {
        throw roleForbidden();
      }

      const db = deps.db ?? (prisma as unknown as AuthorizationDb);
      const now = deps.now?.() ?? new Date();
      const grants = await db.teacherPermissionGrant.findMany({
        where: {
          teacherId: auth.profileId,
          permission,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: { createdAt: "asc" },
      });
      const grant = grants.find((candidate) =>
        isUsableGrant(candidate, auth.profileId, permission, now),
      );

      if (!grant) {
        throw permissionDenied();
      }

      req.permissionGrant = {
        id: grant.id,
        permission: grant.permission,
        teacherId: grant.teacherId,
        grantedById: grant.grantedById,
        maxUses: grant.maxUses,
        usedCount: grant.usedCount,
        expiresAt: grant.expiresAt,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireSchoolAccess(options: SchoolAccessOptions = {}) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth(req);
      const targetSchoolId = await resolveRequiredId(req, {
        source: options.source,
        key: options.key,
        resolver: options.resolveSchoolId,
        defaultKey: "schoolId",
      });

      if (auth.role === UserRole.SUPER_ADMIN || auth.role === UserRole.ADMIN) {
        next();
        return;
      }

      if (auth.role === UserRole.PARENT) {
        throw schoolAccessDenied();
      }

      if (!auth.schoolId) {
        throw schoolContextRequired();
      }

      if (auth.schoolId !== targetSchoolId) {
        throw schoolAccessDenied();
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireStudentSelfAccess(options: StudentAccessOptions = {}) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth(req);
      const targetStudentId = await resolveRequiredId(req, {
        source: options.source,
        key: options.key,
        resolver: options.resolveStudentId,
        defaultKey: "studentId",
      });

      if (hasBypassRole(auth, options.bypassRoles)) {
        next();
        return;
      }

      if (auth.role !== UserRole.STUDENT) {
        throw roleForbidden();
      }

      if (auth.profileId !== targetStudentId) {
        throw ownerAccessDenied("Anda tidak dibenarkan mengakses rekod ini.");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireLinkedChildAccess(
  options: StudentAccessOptions = {},
  deps: AuthorizationDependencies = {},
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth(req);
      const targetStudentId = await resolveRequiredId(req, {
        source: options.source,
        key: options.key,
        resolver: options.resolveStudentId,
        defaultKey: "studentId",
      });

      if (hasBypassRole(auth, options.bypassRoles)) {
        next();
        return;
      }

      if (auth.role !== UserRole.PARENT) {
        throw roleForbidden();
      }

      const db = deps.db ?? (prisma as unknown as AuthorizationDb);
      const link = await db.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: auth.profileId,
            studentId: targetStudentId,
          },
        },
        select: {
          id: true,
        },
      });

      if (!link) {
        throw ownerAccessDenied(
          "Anda tidak dibenarkan mengakses rekod murid ini.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireTeacherStudentAccess(
  options: StudentAccessOptions = {},
  deps: AuthorizationDependencies = {},
) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const auth = getAuth(req);
      const targetStudentId = await resolveRequiredId(req, {
        source: options.source,
        key: options.key,
        resolver: options.resolveStudentId,
        defaultKey: "studentId",
      });

      if (hasBypassRole(auth, options.bypassRoles)) {
        next();
        return;
      }

      if (auth.role !== UserRole.TEACHER) {
        throw roleForbidden();
      }

      if (!auth.schoolId) {
        throw schoolContextRequired();
      }

      const db = deps.db ?? (prisma as unknown as AuthorizationDb);
      const student = await db.student.findUnique({
        where: {
          id: targetStudentId,
        },
        include: {
          class: true,
        },
      });

      if (
        !student ||
        !student.class ||
        student.schoolId !== auth.schoolId ||
        student.class.schoolId !== student.schoolId ||
        student.class.teacherId !== auth.profileId
      ) {
        throw ownerAccessDenied("Anda tidak dibenarkan mengakses murid ini.");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
