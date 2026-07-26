import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  changeFirstPassword,
  type AuthSession,
} from "../src/services/auth.service.js";
import type { AccessTokenPayload } from "../src/utils/jwt.js";

interface MockUserRecord {
  id: string;
  role: UserRole;
  email: string | null;
  passwordHash: string | null;
  accountStatus: AccountStatus;
  isFirstLogin: boolean;
  setupToken: string | null;
  setupTokenExpiry: Date | null;
  passwordResetToken: string | null;
  passwordResetExpiry: Date | null;
  admin?: {
    id: string;
    fullName: string;
    schoolId: string | null;
  } | null;
  teacher?: {
    id: string;
    fullName: string;
    schoolId: string;
  } | null;
  parent?: {
    id: string;
    fullName: string;
  } | null;
}

interface MockState {
  currentUser: MockUserRecord | null;
  findUniqueArgs?: Record<string, unknown>;
  updateArgs?: Record<string, unknown>;
}

function createMockDb(initialUser: MockUserRecord | null) {
  const state: MockState = {
    currentUser: initialUser,
  };

  const db = {
    user: {
      findUnique: async (args: Record<string, unknown>) => {
        state.findUniqueArgs = args;
        return state.currentUser;
      },
      update: async (args: Record<string, unknown>) => {
        state.updateArgs = args;

        if (!state.currentUser) {
          throw new Error("No user loaded.");
        }

        const data = (args.data ?? {}) as Record<string, unknown>;

        state.currentUser = {
          ...state.currentUser,
          passwordHash:
            typeof data.passwordHash === "string"
              ? data.passwordHash
              : state.currentUser.passwordHash,
          isFirstLogin:
            typeof data.isFirstLogin === "boolean"
              ? data.isFirstLogin
              : state.currentUser.isFirstLogin,
          setupToken:
            data.setupToken === null
              ? null
              : state.currentUser.setupToken,
          setupTokenExpiry:
            data.setupTokenExpiry === null
              ? null
              : state.currentUser.setupTokenExpiry,
          passwordResetToken:
            data.passwordResetToken === null
              ? null
              : state.currentUser.passwordResetToken,
          passwordResetExpiry:
            data.passwordResetExpiry === null
              ? null
              : state.currentUser.passwordResetExpiry,
        };

        return state.currentUser;
      },
    },
  };

  return {
    db,
    state,
  };
}

const fixedAuth: AuthSession = {
  userId: "user-1",
  role: UserRole.SUPER_ADMIN,
  profileId: "admin-1",
  schoolId: null,
  isFirstLogin: true,
};

const fixedTeacherAuth: AuthSession = {
  userId: "teacher-user-1",
  role: UserRole.TEACHER,
  profileId: "teacher-1",
  schoolId: "school-1",
  isFirstLogin: true,
};

const accessTokenExpiresIn = "15m";

function signAccessToken(payload: AccessTokenPayload): string {
  return `token:${payload.sub}:${payload.isFirstLogin}`;
}

