import assert from "node:assert/strict";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
  hashPasswordResetToken,
  login,
  requestPasswordReset,
  resetPassword,
  sendPasswordResetEmail,
} from "../src/services/auth.service.js";

type MockUser = {
  id: string;
  role: UserRole;
  email: string | null;
  passwordHash: string | null;
  accountStatus: AccountStatus;
  isFirstLogin: boolean;
  lastLogin?: Date | null;
  setupToken?: string | null;
  setupTokenExpiry?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  admin?: { id: string; fullName: string; schoolId: string | null } | null;
  teacher?: { id: string; fullName: string; schoolId: string } | null;
  parent?: { id: string; fullName: string } | null;
};

function createUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-1",
    role: UserRole.ADMIN,
    email: "admin@example.com",
    passwordHash: "hash:OldPass@123",
    accountStatus: AccountStatus.ACTIVE,
    isFirstLogin: false,
    lastLogin: null,
    setupToken: null,
    setupTokenExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    admin: { id: "admin-1", fullName: "Puan Kavitha", schoolId: null },
    teacher: null,
    parent: null,
    ...overrides,
  };
}

function createMockDb(users: MockUser[]) {
  const state = {
    users: new Map(users.map((user) => [user.id, user])),
    updates: [] as Array<Record<string, unknown>>,
  };

  const db = {
    user: {
      findUnique: async (args: Record<string, unknown>) => {
        const where = args.where as Record<string, unknown> | undefined;
        if (!where) return null;

        if (typeof where.email === "string") {
          return [...state.users.values()].find((user) => user.email === where.email) ?? null;
        }

        if (typeof where.passwordResetToken === "string") {
          return [...state.users.values()].find((user) => user.passwordResetToken === where.passwordResetToken) ?? null;
        }

        if (typeof where.id === "string") {
          return state.users.get(where.id) ?? null;
        }

        return null;
      },
      update: async (args: Record<string, unknown>) => {
        state.updates.push(args);
        const where = args.where as Record<string, unknown> | undefined;
        const data = args.data as Partial<MockUser> | undefined;
        const id = typeof where?.id === "string" ? where.id : "";
        const current = state.users.get(id);
        if (!current) throw new Error("User not found.");
        const next = { ...current, ...data };
        state.users.set(id, next);
        return next;
      },
    },
    teacher: {
      findMany: async () => [],
    },
    parent: {
      findFirst: async () => null,
    },
  };

  return { db, state };
}

const fixedNow = new Date("2026-08-02T12:00:00.000Z");
const later = new Date("2026-08-02T12:05:00.000Z");

function hashToken(token: string): string {
  return `hash-token:${token}`;
}

test("forgot-password returns a generic response and sends email only for eligible accounts", async () => {
  const { db, state } = createMockDb([createUser()]);
  const sent: Array<{ rawToken: string; email: string }> = [];

  const result = await requestPasswordReset(
    { email: " ADMIN@EXAMPLE.COM " },
    {
      db: db as never,
      now: () => fixedNow,
      rawTokenGenerator: () => "raw-reset-token",
      hashResetToken: hashToken,
      emailDispatcher: (input) => {
        sent.push({ rawToken: input.rawToken, email: input.email });
        return true;
      },
    },
  );

  const user = state.users.get("user-1");
  assert.equal(result.message, PASSWORD_RESET_GENERIC_MESSAGE);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.rawToken, "raw-reset-token");
  assert.equal(sent[0]?.email, "admin@example.com");
  assert.equal(user?.passwordResetToken, "hash-token:raw-reset-token");
  assert.notEqual(user?.passwordResetToken, "raw-reset-token");
  assert.equal(user?.passwordResetExpiry?.toISOString(), "2026-08-02T12:30:00.000Z");
});

test("unknown, student, suspended, and archived accounts receive the same generic forgot-password response without email", async () => {
  for (const user of [
    null,
    createUser({ id: "student-user", role: UserRole.STUDENT, email: "student@example.com", passwordHash: null, admin: null }),
    createUser({ id: "suspended-user", email: "suspended@example.com", accountStatus: AccountStatus.SUSPENDED }),
    createUser({ id: "archived-user", email: "archived@example.com", accountStatus: AccountStatus.ARCHIVED }),
  ]) {
    const { db, state } = createMockDb(user ? [user] : []);
    let sent = false;
    const email = user?.email ?? "unknown@example.com";

    const result = await requestPasswordReset(
      { email },
      {
        db: db as never,
        rawTokenGenerator: () => "raw-reset-token",
        hashResetToken: hashToken,
        emailDispatcher: () => {
          sent = true;
          return true;
        },
      },
    );

    assert.equal(result.message, PASSWORD_RESET_GENERIC_MESSAGE);
    assert.equal(sent, false);
    assert.equal(state.updates.length, 0);
  }
});

