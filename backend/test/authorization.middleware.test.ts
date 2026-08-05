import assert from "node:assert/strict";
import test from "node:test";

import { TeacherPermission, UserRole } from "@prisma/client";
import type { NextFunction, Response } from "express";

import { AppError } from "../src/errors/app-error.js";
import type {
  AuthenticatedRequest,
  AuthenticatedSession,
  PermissionGrantContext,
} from "../src/middleware/auth.middleware.js";
import {
  requireLinkedChildAccess,
  requireRole,
  requireRoleOrTeacherPermission,
  requireSchoolAccess,
  requireStudentSelfAccess,
  requireTeacherPermission,
  requireTeacherStudentAccess,
} from "../src/middleware/role.middleware.js";

const schoolOneId = "11111111-1111-4111-8111-111111111111";
const schoolTwoId = "22222222-2222-4222-8222-222222222222";
const studentOneId = "33333333-3333-4333-8333-333333333333";
const studentTwoId = "44444444-4444-4444-8444-444444444444";
const teacherOneId = "55555555-5555-4555-8555-555555555555";
const teacherTwoId = "66666666-6666-4666-8666-666666666666";

interface MockGrant extends PermissionGrantContext {
  isActive: boolean;
}

interface MockTeacherStudent {
  id: string;
  schoolId: string;
  class: {
    id: string;
    schoolId: string;
    teacherId: string;
  } | null;
}

interface AuthorizationState {
  grants: MockGrant[];
  parentLink: { id: string } | null;
  teacherStudent: MockTeacherStudent | null;
  grantLookups: number;
  parentLinkLookups: number;
  teacherStudentLookups: number;
}

type AccessMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

function createAuth(
  role: UserRole,
  overrides: Partial<AuthenticatedSession> = {},
): AuthenticatedSession {
  return {
    userId: "user-1",
    role,
    profileId: "77777777-7777-4777-8777-777777777777",
    schoolId: schoolOneId,
    isFirstLogin: false,
    ...overrides,
  };
}

function createRequest(
  auth: AuthenticatedSession | undefined,
  params: Record<string, string> = {},
): AuthenticatedRequest {
  return {
    auth,
    params,
  } as AuthenticatedRequest;
}

function createGrant(overrides: Partial<MockGrant> = {}): MockGrant {
  return {
    id: "88888888-8888-4888-8888-888888888888",
    permission: TeacherPermission.CREATE_TEACHER,
    teacherId: teacherOneId,
    grantedById: "99999999-9999-4999-8999-999999999999",
    maxUses: 1,
    usedCount: 0,
    isActive: true,
    expiresAt: null,
    ...overrides,
  };
}

function createAuthorizationDb(overrides: Partial<AuthorizationState> = {}) {
  const state: AuthorizationState = {
    grants: [],
    parentLink: null,
    teacherStudent: null,
    grantLookups: 0,
    parentLinkLookups: 0,
    teacherStudentLookups: 0,
    ...overrides,
  };

  const db = {
    teacherPermissionGrant: {
      findMany: async (_args: Record<string, unknown>) => {
        state.grantLookups += 1;
        return state.grants;
      },
    },
    parentStudent: {
      findUnique: async (_args: Record<string, unknown>) => {
        state.parentLinkLookups += 1;
        return state.parentLink;
      },
    },
    student: {
      findUnique: async (_args: Record<string, unknown>) => {
        state.teacherStudentLookups += 1;
        return state.teacherStudent;
      },
    },
  };

  return { db, state };
}

async function invoke(
  middleware: AccessMiddleware,
  req: AuthenticatedRequest,
): Promise<{ nextCalled: boolean; error: unknown }> {
  let nextCalled = false;
  let error: unknown;

  await middleware(req, {} as never, (nextError?: unknown) => {
    nextCalled = true;
    error = nextError;
  });

  return { nextCalled, error };
}

function assertAppError(
  error: unknown,
  expectedCode: string,
  expectedStatus = 403,
): void {
  assert.ok(error instanceof AppError);
  assert.equal(error.code, expectedCode);
  assert.equal(error.statusCode, expectedStatus);
}

