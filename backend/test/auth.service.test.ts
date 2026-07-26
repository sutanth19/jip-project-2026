import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import { login } from "../src/services/auth.service.js";

type MockState = {
  userFindUniqueResult: any;
  userUpdateArgs: any;
  teacherFindManyResult: any[];
  parentFindFirstResult: any;
};

function createMockDb(overrides: Partial<MockState> = {}) {
  const state: MockState = {
    userFindUniqueResult: null,
    userUpdateArgs: null,
    teacherFindManyResult: [],
    parentFindFirstResult: null,
    ...overrides,
  };

  const db = {
    user: {
      findUnique: async (_args: unknown) => state.userFindUniqueResult,
      update: async (args: unknown) => {
        state.userUpdateArgs = args;
        return state.userFindUniqueResult;
      },
    },
    teacher: {
      findMany: async (_args: unknown) => state.teacherFindManyResult,
    },
    parent: {
      findFirst: async (_args: unknown) => state.parentFindFirstResult,
    },
  };

  return {
    db,
    state,
  };
}

const fixedNow = new Date("2026-07-25T00:00:00.000Z");
const accessTokenExpiresIn = "15m";

function successSigner(payload: Record<string, unknown>) {
  return `signed:${String(payload.sub)}`;
}

test("valid Super Admin login returns token and profile data", async () => {
  const { db, state } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.SUPER_ADMIN,
      email: "superadmin@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: true,
      admin: {
        id: "admin-1",
        fullName: "System Super Admin",
        schoolId: null,
      },
    },
  });

  const result = await login(
    {
      role: UserRole.SUPER_ADMIN,
      loginId: "superadmin@digitalmolib.my",
      password: "Admin@12345",
      rememberMe: false,
    },
    {
      db: db as any,
      comparePassword: async () => true,
      signAccessToken: successSigner as any,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(result.accessToken, "signed:user-1");
  assert.equal(result.expiresIn, accessTokenExpiresIn);
  assert.equal(result.requiresPasswordChange, true);
  assert.deepEqual(result.user, {
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
  });
  assert.deepEqual(result.profile, {
    id: "admin-1",
    fullName: "System Super Admin",
    schoolId: null,
  });
  assert.ok(state.userUpdateArgs);
  assert.deepEqual(state.userUpdateArgs.data.lastLogin, fixedNow);
});

test("teacher login by email returns the teacher profile", async () => {
  const { db } = createMockDb({
    userFindUniqueResult: {
      id: "teacher-user-1",
      role: UserRole.TEACHER,
      email: "teacher@example.com",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: false,
      teacher: {
        id: "teacher-1",
        fullName: "Teacher One",
        schoolId: "school-1",
      },
    },
  });

  const result = await login(
    {
      role: UserRole.TEACHER,
      loginId: "teacher@example.com",
      password: "Password123!",
      rememberMe: false,
    },
    {
      db: db as any,
      comparePassword: async () => true,
      signAccessToken: successSigner as any,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(result.user.role, UserRole.TEACHER);
  assert.equal(result.profile.id, "teacher-1");
  assert.equal(result.profile.schoolId, "school-1");
});

test("parent login by phone returns the linked parent profile", async () => {
  const { db } = createMockDb({
    parentFindFirstResult: {
      id: "parent-1",
      fullName: "Parent One",
      user: {
        id: "parent-user-1",
        role: UserRole.PARENT,
        email: "parent@example.com",
        passwordHash: "hashed-password",
        accountStatus: AccountStatus.ACTIVE,
        isFirstLogin: false,
      },
    },
  });

  const result = await login(
    {
      role: UserRole.PARENT,
      loginId: "+60 12-345 6789",
      password: "Password123!",
      rememberMe: false,
    },
    {
      db: db as any,
      comparePassword: async () => true,
      signAccessToken: successSigner as any,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal(result.user.role, UserRole.PARENT);
  assert.equal(result.profile.id, "parent-1");
  assert.equal(result.profile.schoolId, null);
});

test("invalid password is rejected", async () => {
  const { db } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.SUPER_ADMIN,
      email: "superadmin@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: false,
      admin: {
        id: "admin-1",
        fullName: "System Super Admin",
        schoolId: null,
      },
    },
  });

  await assert.rejects(
    login(
      {
        role: UserRole.SUPER_ADMIN,
        loginId: "superadmin@digitalmolib.my",
        password: "wrong-password",
        rememberMe: false,
      },
      {
        db: db as any,
        comparePassword: async () => false,
        signAccessToken: successSigner as any,
        accessTokenExpiresIn,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_INVALID_CREDENTIALS" &&
      error.statusCode === 401,
  );
});

test("wrong requested role is rejected", async () => {
  const { db } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.SUPER_ADMIN,
      email: "superadmin@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: false,
      admin: {
        id: "admin-1",
        fullName: "System Super Admin",
        schoolId: null,
      },
    },
  });

  await assert.rejects(
    login(
      {
        role: UserRole.ADMIN,
        loginId: "superadmin@digitalmolib.my",
        password: "Admin@12345",
        rememberMe: false,
      },
      {
        db: db as any,
        comparePassword: async () => true,
        signAccessToken: successSigner as any,
        accessTokenExpiresIn,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_ROLE_MISMATCH" &&
      error.statusCode === 403,
  );
});

test("pending account is blocked", async () => {
  const { db } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.SUPER_ADMIN,
      email: "pending@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.PENDING,
      isFirstLogin: false,
      admin: {
        id: "admin-1",
        fullName: "Pending Admin",
        schoolId: null,
      },
    },
  });

  await assert.rejects(
    login(
      {
        role: UserRole.SUPER_ADMIN,
        loginId: "pending@digitalmolib.my",
        password: "Password123!",
        rememberMe: false,
      },
      {
        db: db as any,
        comparePassword: async () => true,
        signAccessToken: successSigner as any,
        accessTokenExpiresIn,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_ACCOUNT_PENDING" &&
      error.statusCode === 403,
  );
});

test("locked account is blocked", async () => {
  const { db } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.SUPER_ADMIN,
      email: "locked@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.LOCKED,
      isFirstLogin: false,
      admin: {
        id: "admin-1",
        fullName: "Locked Admin",
        schoolId: null,
      },
    },
  });

  await assert.rejects(
    login(
      {
        role: UserRole.SUPER_ADMIN,
        loginId: "locked@digitalmolib.my",
        password: "Password123!",
        rememberMe: false,
      },
      {
        db: db as any,
        comparePassword: async () => true,
        signAccessToken: successSigner as any,
        accessTokenExpiresIn,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_ACCOUNT_LOCKED" &&
      error.statusCode === 403,
  );
});

