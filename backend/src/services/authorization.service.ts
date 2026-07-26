import { TeacherPermission } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";

export interface ConsumeTeacherPermissionGrantInput {
  grantId: string;
  teacherId: string;
  permission: TeacherPermission;
}

export interface ConsumedTeacherPermissionGrant {
  id: string;
  permission: TeacherPermission;
  teacherId: string;
  grantedById: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: Date | null;
}

type TeacherPermissionGrantRecord = ConsumedTeacherPermissionGrant;

export interface TeacherPermissionGrantRepository {
  teacherPermissionGrant: {
    findFirst(
      args: Record<string, unknown>,
    ): Promise<TeacherPermissionGrantRecord | null>;
    updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
    findUnique(
      args: Record<string, unknown>,
    ): Promise<TeacherPermissionGrantRecord | null>;
  };
}

interface TeacherPermissionGrantDb {
  $transaction<T>(
    callback: (tx: TeacherPermissionGrantRepository) => Promise<T>,
  ): Promise<T>;
}

export interface ConsumeTeacherPermissionGrantDependencies {
  db?: TeacherPermissionGrantDb;
  now?: () => Date;
}

function permissionDenied(): AppError {
  return new AppError(
    "AUTH_PERMISSION_DENIED",
    403,
    "Anda tidak mempunyai kebenaran untuk melaksanakan tindakan ini.",
  );
}

function isUsableGrant(
  grant: TeacherPermissionGrantRecord,
  input: ConsumeTeacherPermissionGrantInput,
  now: Date,
): boolean {
  return (
    grant.teacherId === input.teacherId &&
    grant.permission === input.permission &&
    grant.isActive &&
    grant.usedCount < grant.maxUses &&
    (grant.expiresAt === null || grant.expiresAt > now)
  );
}

function toGrantState(
  grant: TeacherPermissionGrantRecord,
): ConsumedTeacherPermissionGrant {
  return {
    id: grant.id,
    permission: grant.permission,
    teacherId: grant.teacherId,
    grantedById: grant.grantedById,
    maxUses: grant.maxUses,
    usedCount: grant.usedCount,
    isActive: grant.isActive,
    expiresAt: grant.expiresAt,
  };
}

/**
 * Transaction-aware form used when a grant must be consumed together with the
 * business write it authorizes. The caller owns the surrounding transaction.
 */
export async function consumeTeacherPermissionGrantInTransaction(
  input: ConsumeTeacherPermissionGrantInput,
  tx: TeacherPermissionGrantRepository,
  now: Date,
): Promise<ConsumedTeacherPermissionGrant> {
  const grant = await tx.teacherPermissionGrant.findFirst({
    where: {
      id: input.grantId,
      teacherId: input.teacherId,
      permission: input.permission,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: {
      id: true,
      permission: true,
      teacherId: true,
      grantedById: true,
      maxUses: true,
      usedCount: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!grant || !isUsableGrant(grant, input, now)) {
    throw permissionDenied();
  }

  const nextUsedCount = grant.usedCount + 1;
  const updateResult = await tx.teacherPermissionGrant.updateMany({
    where: {
      id: grant.id,
      teacherId: input.teacherId,
      permission: input.permission,
      isActive: true,
      usedCount: grant.usedCount,
      maxUses: grant.maxUses,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    data: {
      usedCount: {
        increment: 1,
      },
      isActive: nextUsedCount < grant.maxUses,
    },
  });

  if (updateResult.count !== 1) {
    throw permissionDenied();
  }

  const updatedGrant = await tx.teacherPermissionGrant.findUnique({
    where: {
      id: grant.id,
    },
    select: {
      id: true,
      permission: true,
      teacherId: true,
      grantedById: true,
      maxUses: true,
      usedCount: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!updatedGrant) {
    throw permissionDenied();
  }

  return toGrantState(updatedGrant);
}

/**
 * Consumes a grant only after a permitted business action succeeds. The guarded
 * update makes a final remaining use available to one concurrent request only.
 */
export async function consumeTeacherPermissionGrant(
  input: ConsumeTeacherPermissionGrantInput,
  deps: ConsumeTeacherPermissionGrantDependencies = {},
): Promise<ConsumedTeacherPermissionGrant> {
  const db = deps.db ?? (prisma as unknown as TeacherPermissionGrantDb);

  return db.$transaction(async (tx) => {
    const now = deps.now?.() ?? new Date();
    return consumeTeacherPermissionGrantInTransaction(input, tx, now);
  });
}