test("a second forgot-password request replaces the previous hashed reset token", async () => {
  const { db, state } = createMockDb([
    createUser({
      passwordResetToken: "old-token-hash",
      passwordResetExpiry: new Date("2026-08-02T12:10:00.000Z"),
    }),
  ]);
  let counter = 0;

  await requestPasswordReset(
    { email: "admin@example.com" },
    {
      db: db as never,
      now: () => fixedNow,
      rawTokenGenerator: () => `raw-token-${counter += 1}`,
      hashResetToken: hashToken,
      emailDispatcher: () => true,
    },
  );
  await requestPasswordReset(
    { email: "admin@example.com" },
    {
      db: db as never,
      now: () => later,
      rawTokenGenerator: () => `raw-token-${counter += 1}`,
      hashResetToken: hashToken,
      emailDispatcher: () => true,
    },
  );

  const user = state.users.get("user-1");
  assert.equal(user?.passwordResetToken, "hash-token:raw-token-2");
  assert.notEqual(user?.passwordResetToken, "old-token-hash");
  assert.equal(user?.passwordResetExpiry?.toISOString(), "2026-08-02T12:35:00.000Z");
});

test("email delivery failure clears the generated reset token and still returns the generic response", async () => {
  const { db, state } = createMockDb([createUser()]);

  const result = await requestPasswordReset(
    { email: "admin@example.com" },
    {
      db: db as never,
      now: () => fixedNow,
      rawTokenGenerator: () => "raw-reset-token",
      hashResetToken: hashToken,
      emailDispatcher: () => false,
    },
  );

  const user = state.users.get("user-1");
  assert.equal(result.message, PASSWORD_RESET_GENERIC_MESSAGE);
  assert.equal(user?.passwordResetToken, null);
  assert.equal(user?.passwordResetExpiry, null);
});

test("valid reset token changes the password hash and clears reset state", async () => {
  const { db, state } = createMockDb([
    createUser({
      passwordResetToken: "hash-token:raw-reset-token",
      passwordResetExpiry: new Date("2026-08-02T12:30:00.000Z"),
    }),
  ]);

  const result = await resetPassword(
    {
      token: "raw-reset-token",
      password: "NewPass@123",
      confirmPassword: "NewPass@123",
    },
    {
      db: db as never,
      now: () => fixedNow,
      hashResetToken: hashToken,
      hashNewPassword: async (password) => `hash:${password}`,
    },
  );

  const user = state.users.get("user-1");
  assert.equal(result.message, PASSWORD_RESET_SUCCESS_MESSAGE);
  assert.equal(user?.passwordHash, "hash:NewPass@123");
  assert.equal(user?.passwordResetToken, null);
  assert.equal(user?.passwordResetExpiry, null);
  assert.equal(user?.role, UserRole.ADMIN);
  assert.equal(user?.admin?.fullName, "Puan Kavitha");
});

test("reset token cannot be reused", async () => {
  const { db } = createMockDb([
    createUser({
      passwordResetToken: "hash-token:raw-reset-token",
      passwordResetExpiry: new Date("2026-08-02T12:30:00.000Z"),
    }),
  ]);
  const deps = {
    db: db as never,
    now: () => fixedNow,
    hashResetToken: hashToken,
    hashNewPassword: async (password: string) => `hash:${password}`,
  };

  await resetPassword({ token: "raw-reset-token", password: "NewPass@123", confirmPassword: "NewPass@123" }, deps);

  await assert.rejects(
    resetPassword({ token: "raw-reset-token", password: "NewPass@123", confirmPassword: "NewPass@123" }, deps),
    (error: unknown) => error instanceof AppError && error.code === "PASSWORD_RESET_TOKEN_INVALID",
  );
});

test("expired and invalid reset tokens are rejected", async () => {
  const { db, state } = createMockDb([
    createUser({
      passwordResetToken: "hash-token:expired-token",
      passwordResetExpiry: new Date("2026-08-02T11:59:00.000Z"),
    }),
  ]);

  await assert.rejects(
    resetPassword(
      { token: "expired-token", password: "NewPass@123", confirmPassword: "NewPass@123" },
      {
        db: db as never,
        now: () => fixedNow,
        hashResetToken: hashToken,
      },
    ),
    (error: unknown) => error instanceof AppError && error.code === "PASSWORD_RESET_TOKEN_EXPIRED",
  );

  assert.equal(state.users.get("user-1")?.passwordResetToken, null);

  await assert.rejects(
    resetPassword(
      { token: "missing-token", password: "NewPass@123", confirmPassword: "NewPass@123" },
      {
        db: db as never,
        now: () => fixedNow,
        hashResetToken: hashToken,
      },
    ),
    (error: unknown) => error instanceof AppError && error.code === "PASSWORD_RESET_TOKEN_INVALID",
  );
});

