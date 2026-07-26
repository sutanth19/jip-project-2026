import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, ParentRelationship, UserRole } from "@prisma/client";
import { ZodError } from "zod";

import { AppError } from "../src/errors/app-error.js";
import { dispatchAuditEvent } from "../src/services/audit.service.js";
import { prisma } from "../src/config/prisma.js";
import {
  canParentTransitionStatus,
  createParent,
  linkParentStudent,
  listParents,
  type ParentAuditContext,
} from "../src/services/parent.service.js";
import {
  createParentSchema,
  linkParentStudentSchema,
  listParentsQuerySchema,
  parentStudentParamsSchema,
  updateParentSchema,
} from "../src/validators/parent.validator.js";

const managementContext: ParentAuditContext = {
  actor: {
    userId: "11111111-1111-4111-8111-111111111111",
    profileId: "22222222-2222-4222-8222-222222222222",
    role: UserRole.SUPER_ADMIN,
    schoolId: null,
    isFirstLogin: false,
  },
};

const studentContext: ParentAuditContext = {
  actor: { ...managementContext.actor, role: UserRole.STUDENT },
};

function assertAppError(value: unknown, code: string): void {
  assert.ok(value instanceof AppError);
  assert.equal(value.code, code);
}

test("parent validators accept a safe create request and normalize input at the service boundary", () => {
  const input = createParentSchema.parse({
    fullName: " Ibu Aisyah ",
    phone: "+60 12-345 6789",
    email: " IBU.AISYAH@EXAMPLE.COM ",
    occupation: " Penjaga ",
  });
  assert.equal(input.fullName, "Ibu Aisyah");
  assert.equal(input.email, "IBU.AISYAH@EXAMPLE.COM");
  assert.equal(input.phone, "+60 12-345 6789");
});

