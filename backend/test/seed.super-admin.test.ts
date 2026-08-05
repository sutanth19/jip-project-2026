import assert from "node:assert/strict";
import test from "node:test";

import { readSuperAdminSeedConfig, requireEnv, seedSuperAdmin } from "../src/prisma/seed.js";

type SeedTransaction = {
  user: {
    upsert: (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<{ id: string }>;
  };
  admin: {
    upsert: (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => Promise<{ userId: string }>;
  };
};

test("super admin seed reads the explicit environment variables", () => {
  const config = readSuperAdminSeedConfig({
    SEED_SUPER_ADMIN_EMAIL: " superadmin@digitalmolib.edu.my ",
    SEED_SUPER_ADMIN_PASSWORD: " Admin@123 ",
    SEED_SUPER_ADMIN_NAME: " System Super Admin ",
  });

  assert.equal(config.email, "superadmin@digitalmolib.edu.my");
  assert.equal(config.password, "Admin@123");
  assert.equal(config.fullName, "System Super Admin");
});

test("super admin seed rejects missing environment variables", () => {
  assert.throws(() => requireEnv("SEED_SUPER_ADMIN_EMAIL", undefined), /Missing required environment variable/);
});

test("super admin seed is idempotent and keeps first-login policy intact", async () => {
  const state = {
    user: null as null | {
      id: string;
      email: string;
      role: string;
      passwordHash: string;
      accountStatus: string;
      isFirstLogin: boolean;
      setupToken: string | null;
      setupTokenExpiry: Date | null;
      passwordResetToken: string | null;
      passwordResetExpiry: Date | null;
    },
    admin: null as null | { userId: string; fullName: string; position: string | null; schoolId: string | null },
    userUpsertCount: 0,
    adminUpsertCount: 0,
  };

  const mockPrisma = {
    $transaction: async (callback: (tx: SeedTransaction) => Promise<void>) => callback({
      user: {
        upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
          state.userUpsertCount += 1;
          state.user = {
            id: state.user?.id ?? "user-1",
            email: String((update.email ?? create.email) as string),
            role: String((update.role ?? create.role) as string),
            passwordHash: String((update.passwordHash ?? create.passwordHash) as string),
            accountStatus: String((update.accountStatus ?? create.accountStatus) as string),
            isFirstLogin: Boolean((update.isFirstLogin ?? create.isFirstLogin) as boolean),
            setupToken: null,
            setupTokenExpiry: null,
            passwordResetToken: null,
            passwordResetExpiry: null,
          };
          return state.user;
        },
      },
      admin: {
        upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
          state.adminUpsertCount += 1;
          state.admin = {
            userId: String((update.userId ?? create.userId) as string),
            fullName: String((update.fullName ?? create.fullName) as string),
            position: String((update.position ?? create.position) as string),
            schoolId: (update.schoolId ?? create.schoolId) as string | null,
          };
          return state.admin;
        },
      },
    }),
  };

  const config = {
    email: "superadmin@digitalmolib.edu.my",
    password: "Admin@123",
    fullName: "System Super Admin",
  };

  await seedSuperAdmin(config, {
    prisma: mockPrisma as never,
    hashPassword: async (password: string) => `hashed:${password}`,
  });

  await seedSuperAdmin(config, {
    prisma: mockPrisma as never,
    hashPassword: async (password: string) => `hashed:${password}`,
  });

  assert.equal(state.userUpsertCount, 2);
  assert.equal(state.adminUpsertCount, 2);
  assert.equal(state.user?.role, "SUPER_ADMIN");
  assert.equal(state.user?.accountStatus, "ACTIVE");
  assert.equal(state.user?.isFirstLogin, true);
  assert.equal(state.user?.setupToken, null);
  assert.equal(state.user?.passwordResetToken, null);
  assert.equal(state.admin?.fullName, "System Super Admin");
});
