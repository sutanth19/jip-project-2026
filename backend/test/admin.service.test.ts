import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { AccountStatus, UserRole } from "@prisma/client";
import { ZodError } from "zod";

import { AppError } from "../src/errors/app-error.js";
import {
  adminSetupEmailTemplate,
  buildAdminSetupUrl,
  createAdmin,
  getAdminById,
  listAdmins,
  resendAdminSetup,
  sendAdminSetupInvitation,
  updateAdmin,
  updateAdminStatus,
  type AdminAccountRecord,
  type AdminAuditContext,
  type AdminListFilters,
  type AdminProvisionInput,
  type AdminRepository,
} from "../src/services/admin.service.js";
import {
  adminIdParamsSchema,
  createAdminSchema,
  listAdminsQuerySchema,
  updateAdminSchema,
  updateAdminStatusSchema,
} from "../src/validators/admin.validator.js";

const adminOneId = "11111111-1111-4111-8111-111111111111";
const adminTwoId = "22222222-2222-4222-8222-222222222222";
const fixedNow = new Date("2026-07-26T00:00:00.000Z");

const auditContext: AdminAuditContext = {
  actor: {
    userId: "33333333-3333-4333-8333-333333333333",
    profileId: "44444444-4444-4444-8444-444444444444",
    role: UserRole.SUPER_ADMIN,
    name: "System Super Admin",
  },
  requestIp: "127.0.0.1",
  userAgent: "node-test",
};

function createRecord(overrides: Partial<AdminAccountRecord> = {}): AdminAccountRecord {
  const record: AdminAccountRecord = {
    id: adminOneId,
    userId: "55555555-5555-4555-8555-555555555555",
    schoolId: null,
    fullName: "Pentadbir IPG",
    phone: "0123456789",
    position: "IPG Administrator",
    avatar: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    user: {
      id: "55555555-5555-4555-8555-555555555555",
      role: UserRole.ADMIN,
      email: "admin@example.com",
      passwordHash: null,
      accountStatus: AccountStatus.PENDING,
      isFirstLogin: true,
      lastLogin: null,
      setupToken: "old-token",
      setupTokenExpiry: new Date("2026-07-27T00:00:00.000Z"),
    },
  };

  return {
    ...record,
    ...overrides,
    user: {
      ...record.user,
      ...(overrides.user ?? {}),
    },
  };
}

function clone(record: AdminAccountRecord): AdminAccountRecord {
  return {
    ...record,
    user: { ...record.user },
  };
}