test("parent creation provisions a pending account safely and returns stable duplicate phone/email errors", async () => {
  const parentDelegate = prisma.parent as unknown as { findUnique: (...args: unknown[]) => Promise<unknown> };
  const userDelegate = prisma.user as unknown as { findUnique: (...args: unknown[]) => Promise<unknown> };
  const client = prisma as unknown as { $transaction: (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown> };
  const originalParentFind = parentDelegate.findUnique;
  const originalUserFind = userDelegate.findUnique;
  const originalTransaction = client.$transaction;
  let duplicatePhone = false;
  let duplicateEmail = false;

  parentDelegate.findUnique = async () => duplicatePhone ? { id: "existing-parent" } : null;
  userDelegate.findUnique = async () => duplicateEmail ? { id: "existing-user" } : null;
  client.$transaction = async (callback) => callback({
    user: { create: async () => ({ id: "33333333-3333-4333-8333-333333333333" }) },
    parent: {
      create: async () => ({
        id: "44444444-4444-4444-8444-444444444444",
        userId: "33333333-3333-4333-8333-333333333333",
        fullName: "Ibu Aisyah", phone: "0123456789", occupation: null, address: null, avatar: null,
        createdAt: new Date("2026-07-26T00:00:00.000Z"), updatedAt: new Date("2026-07-26T00:00:00.000Z"),
        user: { id: "33333333-3333-4333-8333-333333333333", role: UserRole.PARENT, email: "ibu@example.com", accountStatus: AccountStatus.PENDING, isFirstLogin: true, lastLogin: null, passwordHash: null },
        _count: { students: 0 },
      }),
    },
  });
  try {
    const result = await createParent(
      createParentSchema.parse({ fullName: " Ibu Aisyah ", phone: "+60 12-345 6789", email: "IBU@EXAMPLE.COM" }),
      managementContext,
      { setupTokenGenerator: () => "test-setup-token", invitationDispatcher: () => "DEVELOPMENT_PREVIEW" },
    );
    assert.equal(result.parent.phone, "0123456789");
    assert.equal(result.parent.email, "ibu@example.com");
    assert.equal(result.parent.accountStatus, AccountStatus.PENDING);
    assert.equal("passwordHash" in result.parent, false);
    assert.equal("setupToken" in result.parent, false);

    duplicatePhone = true;
    await assert.rejects(
      createParent(createParentSchema.parse({ fullName: "Ibu Lain", phone: "0123456789" }), managementContext),
      (caught: unknown) => { assertAppError(caught, "PARENT_PHONE_EXISTS"); return true; },
    );
    duplicatePhone = false;
    duplicateEmail = true;
    await assert.rejects(
      createParent(createParentSchema.parse({ fullName: "Ibu Lain", phone: "0134567890", email: "ibu@example.com" }), managementContext),
      (caught: unknown) => { assertAppError(caught, "PARENT_EMAIL_EXISTS"); return true; },
    );
  } finally {
    parentDelegate.findUnique = originalParentFind;
    userDelegate.findUnique = originalUserFind;
    client.$transaction = originalTransaction;
  }
});

test("parent validators block mass assignment, malformed contact data, and unsafe sorting", () => {
  assert.throws(() => updateParentSchema.parse({ role: UserRole.ADMIN }), ZodError);
  assert.throws(() => updateParentSchema.parse({ userId: "11111111-1111-4111-8111-111111111111" }), ZodError);
  assert.throws(() => updateParentSchema.parse({ passwordHash: "not-allowed" }), ZodError);
  assert.throws(() => createParentSchema.parse({ fullName: "Ibu Aisyah", phone: "123" }), ZodError);
  assert.throws(() => listParentsQuerySchema.parse({ sortBy: "passwordHash" }), ZodError);
  assert.throws(() => listParentsQuerySchema.parse({ limit: 101 }), ZodError);
});

test("parent list validation supplies pagination and sorting defaults and supports search/status", () => {
  const defaults = listParentsQuerySchema.parse({});
  assert.deepEqual(defaults, { page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" });
  const filtered = listParentsQuerySchema.parse({ page: 2, limit: 25, search: "penjaga", status: "SUSPENDED", sortBy: "fullName", sortOrder: "asc" });
  assert.equal(filtered.page, 2);
  assert.equal(filtered.search, "penjaga");
  assert.equal(filtered.status, AccountStatus.SUSPENDED);
});

test("parent status policy allows only approved operational transitions and SUPER_ADMIN restoration", () => {
  assert.equal(canParentTransitionStatus(AccountStatus.ACTIVE, AccountStatus.SUSPENDED, UserRole.ADMIN), true);
  assert.equal(canParentTransitionStatus(AccountStatus.ACTIVE, AccountStatus.ARCHIVED, UserRole.ADMIN), true);
  assert.equal(canParentTransitionStatus(AccountStatus.SUSPENDED, AccountStatus.ACTIVE, UserRole.ADMIN), true);
  assert.equal(canParentTransitionStatus(AccountStatus.ARCHIVED, AccountStatus.ACTIVE, UserRole.ADMIN), false);
  assert.equal(canParentTransitionStatus(AccountStatus.ARCHIVED, AccountStatus.ACTIVE, UserRole.SUPER_ADMIN), true);
  assert.equal(canParentTransitionStatus(AccountStatus.ACTIVE, AccountStatus.ACTIVE, UserRole.SUPER_ADMIN), false);
});

test("parent-student link validation supports only the approved relationship values and UUID route identifiers", () => {
  assert.equal(linkParentStudentSchema.parse({ relationship: ParentRelationship.GUARDIAN }).relationship, ParentRelationship.GUARDIAN);
  assert.throws(() => linkParentStudentSchema.parse({ relationship: "OTHER" }), ZodError);
  assert.throws(() => parentStudentParamsSchema.parse({ parentId: "bad", studentId: "bad" }), ZodError);
});

test("parent management service denies STUDENT writes and reads before any database operation", async () => {
  await assert.rejects(
    createParent(createParentSchema.parse({ fullName: "Ibu Aisyah", phone: "0123456789" }), studentContext),
    (caught: unknown) => { assertAppError(caught, "AUTH_ROLE_FORBIDDEN"); return true; },
  );
  await assert.rejects(
    listParents(listParentsQuerySchema.parse({}), studentContext),
    (caught: unknown) => { assertAppError(caught, "AUTH_ROLE_FORBIDDEN"); return true; },
  );
  await assert.rejects(
    linkParentStudent(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      linkParentStudentSchema.parse({ relationship: ParentRelationship.MOTHER }),
      studentContext,
    ),
    (caught: unknown) => { assertAppError(caught, "AUTH_ROLE_FORBIDDEN"); return true; },
  );
});

test("parent audit action dispatches structured metadata without credential fields", async () => {
  const events: unknown[] = [];
  await dispatchAuditEvent({
    actorUserId: managementContext.actor.userId,
    actorProfileId: managementContext.actor.profileId,
    actorRole: UserRole.SUPER_ADMIN,
    actorName: null,
    action: "PARENT_STUDENT_LINKED",
    resourceType: "PARENT_STUDENT",
    resourceId: "33333333-3333-4333-8333-333333333333",
    schoolId: "44444444-4444-4444-8444-444444444444",
    before: null,
    after: { relationship: ParentRelationship.FATHER },
    timestamp: new Date("2026-07-26T00:00:00.000Z"),
    requestIp: null,
    userAgent: null,
  }, (event) => events.push(event));
  assert.equal(events.length, 1);
  assert.equal((events[0] as { action: string }).action, "PARENT_STUDENT_LINKED");
  assert.equal(JSON.stringify(events).includes("setupToken"), false);
});