test("requireRole permits an allowed role", async () => {
  const result = await invoke(
    requireRole(UserRole.ADMIN),
    createRequest(createAuth(UserRole.ADMIN)),
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, undefined);
});

test("requireRole rejects a disallowed role", async () => {
  const result = await invoke(
    requireRole(UserRole.ADMIN),
    createRequest(createAuth(UserRole.TEACHER)),
  );

  assertAppError(result.error, "AUTH_ROLE_FORBIDDEN");
});

test("requireRole rejects missing authentication safely", async () => {
  const result = await invoke(requireRole(UserRole.ADMIN), createRequest(undefined));

  assertAppError(result.error, "AUTH_INVALID_TOKEN", 401);
});

test("requireRole supports multiple allowed roles", async () => {
  const result = await invoke(
    requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    createRequest(createAuth(UserRole.SUPER_ADMIN, { schoolId: null })),
  );

  assert.equal(result.nextCalled, true);
  assert.equal(result.error, undefined);
});

test("requireTeacherPermission accepts a valid CREATE_TEACHER grant", async () => {
  const grant = createGrant();
  const { db } = createAuthorizationDb({ grants: [grant] });
  const req = createRequest(
    createAuth(UserRole.TEACHER, { profileId: teacherOneId }),
  );

  const result = await invoke(
    requireTeacherPermission(TeacherPermission.CREATE_TEACHER, {
      db: db as never,
      now: () => new Date("2026-07-26T00:00:00.000Z"),
    }),
    req,
  );

  assert.equal(result.error, undefined);
  assert.deepEqual(req.permissionGrant, {
    id: grant.id,
    permission: TeacherPermission.CREATE_TEACHER,
    teacherId: teacherOneId,
    grantedById: grant.grantedById,
    maxUses: 1,
    usedCount: 0,
    expiresAt: null,
  });
});

test("requireTeacherPermission rejects expired grants", async () => {
  const { db } = createAuthorizationDb({
    grants: [createGrant({ expiresAt: new Date("2026-07-25T00:00:00.000Z") })],
  });

  const result = await invoke(
    requireTeacherPermission(TeacherPermission.CREATE_TEACHER, {
      db: db as never,
      now: () => new Date("2026-07-26T00:00:00.000Z"),
    }),
    createRequest(createAuth(UserRole.TEACHER, { profileId: teacherOneId })),
  );

  assertAppError(result.error, "AUTH_PERMISSION_DENIED");
});

test("requireTeacherPermission rejects inactive grants", async () => {
  const { db } = createAuthorizationDb({
    grants: [createGrant({ isActive: false })],
  });

  const result = await invoke(
    requireTeacherPermission(TeacherPermission.CREATE_TEACHER, {
      db: db as never,
    }),
    createRequest(createAuth(UserRole.TEACHER, { profileId: teacherOneId })),
  );

  assertAppError(result.error, "AUTH_PERMISSION_DENIED");
});

test("requireTeacherPermission rejects fully used grants", async () => {
  const { db } = createAuthorizationDb({
    grants: [createGrant({ maxUses: 1, usedCount: 1 })],
  });

  const result = await invoke(
    requireTeacherPermission(TeacherPermission.CREATE_TEACHER, {
      db: db as never,
    }),
    createRequest(createAuth(UserRole.TEACHER, { profileId: teacherOneId })),
  );

  assertAppError(result.error, "AUTH_PERMISSION_DENIED");
});

test("requireTeacherPermission rejects a grant belonging to another teacher", async () => {
  const { db } = createAuthorizationDb({
    grants: [createGrant({ teacherId: teacherTwoId })],
  });

  const result = await invoke(
    requireTeacherPermission(TeacherPermission.CREATE_TEACHER, {
      db: db as never,
    }),
    createRequest(createAuth(UserRole.TEACHER, { profileId: teacherOneId })),
  );

  assertAppError(result.error, "AUTH_PERMISSION_DENIED");
});