test("valid first-login password change returns replacement token", async () => {
  const { db, state } = createMockDb({
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: "setup-token",
    setupTokenExpiry: new Date("2026-07-25T00:00:00.000Z"),
    passwordResetToken: "reset-token",
    passwordResetExpiry: new Date("2026-07-25T00:00:00.000Z"),
    admin: {
      id: "admin-1",
      fullName: "System Super Admin",
      schoolId: null,
    },
  });

  const result = await changeFirstPassword(
    {
      auth: fixedAuth,
      currentPassword: "Admin@12345",
      newPassword: "NewAdmin@12345",
      confirmPassword: "NewAdmin@12345",
    },
    {
      db: db as never,
      comparePassword: async (currentPassword, passwordHash) =>
        currentPassword === "Admin@12345" && passwordHash === "hashed-current",
      hashNewPassword: async (password) => `hashed:${password}`,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal(result.accessToken, "token:user-1:false");
  assert.equal(result.expiresIn, accessTokenExpiresIn);
  assert.equal(result.requiresPasswordChange, false);
  assert.deepEqual(result.user, {
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: false,
  });
  assert.equal("passwordHash" in result.user, false);
  assert.equal(state.updateArgs?.data && typeof state.updateArgs.data === "object", true);
  assert.equal(state.currentUser?.passwordHash, "hashed:NewAdmin@12345");
  assert.equal(state.currentUser?.isFirstLogin, false);
  assert.equal(state.currentUser?.setupToken, null);
  assert.equal(state.currentUser?.setupTokenExpiry, null);
  assert.equal(state.currentUser?.passwordResetToken, null);
  assert.equal(state.currentUser?.passwordResetExpiry, null);
});

test("wrong current password is rejected", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: {
      id: "admin-1",
      fullName: "System Super Admin",
      schoolId: null,
    },
  });

  await assert.rejects(
    changeFirstPassword(
      {
        auth: fixedAuth,
        currentPassword: "Wrong@123",
        newPassword: "NewAdmin@12345",
        confirmPassword: "NewAdmin@12345",
      },
      {
        db: db as never,
        comparePassword: async () => false,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_CURRENT_PASSWORD_INVALID" &&
      error.statusCode === 401,
  );
});

test("confirmation mismatch is rejected", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: {
      id: "admin-1",
      fullName: "System Super Admin",
      schoolId: null,
    },
  });

  await assert.rejects(
    changeFirstPassword(
      {
        auth: fixedAuth,
        currentPassword: "Admin@12345",
        newPassword: "NewAdmin@12345",
        confirmPassword: "Different@12345",
      },
      {
        db: db as never,
        comparePassword: async () => true,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_PASSWORD_CONFIRMATION_MISMATCH" &&
      error.statusCode === 400,
  );
});

test("reusing the current password is rejected", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: {
      id: "admin-1",
      fullName: "System Super Admin",
      schoolId: null,
    },
  });

  await assert.rejects(
    changeFirstPassword(
      {
        auth: fixedAuth,
        currentPassword: "Admin@12345",
        newPassword: "Admin@12345",
        confirmPassword: "Admin@12345",
      },
      {
        db: db as never,
        comparePassword: async () => true,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_PASSWORD_REUSE_NOT_ALLOWED" &&
      error.statusCode === 400,
  );
});

test("weak password is rejected", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: {
      id: "admin-1",
      fullName: "System Super Admin",
      schoolId: null,
    },
  });

  await assert.rejects(
    changeFirstPassword(
      {
        auth: fixedAuth,
        currentPassword: "Admin@12345",
        newPassword: "weakpass",
        confirmPassword: "weakpass",
      },
      {
        db: db as never,
        comparePassword: async () => true,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_PASSWORD_POLICY_FAILED" &&
      error.statusCode === 400,
  );
});

test("already completed first login is rejected", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.SUPER_ADMIN,
    email: "superadmin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: false,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: {
      id: "admin-1",
      fullName: "System Super Admin",
      schoolId: null,
    },
  });

  await assert.rejects(
    changeFirstPassword(
      {
        auth: { ...fixedAuth, isFirstLogin: false },
        currentPassword: "Admin@12345",
        newPassword: "NewAdmin@12345",
        confirmPassword: "NewAdmin@12345",
      },
      {
        db: db as never,
        comparePassword: async () => true,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_PASSWORD_CHANGE_NOT_REQUIRED" &&
      error.statusCode === 403,
  );
});