test("student role is rejected from the password login endpoint", async () => {
  const { db } = createMockDb();

  await assert.rejects(
    login(
      {
        role: UserRole.STUDENT,
        loginId: "student-001",
        password: "Password123!",
        rememberMe: false,
      },
      {
        db: db as any,
        comparePassword: async () => true,
        signAccessToken: successSigner as any,
        accessTokenExpiresIn,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_STUDENT_ENDPOINT_REQUIRED" &&
      error.statusCode === 400,
  );
});

test("passwordHash is not exposed in the login response", async () => {
  const { db } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.SUPER_ADMIN,
      email: "superadmin@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: true,
      admin: {
        id: "admin-1",
        fullName: "System Super Admin",
        schoolId: null,
      },
    },
  });

  const result = await login(
    {
      role: UserRole.SUPER_ADMIN,
      loginId: "superadmin@digitalmolib.my",
      password: "Admin@12345",
      rememberMe: false,
    },
    {
      db: db as any,
      comparePassword: async () => true,
      signAccessToken: successSigner as any,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.equal("passwordHash" in result.user, false);
  assert.equal("passwordHash" in result.profile, false);
});

test("ambiguous teacher ID is not silently matched", async () => {
  const { db } = createMockDb({
    teacherFindManyResult: [
      {
        id: "teacher-1",
        fullName: "Teacher One",
        schoolId: "school-1",
        user: {
          id: "teacher-user-1",
          role: UserRole.TEACHER,
          email: "teacher1@school.test",
          passwordHash: "hashed-password",
          accountStatus: AccountStatus.ACTIVE,
          isFirstLogin: false,
        },
      },
      {
        id: "teacher-2",
        fullName: "Teacher Two",
        schoolId: "school-2",
        user: {
          id: "teacher-user-2",
          role: UserRole.TEACHER,
          email: "teacher2@school.test",
          passwordHash: "hashed-password",
          accountStatus: AccountStatus.ACTIVE,
          isFirstLogin: false,
        },
      },
    ],
  });

  await assert.rejects(
    login(
      {
        role: UserRole.TEACHER,
        loginId: "T-001",
        password: "Password123!",
        rememberMe: false,
      },
      {
        db: db as any,
        comparePassword: async () => true,
        signAccessToken: successSigner as any,
        accessTokenExpiresIn,
        now: () => fixedNow,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_AMBIGUOUS_TEACHER_ID" &&
      error.statusCode === 409,
  );
});

test("lastLogin is updated after successful login", async () => {
  const { db, state } = createMockDb({
    userFindUniqueResult: {
      id: "user-1",
      role: UserRole.ADMIN,
      email: "admin@digitalmolib.my",
      passwordHash: "hashed-password",
      accountStatus: AccountStatus.ACTIVE,
      isFirstLogin: false,
      admin: {
        id: "admin-1",
        fullName: "School Admin",
        schoolId: "school-1",
      },
    },
  });

  await login(
    {
      role: UserRole.ADMIN,
      loginId: "admin@digitalmolib.my",
      password: "Admin@12345",
      rememberMe: false,
    },
    {
      db: db as any,
      comparePassword: async () => true,
      signAccessToken: successSigner as any,
      accessTokenExpiresIn,
      now: () => fixedNow,
    },
  );

  assert.deepEqual(state.userUpdateArgs.data.lastLogin, fixedNow);
});

