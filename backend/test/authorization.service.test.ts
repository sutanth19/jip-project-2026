import assert from "node:assert/strict";
import test from "node:test";

import { TeacherPermission } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  consumeTeacherPermissionGrant,
  type ConsumedTeacherPermissionGrant,
} from "../src/services/authorization.service.js";

const grantId = "11111111-1111-4111-8111-111111111111";
const teacherId = "22222222-2222-4222-8222-222222222222";
const grantedById = "33333333-3333-4333-8333-333333333333";
const fixedNow = new Date("2026-07-26T00:00:00.000Z");

interface GrantState extends ConsumedTeacherPermissionGrant {}

interface MockState {
  grant: GrantState | null;
  updateAttempts: number;
}

function getRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error("Expected a Prisma record.");
  }

  return value as Record<string, unknown>;
}

function createGrant(overrides: Partial<GrantState> = {}): GrantState {
  return {
    id: grantId,
    permission: TeacherPermission.CREATE_TEACHER,
    teacherId,
    grantedById,
    maxUses: 2,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    ...overrides,
  };
}

function createGrantDb(initialGrant: GrantState | null) {
  const state: MockState = {
    grant: initialGrant,
    updateAttempts: 0,
  };

  const repository = {
    findFirst: async (_args: Record<string, unknown>) =>
      state.grant ? { ...state.grant } : null,
    updateMany: async (args: Record<string, unknown>) => {
      state.updateAttempts += 1;

      if (!state.grant) {
        return { count: 0 };
      }

      const where = getRecord(args.where);
      const data = getRecord(args.data);
      const expectedUsedCount = where.usedCount;
      const expectedMaxUses = where.maxUses;
      const expectedId = where.id;
      const expectedTeacherId = where.teacherId;
      const expectedPermission = where.permission;

      if (
        expectedId !== state.grant.id ||
        expectedTeacherId !== state.grant.teacherId ||
        expectedPermission !== state.grant.permission ||
        expectedUsedCount !== state.grant.usedCount ||
        expectedMaxUses !== state.grant.maxUses ||
        state.grant.isActive === false
      ) {
        return { count: 0 };
      }

      const usageUpdate = getRecord(data.usedCount);
      const increment = usageUpdate.increment;
      const nextIsActive = data.isActive;

      if (increment !== 1 || typeof nextIsActive !== "boolean") {
        throw new Error("Unexpected grant update.");
      }

      state.grant = {
        ...state.grant,
        usedCount: state.grant.usedCount + increment,
        isActive: nextIsActive,
      };

      return { count: 1 };
    },
    findUnique: async (_args: Record<string, unknown>) =>
      state.grant ? { ...state.grant } : null,
  };
  const transactionClient = {
    teacherPermissionGrant: repository,
  };
  const db = {
    $transaction: async <T>(
      callback: (tx: typeof transactionClient) => Promise<T>,
    ): Promise<T> => callback(transactionClient),
  };

  return { db, state };
}

test("consumeTeacherPermissionGrant increments usedCount", async () => {
  const { db, state } = createGrantDb(createGrant({ maxUses: 2 }));

  const result = await consumeTeacherPermissionGrant(
    {
      grantId,
      teacherId,
      permission: TeacherPermission.CREATE_TEACHER,
    },
    {
      db: db as never,
      now: () => fixedNow,
    },
  );

  assert.equal(result.usedCount, 1);
  assert.equal(result.isActive, true);
  assert.equal(state.grant?.usedCount, 1);
  assert.equal(state.updateAttempts, 1);
});

test("consumeTeacherPermissionGrant deactivates a grant at its maximum use", async () => {
  const { db, state } = createGrantDb(createGrant({ maxUses: 1 }));

  const result = await consumeTeacherPermissionGrant(
    {
      grantId,
      teacherId,
      permission: TeacherPermission.CREATE_TEACHER,
    },
    {
      db: db as never,
      now: () => fixedNow,
    },
  );

  assert.equal(result.usedCount, 1);
  assert.equal(result.isActive, false);
  assert.equal(state.grant?.isActive, false);
});

test("consumeTeacherPermissionGrant rejects expired grants", async () => {
  const { db, state } = createGrantDb(
    createGrant({ expiresAt: new Date("2026-07-25T00:00:00.000Z") }),
  );

  await assert.rejects(
    consumeTeacherPermissionGrant(
      {
        grantId,
        teacherId,
        permission: TeacherPermission.CREATE_TEACHER,
      },
      {
        db: db as never,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError && error.code === "AUTH_PERMISSION_DENIED",
  );

  assert.equal(state.updateAttempts, 0);
});

test("concurrent final grant consumption succeeds only once", async () => {
  const { db, state } = createGrantDb(createGrant({ maxUses: 1 }));
  const input = {
    grantId,
    teacherId,
    permission: TeacherPermission.CREATE_TEACHER,
  };

  const results = await Promise.allSettled([
    consumeTeacherPermissionGrant(input, {
      db: db as never,
      now: () => fixedNow,
    }),
    consumeTeacherPermissionGrant(input, {
      db: db as never,
      now: () => fixedNow,
    }),
  ]);
  const fulfilled = results.filter(
    (
      result,
    ): result is PromiseFulfilledResult<ConsumedTeacherPermissionGrant> =>
      result.status === "fulfilled",
  );
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(rejected[0]?.reason instanceof AppError);
  assert.equal(rejected[0]?.reason.code, "AUTH_PERMISSION_DENIED");
  assert.equal(state.grant?.usedCount, 1);
  assert.equal(state.grant?.isActive, false);
});