test("requireTeacherPermission attaches minimal context without consuming a grant", async () => {
  const grant = createGrant({ maxUses: 3, usedCount: 1 });
  const { db, state } = createAuthorizationDb({ grants: [grant] });
  const req = createRequest(
    createAuth(UserRole.TEACHER, { profileId: teacherOneId }),
  );

  const result = await invoke(
    requireTeacherPermission(TeacherPermission.CREATE_TEACHER, {
      db: db as never,
    }),
    req,
  );

  assert.equal(result.error, undefined);
  assert.equal(state.grants[0]?.usedCount, 1);
  assert.equal(req.permissionGrant?.usedCount, 1);
  assert.equal(state.grantLookups, 1);
});

test("teacher creation access permits system roles without a permission lookup", async () => {
  const { db, state } = createAuthorizationDb();
  const result = await invoke(
    requireRoleOrTeacherPermission(
      [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      TeacherPermission.CREATE_TEACHER,
      { db: db as never },
    ),
    createRequest(createAuth(UserRole.ADMIN, { schoolId: null })),
  );

  assert.equal(result.error, undefined);
  assert.equal(state.grantLookups, 0);
});

test("teacher creation access attaches a valid teacher grant", async () => {
  const grant = createGrant();
  const { db } = createAuthorizationDb({ grants: [grant] });
  const req = createRequest(createAuth(UserRole.TEACHER, { profileId: teacherOneId }));
  const result = await invoke(
    requireRoleOrTeacherPermission(
      [UserRole.SUPER_ADMIN, UserRole.ADMIN],
      TeacherPermission.CREATE_TEACHER,
      { db: db as never, now: () => new Date("2026-07-26T00:00:00.000Z") },
    ),
    req,
  );

  assert.equal(result.error, undefined);
  assert.equal(req.permissionGrant?.id, grant.id);
});

test("teacher creation access rejects students and parents", async () => {
  const { db } = createAuthorizationDb();
  const middleware = requireRoleOrTeacherPermission(
    [UserRole.SUPER_ADMIN, UserRole.ADMIN],
    TeacherPermission.CREATE_TEACHER,
    { db: db as never },
  );

  const student = await invoke(middleware, createRequest(createAuth(UserRole.STUDENT)));
  const parent = await invoke(middleware, createRequest(createAuth(UserRole.PARENT, { schoolId: null })));

  assertAppError(student.error, "AUTH_ROLE_FORBIDDEN");
  assertAppError(parent.error, "AUTH_ROLE_FORBIDDEN");
});

test("requireSchoolAccess allows SUPER_ADMIN access to any valid school", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(
      createAuth(UserRole.SUPER_ADMIN, { schoolId: null }),
      { schoolId: schoolTwoId },
    ),
  );

  assert.equal(result.error, undefined);
});

test("requireSchoolAccess allows an ADMIN with null school context to access shared school routes", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.ADMIN, { schoolId: null }), { schoolId: schoolOneId }),
  );

  assert.equal(result.error, undefined);
});

test("requireSchoolAccess allows an ADMIN with school context to access shared school routes", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.ADMIN), { schoolId: schoolOneId }),
  );

  assert.equal(result.error, undefined);
});

test("requireSchoolAccess allows a TEACHER to access their school", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.TEACHER), { schoolId: schoolOneId }),
  );

  assert.equal(result.error, undefined);
});

test("requireSchoolAccess allows a STUDENT to access their school", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.STUDENT), { schoolId: schoolOneId }),
  );

  assert.equal(result.error, undefined);
});

test("requireSchoolAccess rejects an ADMIN accessing another school", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.ADMIN, { schoolId: schoolOneId }), { schoolId: schoolTwoId }),
  );

  assertAppError(result.error, "AUTH_SCHOOL_ACCESS_DENIED");
});

test("requireSchoolAccess never grants broad school access to a PARENT", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(
      createAuth(UserRole.PARENT, { schoolId: null }),
      { schoolId: schoolOneId },
    ),
  );

  assertAppError(result.error, "AUTH_SCHOOL_ACCESS_DENIED");
});

test("requireSchoolAccess rejects malformed school IDs", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.ADMIN), { schoolId: "not-a-uuid" }),
  );

  assertAppError(result.error, "AUTH_INVALID_INPUT", 400);
});