test("reset password mismatch and password policy failures use safe error codes", async () => {
  const { db } = createMockDb([createUser()]);

  await assert.rejects(
    resetPassword(
      { token: "raw-reset-token", password: "NewPass@123", confirmPassword: "OtherPass@123" },
      { db: db as never, hashResetToken: hashToken },
    ),
    (error: unknown) => error instanceof AppError && error.code === "PASSWORD_RESET_PASSWORD_MISMATCH",
  );

  await assert.rejects(
    resetPassword(
      { token: "raw-reset-token", password: "weak", confirmPassword: "weak" },
      { db: db as never, hashResetToken: hashToken },
    ),
    (error: unknown) => error instanceof AppError && error.code === "PASSWORD_RESET_PASSWORD_INVALID",
  );
});

test("unavailable account with a token is rejected and reset state is cleared", async () => {
  const { db, state } = createMockDb([
    createUser({
      accountStatus: AccountStatus.SUSPENDED,
      passwordResetToken: "hash-token:raw-reset-token",
      passwordResetExpiry: new Date("2026-08-02T12:30:00.000Z"),
    }),
  ]);

  await assert.rejects(
    resetPassword(
      { token: "raw-reset-token", password: "NewPass@123", confirmPassword: "NewPass@123" },
      { db: db as never, now: () => fixedNow, hashResetToken: hashToken },
    ),
    (error: unknown) => error instanceof AppError && error.code === "PASSWORD_RESET_ACCOUNT_UNAVAILABLE",
  );

  assert.equal(state.users.get("user-1")?.passwordResetToken, null);
  assert.equal(state.users.get("user-1")?.passwordResetExpiry, null);
});

test("old password no longer authenticates while new password does after reset", async () => {
  const { db } = createMockDb([
    createUser({
      passwordResetToken: "hash-token:raw-reset-token",
      passwordResetExpiry: new Date("2026-08-02T12:30:00.000Z"),
    }),
  ]);

  await resetPassword(
    { token: "raw-reset-token", password: "NewPass@123", confirmPassword: "NewPass@123" },
    {
      db: db as never,
      now: () => fixedNow,
      hashResetToken: hashToken,
      hashNewPassword: async (password) => `hash:${password}`,
    },
  );

  await assert.rejects(
    login(
      { role: UserRole.ADMIN, loginId: "admin@example.com", password: "OldPass@123" },
      {
        db: db as never,
        comparePassword: async (password, hash) => hash === `hash:${password}`,
        signAccessToken: () => "token",
        accessTokenExpiresIn: "15m",
        now: () => fixedNow,
      },
    ),
    (error: unknown) => error instanceof AppError && error.code === "AUTH_INVALID_CREDENTIALS",
  );

  const result = await login(
    { role: UserRole.ADMIN, loginId: "admin@example.com", password: "NewPass@123" },
    {
      db: db as never,
      comparePassword: async (password, hash) => hash === `hash:${password}`,
      signAccessToken: () => "token",
      accessTokenExpiresIn: "15m",
      now: () => fixedNow,
    },
  );

  assert.equal(result.accessToken, "token");
});

test("SHA-256 reset token hashing is deterministic and does not store the raw token", () => {
  const rawToken = "raw-token-value";
  const hashed = hashPasswordResetToken(rawToken);

  assert.equal(hashed, hashPasswordResetToken(rawToken));
  assert.notEqual(hashed, rawToken);
  assert.match(hashed, /^[a-f0-9]{64}$/);
});

test("password reset email logging excludes raw token and full reset URL", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalEmailFrom = process.env.EMAIL_FROM;
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const infoLogs: unknown[] = [];
  const originalInfo = console.info;

  process.env.RESEND_API_KEY = "test_resend_key";
  process.env.EMAIL_FROM = "Digital MoLIB <noreply@main-lit.com>";
  process.env.FRONTEND_URL = "https://www.main-lit.com";
  console.info = (...args: unknown[]) => {
    infoLogs.push(args);
  };
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "provider-id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const delivered = await sendPasswordResetEmail({
      userId: "user-1",
      email: "admin@example.com",
      displayName: "Puan Kavitha",
      rawToken: "raw-secret-token",
      expiresAt: new Date("2026-08-02T12:30:00.000Z"),
    });

    const serializedLogs = JSON.stringify(infoLogs);
    assert.equal(delivered, true);
    assert.doesNotMatch(serializedLogs, /raw-secret-token|reset-password\?token|test_resend_key/i);
  } finally {
    globalThis.fetch = originalFetch;
    console.info = originalInfo;
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.EMAIL_FROM = originalEmailFrom;
    process.env.FRONTEND_URL = originalFrontendUrl;
  }
});