test("student role is rejected", async () => {
  const { db, state } = createMockDb(null);

  await assert.rejects(
    changeFirstPassword(
      {
        auth: {
          userId: "student-user-1",
          role: UserRole.STUDENT,
          profileId: "student-1",
          schoolId: "school-1",
          isFirstLogin: true,
        },
        currentPassword: "123456",
        newPassword: "NewStudent@123",
        confirmPassword: "NewStudent@123",
      },
      {
        db: db as never,
        comparePassword: async () => true,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_STUDENT_PASSWORD_CHANGE_NOT_ALLOWED" &&
      error.statusCode === 400,
  );

  assert.equal(state.findUniqueArgs, undefined);
});

test("non-active account is blocked", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.ADMIN,
    email: "admin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.PENDING,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: {
      id: "admin-1",
      fullName: "School Admin",
      schoolId: "school-1",
    },
  });

  await assert.rejects(
    changeFirstPassword(
      {
        auth: {
          userId: "user-1",
          role: UserRole.ADMIN,
          profileId: "admin-1",
          schoolId: "school-1",
          isFirstLogin: true,
        },
        currentPassword: "Admin@12345",
        newPassword: "NewAdmin@12345",
        confirmPassword: "NewAdmin@12345",
      },
      {
        db: db as never,
        comparePassword: async () => true,
        hashNewPassword: async (password) => `hashed:${password}`,
        signAccessToken,
        accessTokenExpiresIn,
      },
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === "AUTH_ACCOUNT_PENDING" &&
      error.statusCode === 403,
  );
});

test("password hash and first-login flags are updated", async () => {
  const { db, state } = createMockDb({
    id: "user-1",
    role: UserRole.ADMIN,
    email: "admin@digitalmolib.my",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: "setup-token",
    setupTokenExpiry: new Date("2026-07-25T00:00:00.000Z"),
    passwordResetToken: "reset-token",
    passwordResetExpiry: new Date("2026-07-25T00:00:00.000Z"),
    admin: {
      id: "admin-1",
      fullName: "School Admin",
      schoolId: "school-1",
    },
  });

  await changeFirstPassword(
    {
      auth: {
        userId: "user-1",
        role: UserRole.ADMIN,
        profileId: "admin-1",
        schoolId: "school-1",
        isFirstLogin: true,
      },
      currentPassword: "Admin@12345",
      newPassword: "NewAdmin@12345",
      confirmPassword: "NewAdmin@12345",
    },
    {
      db: db as never,
      comparePassword: async () => true,
      hashNewPassword: async (password) => `hashed:${password}`,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal(state.currentUser?.passwordHash, "hashed:NewAdmin@12345");
  assert.equal(state.currentUser?.isFirstLogin, false);
  assert.equal(state.currentUser?.setupToken, null);
  assert.equal(state.currentUser?.setupTokenExpiry, null);
  assert.equal(state.currentUser?.passwordResetToken, null);
  assert.equal(state.currentUser?.passwordResetExpiry, null);
});

test("replacement access token carries isFirstLogin false", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.TEACHER,
    email: "teacher@example.com",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    teacher: {
      id: "teacher-1",
      fullName: "Teacher One",
      schoolId: "school-1",
    },
  });

  let capturedPayload: AccessTokenPayload | null = null;

  await changeFirstPassword(
    {
      auth: fixedTeacherAuth,
      currentPassword: "Password@123",
      newPassword: "TeacherNew@123",
      confirmPassword: "TeacherNew@123",
    },
    {
      db: db as never,
      comparePassword: async () => true,
      hashNewPassword: async (password) => `hashed:${password}`,
      signAccessToken: (payload) => {
        capturedPayload = payload;
        return `token:${payload.sub}:${payload.isFirstLogin}`;
      },
      accessTokenExpiresIn,
    },
  );

  assert.equal(capturedPayload?.isFirstLogin, false);
});

test("password hash is never included in the response", async () => {
  const { db } = createMockDb({
    id: "user-1",
    role: UserRole.PARENT,
    email: "parent@example.com",
    passwordHash: "hashed-current",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: true,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    parent: {
      id: "parent-1",
      fullName: "Parent One",
    },
  });

  const result = await changeFirstPassword(
    {
      auth: {
        userId: "user-1",
        role: UserRole.PARENT,
        profileId: "parent-1",
        schoolId: null,
        isFirstLogin: true,
      },
      currentPassword: "Parent@123",
      newPassword: "ParentNew@123",
      confirmPassword: "ParentNew@123",
    },
    {
      db: db as never,
      comparePassword: async () => true,
      hashNewPassword: async (password) => `hashed:${password}`,
      signAccessToken,
      accessTokenExpiresIn,
    },
  );

  assert.equal("passwordHash" in result.user, false);
});