test("requireSchoolAccess rejects missing school IDs as invalid input", async () => {
  const result = await invoke(
    requireSchoolAccess(),
    createRequest(createAuth(UserRole.ADMIN)),
  );

  assertAppError(result.error, "AUTH_INVALID_INPUT", 400);
});

test("requireStudentSelfAccess permits a student accessing their own profile", async () => {
  const result = await invoke(
    requireStudentSelfAccess(),
    createRequest(
      createAuth(UserRole.STUDENT, { profileId: studentOneId }),
      { studentId: studentOneId },
    ),
  );

  assert.equal(result.error, undefined);
});

test("requireStudentSelfAccess rejects a student accessing another profile", async () => {
  const result = await invoke(
    requireStudentSelfAccess(),
    createRequest(
      createAuth(UserRole.STUDENT, { profileId: studentOneId }),
      { studentId: studentTwoId },
    ),
  );

  assertAppError(result.error, "AUTH_OWNER_ACCESS_DENIED");
});

test("requireLinkedChildAccess permits a parent linked to the requested student", async () => {
  const { db } = createAuthorizationDb({ parentLink: { id: "link-1" } });

  const result = await invoke(
    requireLinkedChildAccess({}, { db: db as never }),
    createRequest(createAuth(UserRole.PARENT), { studentId: studentOneId }),
  );

  assert.equal(result.error, undefined);
});

test("requireLinkedChildAccess rejects a parent without a child link", async () => {
  const { db } = createAuthorizationDb({ parentLink: null });

  const result = await invoke(
    requireLinkedChildAccess({}, { db: db as never }),
    createRequest(createAuth(UserRole.PARENT), { studentId: studentOneId }),
  );

  assertAppError(result.error, "AUTH_OWNER_ACCESS_DENIED");
});

test("requireTeacherStudentAccess permits a teacher assigned to the student's class", async () => {
  const { db } = createAuthorizationDb({
    teacherStudent: {
      id: studentOneId,
      schoolId: schoolOneId,
      class: {
        id: "class-1",
        schoolId: schoolOneId,
        teacherId: teacherOneId,
      },
    },
  });

  const result = await invoke(
    requireTeacherStudentAccess({}, { db: db as never }),
    createRequest(
      createAuth(UserRole.TEACHER, { profileId: teacherOneId }),
      { studentId: studentOneId },
    ),
  );

  assert.equal(result.error, undefined);
});

test("requireTeacherStudentAccess permits a same-school teacher outside the student's class", async () => {
  const { db } = createAuthorizationDb({
    teacherStudent: {
      id: studentOneId,
      schoolId: schoolOneId,
      class: {
        id: "class-1",
        schoolId: schoolOneId,
        teacherId: teacherTwoId,
      },
    },
  });

  const result = await invoke(
    requireTeacherStudentAccess({}, { db: db as never }),
    createRequest(
      createAuth(UserRole.TEACHER, { profileId: teacherOneId }),
      { studentId: studentOneId },
    ),
  );

  assert.equal(result.error, undefined);
});

test("requireTeacherStudentAccess rejects a teacher accessing a cross-school student", async () => {
  const { db } = createAuthorizationDb({
    teacherStudent: {
      id: studentOneId,
      schoolId: schoolTwoId,
      class: {
        id: "class-2",
        schoolId: schoolTwoId,
        teacherId: teacherOneId,
      },
    },
  });

  const result = await invoke(
    requireTeacherStudentAccess({}, { db: db as never }),
    createRequest(
      createAuth(UserRole.TEACHER, { profileId: teacherOneId }),
      { studentId: studentOneId },
    ),
  );

  assertAppError(result.error, "AUTH_OWNER_ACCESS_DENIED");
});

test("ownership middleware honors explicit bypass roles only", async () => {
  const { db } = createAuthorizationDb({ parentLink: null });

  const result = await invoke(
    requireLinkedChildAccess(
      { bypassRoles: [UserRole.SUPER_ADMIN] },
      { db: db as never },
    ),
    createRequest(
      createAuth(UserRole.SUPER_ADMIN, { schoolId: null }),
      { studentId: studentTwoId },
    ),
  );

  assert.equal(result.error, undefined);
});