function createRepository(initialRecords: AdminAccountRecord[] = []) {
  const records = new Map(initialRecords.map((record) => [record.id, clone(record)]));
  let nextId = 10;

  const repository: AdminRepository = {
    async findById(id) {
      const record = records.get(id);
      return record ? clone(record) : null;
    },
    async findByEmail(email) {
      const record = [...records.values()].find((candidate) => candidate.user.email === email);
      return record ? clone(record) : null;
    },
    async create(input: AdminProvisionInput) {
      const id = `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`;
      nextId += 1;
      const record = createRecord({
        id,
        userId: id,
        schoolId: null,
        fullName: input.fullName,
        phone: input.phone,
        position: input.position,
        avatar: input.avatar,
        user: {
          id,
          role: UserRole.ADMIN,
          email: input.email,
          passwordHash: null,
          accountStatus: AccountStatus.PENDING,
          isFirstLogin: true,
          lastLogin: null,
          setupToken: input.setupToken,
          setupTokenExpiry: input.setupTokenExpiry,
        },
      });
      records.set(id, record);
      return clone(record);
    },
    async findMany(filters: AdminListFilters) {
      const search = filters.search?.toLowerCase();
      const filtered = [...records.values()]
        .filter((record) => record.user.role === UserRole.ADMIN)
        .filter((record) => !filters.status || record.user.accountStatus === filters.status)
        .filter((record) => {
          if (!search) return true;
          return [
            record.fullName,
            record.user.email ?? "",
            record.phone ?? "",
            record.position ?? "",
          ].some((value) => value.toLowerCase().includes(search));
        });
      const sorted = filtered.sort((left, right) => {
        const leftValue = filters.sortBy === "email" || filters.sortBy === "accountStatus"
          ? left.user[filters.sortBy]
          : left[filters.sortBy];
        const rightValue = filters.sortBy === "email" || filters.sortBy === "accountStatus"
          ? right.user[filters.sortBy]
          : right[filters.sortBy];
        const comparison = String(leftValue).localeCompare(String(rightValue));
        return filters.sortOrder === "asc" ? comparison : -comparison;
      });
      return sorted.slice(filters.skip, filters.skip + filters.take).map(clone);
    },
    async count(filters) {
      const recordsForCount = await repository.findMany({
        ...filters,
        skip: 0,
        take: Number.MAX_SAFE_INTEGER,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      return recordsForCount.length;
    },
    async updateProfile(id, input) {
      const current = records.get(id);
      if (!current) throw new Error("Missing record.");
      const next: AdminAccountRecord = {
        ...current,
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
        user: {
          ...current.user,
          ...(input.email !== undefined ? { email: input.email } : {}),
        },
        updatedAt: fixedNow,
      };
      records.set(id, next);
      return clone(next);
    },
    async updateStatus(id, status) {
      const current = records.get(id);
      if (!current) throw new Error("Missing record.");
      const next = {
        ...current,
        user: { ...current.user, accountStatus: status },
        updatedAt: fixedNow,
      };
      records.set(id, next);
      return clone(next);
    },
    async refreshSetup(id, setupToken, setupTokenExpiry) {
      const current = records.get(id);
      if (!current) throw new Error("Missing record.");
      const next = {
        ...current,
        user: {
          ...current.user,
          setupToken,
          setupTokenExpiry,
        },
        updatedAt: fixedNow,
      };
      records.set(id, next);
      return clone(next);
    },
  };

  return { repository, records };
}

function assertAppError(error: unknown, code: string, statusCode: number): void {
  assert.ok(error instanceof AppError);
  assert.equal(error.code, code);
  assert.equal(error.statusCode, statusCode);
}

function withEmailEnv(callback: () => Promise<void>): Promise<void> {
  const previous = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  process.env.RESEND_API_KEY = "test_resend_key";
  process.env.EMAIL_FROM = "Digital MoLIB <no-reply@digitalmolib.edu.my>";
  process.env.FRONTEND_URL = "https://app.digitalmolib.test";
  process.env.NODE_ENV = "test";

  return callback().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

async function withProcessEnv<T>(
  overrides: Record<string, string | undefined>,
  callback: () => Promise<T> | T,
): Promise<T> {
  const previous = Object.fromEntries(
    Object.keys(overrides).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function mockFetch(
  handler: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>,
): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("admin provisioning creates a pending system-level ADMIN with a safe response", async () => {
  const { repository, records } = createRepository();
  const auditEvents: unknown[] = [];
  const result = await createAdmin(
    createAdminSchema.parse({
      fullName: " Pentadbir Baharu ",
      email: " ADMIN.BARU@EXAMPLE.COM ",
      phone: "+60 12-345 6789",
    }),
    auditContext,
    {
      repository,
      now: () => fixedNow,
      setupTokenGenerator: () => "secure-test-token",
      invitationDispatcher: () => "DEVELOPMENT_PREVIEW",
      auditDispatcher: (event) => auditEvents.push(event),
    },
  );

  assert.equal(result.admin.email, "admin.baru@example.com");
  assert.equal(result.admin.phone, "0123456789");
  assert.equal(result.admin.schoolId, null);
  assert.equal(result.admin.accountStatus, AccountStatus.PENDING);
  assert.equal(result.admin.isFirstLogin, true);
  assert.equal(result.invitation.status, "DEVELOPMENT_PREVIEW");
  assert.equal("setupToken" in result.admin, false);
  assert.equal("passwordHash" in result.admin, false);
  const stored = [...records.values()][0];
  assert.equal(stored?.user.role, UserRole.ADMIN);
  assert.equal(stored?.user.passwordHash, null);
  assert.equal(stored?.user.setupToken, "secure-test-token");
  assert.equal((auditEvents[0] as { action: string }).action, "ADMIN_CREATED");
});

test("admin setup email builds the real setup URL and Malay email content", () => {
  const setupUrl = buildAdminSetupUrl(
    "safe-token",
    { FRONTEND_URL: "https://app.digitalmolib.test" } as NodeJS.ProcessEnv,
  );
  assert.equal(setupUrl, "https://app.digitalmolib.test/setup-password?token=safe-token");

  const email = adminSetupEmailTemplate({
    fullName: "Pentadbir Baharu",
    setupUrl: setupUrl ?? "",
    expiresAt: new Date("2026-07-27T00:00:00.000Z"),
  });

  assert.equal(email.subject, "Lengkapkan Penyediaan Akaun Digital MoLIB");
  assert.match(email.html, /Lengkapkan Akaun/);
  assert.match(email.html, /https:\/\/app\.digitalmolib\.test\/setup-password\?token=safe-token/);
  assert.match(email.text, /Akaun Admin Digital MoLIB telah dicipta/);
  assert.match(email.text, /abaikan mesej ini/);
});

test("development setup URL builder falls back to localhost only in development", () => {
  const developmentUrl = buildAdminSetupUrl(
    "safe-token",
    { NODE_ENV: "development" } as NodeJS.ProcessEnv,
  );
  const productionUrl = buildAdminSetupUrl(
    "safe-token",
    { NODE_ENV: "production" } as NodeJS.ProcessEnv,
  );

  assert.equal(developmentUrl, "http://localhost:5173/setup-password?token=safe-token");
  assert.equal(productionUrl, null);
});

test("development create response includes developmentSetupUrl without raw token fields", async () => {
  await withProcessEnv({
    NODE_ENV: "development",
    FRONTEND_URL: undefined,
    APP_URL: undefined,
  }, async () => {
    const { repository } = createRepository();
    const result = await createAdmin(
      createAdminSchema.parse({
        fullName: "Pentadbir Pembangunan",
        email: "admin.dev@example.com",
      }),
      auditContext,
      {
        repository,
        now: () => fixedNow,
        setupTokenGenerator: () => "development-create-token",
        invitationDispatcher: () => "FAILED",
        auditDispatcher: () => undefined,
      },
    );

    assert.equal(result.invitation.status, "FAILED");
    assert.equal(
      result.invitation.developmentSetupUrl,
      "http://localhost:5173/setup-password?token=development-create-token",
    );
    assert.equal("setupToken" in result.invitation, false);
    assert.equal("token" in result.invitation, false);
    assert.equal("setupToken" in result.admin, false);
  });
});

test("production create response omits developmentSetupUrl and raw token fields", async () => {
  await withProcessEnv({
    NODE_ENV: "production",
    FRONTEND_URL: "https://app.digitalmolib.test",
  }, async () => {
    const { repository } = createRepository();
    const result = await createAdmin(
      createAdminSchema.parse({
        fullName: "Pentadbir Produksi",
        email: "admin.production@example.com",
      }),
      auditContext,
      {
        repository,
        now: () => fixedNow,
        setupTokenGenerator: () => "production-create-token",
        invitationDispatcher: () => "FAILED",
        auditDispatcher: () => undefined,
      },
    );

    const serialized = JSON.stringify(result);
    assert.equal("developmentSetupUrl" in result.invitation, false);
    assert.equal("setupToken" in result.invitation, false);
    assert.equal("token" in result.invitation, false);
    assert.doesNotMatch(serialized, /production-create-token|setup-password/);
  });
});

test("admin provisioning sends setup email through Resend with safe response fields", async () => {
  await withEmailEnv(async () => {
    const { repository, records } = createRepository();
    const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
    const restoreFetch = mockFetch(async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ id: "email-provider-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const originalInfo = console.info;
    const logs: unknown[] = [];
    console.info = (...args: unknown[]) => { logs.push(args); };

    try {
      const result = await createAdmin(
        createAdminSchema.parse({
          fullName: "Pentadbir Baharu",
          email: "admin.delivery@example.com",
        }),
        auditContext,
        {
          repository,
          now: () => fixedNow,
          setupTokenGenerator: () => "secure-email-token",
          auditDispatcher: () => undefined,
        },
      );

      assert.equal(result.invitation.status, "SENT");
      assert.equal("setupToken" in result.admin, false);
      assert.equal(calls.length, 1);
      assert.equal(String(calls[0]?.input), "https://api.resend.com/emails");
      const body = JSON.parse(String(calls[0]?.init?.body)) as Record<string, string>;
      assert.equal(body.from, "Digital MoLIB <no-reply@digitalmolib.edu.my>");
      assert.equal(body.to, "admin.delivery@example.com");
      assert.equal(body.subject, "Lengkapkan Penyediaan Akaun Digital MoLIB");
      assert.match(body.html, /setup-password\?token=secure-email-token/);
      assert.match(body.text, /Lengkapkan Akaun/);
      assert.equal(records.values().next().value?.user.setupToken, "secure-email-token");
      assert.doesNotMatch(JSON.stringify(result), /secure-email-token/);
      assert.doesNotMatch(JSON.stringify(logs), /secure-email-token|test_resend_key|setup-password/i);
      assert.match(JSON.stringify(logs), /email-provider-id/);
    } finally {
      console.info = originalInfo;
      restoreFetch();
    }
  });
});

test("admin setup email failure returns FAILED without logging secrets or tokens", async () => {
  await withEmailEnv(async () => {
    const restoreFetch = mockFetch(async () => new Response(JSON.stringify({ message: "bad sender" }), { status: 403 }));
    const originalWarn = console.warn;
    const logs: unknown[] = [];
    console.warn = (...args: unknown[]) => { logs.push(args); };

    try {
      const status = await sendAdminSetupInvitation({
        adminId: adminOneId,
        email: "admin.failure@example.com",
        fullName: "Pentadbir Gagal",
        setupToken: "secret-failure-token",
        expiresAt: fixedNow,
      });

      assert.equal(status, "FAILED");
      const serializedLogs = JSON.stringify(logs);
      assert.doesNotMatch(serializedLogs, /secret-failure-token|test_resend_key|setup-password/i);
      assert.match(serializedLogs, /example.com/);
      assert.match(serializedLogs, /RESEND_DELIVERY_FAILED/);
      assert.match(serializedLogs, /403/);
    } finally {
      console.warn = originalWarn;
      restoreFetch();
    }
  });
});

test("production setup email failure logs no setup URL or token", async () => {
  await withProcessEnv({
    NODE_ENV: "production",
    RESEND_API_KEY: "production-resend-key",
    EMAIL_FROM: "Digital MoLIB <no-reply@digitalmolib.edu.my>",
    FRONTEND_URL: "https://app.digitalmolib.test",
  }, async () => {
    const restoreFetch = mockFetch(async () => new Response(JSON.stringify({ message: "bad sender" }), { status: 403 }));
    const originalWarn = console.warn;
    const logs: unknown[] = [];
    console.warn = (...args: unknown[]) => { logs.push(args); };

    try {
      const status = await sendAdminSetupInvitation({
        adminId: adminOneId,
        email: "admin.production.failure@example.com",
        fullName: "Pentadbir Produksi Gagal",
        setupToken: "production-secret-token",
        expiresAt: fixedNow,
      });

      const serializedLogs = JSON.stringify(logs);
      assert.equal(status, "FAILED");
      assert.doesNotMatch(serializedLogs, /production-secret-token|production-resend-key|setup-password/i);
      assert.match(serializedLogs, /example.com/);
      assert.match(serializedLogs, /RESEND_DELIVERY_FAILED/);
    } finally {
      console.warn = originalWarn;
      restoreFetch();
    }
  });
});

test("admin provisioning rejects duplicate email with a stable conflict", async () => {
  const existing = createRecord();
  await assert.rejects(
    createAdmin(
      createAdminSchema.parse({ fullName: "Pentadbir Lain", email: existing.user.email }),
      auditContext,
      { repository: createRepository([existing]).repository },
    ),
    (error: unknown) => {
      assertAppError(error, "ADMIN_EMAIL_EXISTS", 409);
      return true;
    },
  );
});

test("admin list excludes SUPER_ADMIN records and applies search, status, and pagination", async () => {
  const admin = createRecord();
  const suspended = createRecord({
    id: adminTwoId,
    userId: "66666666-6666-4666-8666-666666666666",
    fullName: "Pentadbir Kedua",
    user: {
      ...admin.user,
      id: "66666666-6666-4666-8666-666666666666",
      email: "second@example.com",
      accountStatus: AccountStatus.SUSPENDED,
    },
  });
  const superAdmin = createRecord({
    id: "77777777-7777-4777-8777-777777777777",
    user: { ...admin.user, role: UserRole.SUPER_ADMIN, email: "super@example.com" },
  });
  const result = await listAdmins(
    listAdminsQuerySchema.parse({ search: "pentadbir", status: "SUSPENDED", page: 1, limit: 10 }),
    { repository: createRepository([admin, suspended, superAdmin]).repository },
  );

  assert.equal(result.admins.length, 1);
  assert.equal(result.admins[0]?.id, adminTwoId);
  assert.equal(result.pagination.total, 1);
});

test("admin details derive setup status and never expose sensitive setup fields", async () => {
  const result = await getAdminById(adminOneId, {
    repository: createRepository([createRecord()]).repository,
    now: () => fixedNow,
  });

  assert.equal(result.setupStatus, "PENDING");
  assert.equal("setupToken" in result, false);
  assert.equal("passwordHash" in result, false);
});

test("admin update normalizes email and allows the target's current email", async () => {
  const { repository } = createRepository([createRecord()]);
  const result = await updateAdmin(
    adminOneId,
    updateAdminSchema.parse({ fullName: " Pentadbir Dikemas Kini ", email: " ADMIN@EXAMPLE.COM " }),
    auditContext,
    { repository, now: () => fixedNow },
  );

  assert.equal(result.fullName, "Pentadbir Dikemas Kini");
  assert.equal(result.email, "admin@example.com");
});

test("admin update rejects another account's email and blocks mass assignment in validation", async () => {
  const first = createRecord();
  const second = createRecord({
    id: adminTwoId,
    user: { ...first.user, id: "66666666-6666-4666-8666-666666666666", email: "other@example.com" },
  });
  await assert.rejects(
    updateAdmin(
      adminOneId,
      updateAdminSchema.parse({ email: second.user.email ?? "" }),
      auditContext,
      { repository: createRepository([first, second]).repository },
    ),
    (error: unknown) => {
      assertAppError(error, "ADMIN_EMAIL_EXISTS", 409);
      return true;
    },
  );
  assert.throws(() => updateAdminSchema.parse({ role: "SUPER_ADMIN" }), ZodError);
  assert.throws(() => updateAdminSchema.parse({ schoolId: adminOneId }), ZodError);
  assert.throws(() => updateAdminSchema.parse({ accountStatus: "ACTIVE" }), ZodError);
});

test("admin status policy supports pending activation, suspension, archiving, and restoration", async () => {
  const { repository } = createRepository([createRecord()]);
  await assert.rejects(
    updateAdminStatus(adminOneId, "SUSPENDED", auditContext, { repository }),
    (error: unknown) => {
      assertAppError(error, "ADMIN_STATUS_TRANSITION_INVALID", 403);
      return true;
    },
  );
  const active = await updateAdminStatus(adminOneId, "ACTIVE", auditContext, { repository });
  const suspended = await updateAdminStatus(adminOneId, "SUSPENDED", auditContext, { repository });
  const archived = await updateAdminStatus(adminOneId, "ARCHIVED", auditContext, { repository });
  const restored = await updateAdminStatus(adminOneId, "ACTIVE", auditContext, { repository });

  assert.equal(active.accountStatus, AccountStatus.ACTIVE);
  assert.equal(suspended.accountStatus, AccountStatus.SUSPENDED);
  assert.equal(archived.accountStatus, AccountStatus.ARCHIVED);
  assert.equal(restored.accountStatus, AccountStatus.ACTIVE);
});

test("resending setup invalidates the previous token without exposing the replacement", async () => {
  const { repository, records } = createRepository([createRecord()]);
  const result = await resendAdminSetup(adminOneId, auditContext, {
    repository,
    now: () => fixedNow,
    setupTokenGenerator: () => "fresh-secure-token",
    invitationDispatcher: () => "DEVELOPMENT_PREVIEW",
  });

  assert.equal(result.invitation.status, "DEVELOPMENT_PREVIEW");
  assert.equal("setupToken" in result, false);
  assert.equal(records.get(adminOneId)?.user.setupToken, "fresh-secure-token");
  assert.notEqual(records.get(adminOneId)?.user.setupToken, "old-token");
});

test("development resend response includes a fresh developmentSetupUrl", async () => {
  await withProcessEnv({
    NODE_ENV: "development",
    FRONTEND_URL: "http://localhost:5173",
  }, async () => {
    const { repository, records } = createRepository([createRecord()]);
    const result = await resendAdminSetup(adminOneId, auditContext, {
      repository,
      now: () => fixedNow,
      setupTokenGenerator: () => "fresh-development-token",
      invitationDispatcher: () => "FAILED",
      auditDispatcher: () => undefined,
    });

    assert.equal(result.invitation.status, "FAILED");
    assert.equal(
      result.invitation.developmentSetupUrl,
      "http://localhost:5173/setup-password?token=fresh-development-token",
    );
    assert.equal(records.get(adminOneId)?.user.setupToken, "fresh-development-token");
    assert.notEqual(result.invitation.developmentSetupUrl, "http://localhost:5173/setup-password?token=old-token");
    assert.doesNotMatch(JSON.stringify(result), /old-token/);
    assert.equal("setupToken" in result.invitation, false);
    assert.equal("token" in result.invitation, false);
  });
});

test("production resend response omits developmentSetupUrl and setup tokens", async () => {
  await withProcessEnv({
    NODE_ENV: "production",
    FRONTEND_URL: "https://app.digitalmolib.test",
  }, async () => {
    const { repository } = createRepository([createRecord()]);
    const result = await resendAdminSetup(adminOneId, auditContext, {
      repository,
      now: () => fixedNow,
      setupTokenGenerator: () => "fresh-production-token",
      invitationDispatcher: () => "FAILED",
      auditDispatcher: () => undefined,
    });

    const serialized = JSON.stringify(result);
    assert.equal(result.invitation.status, "FAILED");
    assert.equal("developmentSetupUrl" in result.invitation, false);
    assert.equal("setupToken" in result.invitation, false);
    assert.equal("token" in result.invitation, false);
    assert.doesNotMatch(serialized, /fresh-production-token|setup-password/);
  });
});

test("resending setup sends the fresh token through the default Resend dispatcher", async () => {
  await withEmailEnv(async () => {
    const { repository, records } = createRepository([createRecord()]);
    const bodies: Record<string, string>[] = [];
    const restoreFetch = mockFetch(async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, string>);
      return new Response(JSON.stringify({ id: "resend-provider-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const originalInfo = console.info;
    console.info = () => undefined;

    try {
      const result = await resendAdminSetup(adminOneId, auditContext, {
        repository,
        now: () => fixedNow,
        setupTokenGenerator: () => "fresh-email-token",
        auditDispatcher: () => undefined,
      });

      assert.equal(result.invitation.status, "SENT");
      assert.equal(records.get(adminOneId)?.user.setupToken, "fresh-email-token");
      assert.notEqual(records.get(adminOneId)?.user.setupToken, "old-token");
      assert.equal(bodies.length, 1);
      assert.equal(bodies[0]?.to, "admin@example.com");
      assert.match(bodies[0]?.html ?? "", /setup-password\?token=fresh-email-token/);
      assert.doesNotMatch(JSON.stringify(result), /fresh-email-token/);
    } finally {
      console.info = originalInfo;
      restoreFetch();
    }
  });
});

test("resend setup controller does not claim email delivery when provider status failed", () => {
  const controller = readFileSync(new URL("../src/controllers/admin.controller.ts", import.meta.url), "utf8");

  assert.match(controller, /result\.invitation\.status === "SENT"/);
  assert.match(controller, /Jemputan persediaan pentadbir berjaya dihantar semula\./);
  assert.match(controller, /E-mel penyediaan tidak dapat dihantar\. Sila cuba lagi\./);
});

test("resending setup rejects completed and archived admin accounts", async () => {
  const completed = createRecord({
    user: {
      ...createRecord().user,
      passwordHash: "hashed-password",
      isFirstLogin: false,
      accountStatus: AccountStatus.ACTIVE,
    },
  });
  await assert.rejects(
    resendAdminSetup(adminOneId, auditContext, { repository: createRepository([completed]).repository }),
    (error: unknown) => {
      assertAppError(error, "ADMIN_SETUP_ALREADY_COMPLETED", 409);
      return true;
    },
  );
  const archived = createRecord({
    user: { ...createRecord().user, accountStatus: AccountStatus.ARCHIVED },
  });
  await assert.rejects(
    resendAdminSetup(adminOneId, auditContext, { repository: createRepository([archived]).repository }),
    (error: unknown) => {
      assertAppError(error, "ADMIN_SETUP_RESEND_NOT_ALLOWED", 403);
      return true;
    },
  );
});

test("admin audit events retain actor and target IDs while excluding secrets", async () => {
  const events: unknown[] = [];
  const { repository } = createRepository([createRecord()]);
  await updateAdmin(
    adminOneId,
    updateAdminSchema.parse({ position: "Ketua Pentadbir" }),
    auditContext,
    { repository, auditDispatcher: (event) => events.push(event), now: () => fixedNow },
  );
  const serialized = JSON.stringify(events[0]);
  assert.match(serialized, /ADMIN_UPDATED/);
  assert.match(serialized, /33333333-3333-4333-8333-333333333333/);
  assert.match(serialized, new RegExp(adminOneId));
  assert.doesNotMatch(serialized, /old-token|passwordHash|setupToken|resetToken/i);
});

test("admin validators reject malformed IDs, invalid phone values, and unknown status transitions", () => {
  assert.throws(() => adminIdParamsSchema.parse({ adminId: "not-a-uuid" }), ZodError);
  assert.throws(
    () => createAdminSchema.parse({ fullName: "Pentadbir", email: "admin@example.com", phone: "invalid" }),
    ZodError,
  );
  assert.throws(() => updateAdminStatusSchema.parse({ status: "LOCKED" }), ZodError);
  assert.throws(() => listAdminsQuerySchema.parse({ sortBy: "passwordHash" }), ZodError);
});
