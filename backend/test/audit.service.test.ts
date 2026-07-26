import assert from "node:assert/strict";
import test from "node:test";

import { UserRole } from "@prisma/client";

import { AppError } from "../src/errors/app-error.js";
import {
  getAuditLogById,
  listAuditLogs,
  recordAuditEvent,
  sanitizeAuditData,
  type AuditEvent,
  type AuditLogFilters,
  type AuditLogRecord,
  type AuditLogRepository,
  type ListAuditLogsQuery,
} from "../src/services/audit.service.js";
import { auditLogIdParamsSchema, listAuditLogsQuerySchema } from "../src/validators/audit.validator.js";

const now = new Date("2026-07-26T00:00:00.000Z");
const actorUserId = "11111111-1111-4111-8111-111111111111";
const schoolId = "22222222-2222-4222-8222-222222222222";

function event(action: AuditEvent["action"] = "SCHOOL_UPDATED", resourceType: AuditEvent["resourceType"] = "SCHOOL"): AuditEvent {
  return { actorUserId, actorProfileId: "33333333-3333-4333-8333-333333333333", actorRole: UserRole.SUPER_ADMIN, actorName: "Puan Sistem", action, resourceType, resourceId: schoolId, schoolId, before: { accountStatus: "ACTIVE" }, after: { accountStatus: "SUSPENDED" }, timestamp: now, requestIp: "127.0.0.1", userAgent: "audit-test" };
}

function repository(initial: AuditLogRecord[] = []): AuditLogRepository & { records: AuditLogRecord[] } {
  const records = [...initial];
  const matches = (record: AuditLogRecord, filters: AuditLogFilters) => {
    if (filters.action && record.action !== filters.action) return false;
    if (filters.resourceType && record.resourceType !== filters.resourceType) return false;
    if (filters.resourceId && record.resourceId !== filters.resourceId) return false;
    if (filters.actorUserId && record.actorUserId !== filters.actorUserId) return false;
    if (filters.actorRole && record.actorRole !== filters.actorRole) return false;
    if (filters.schoolId && record.schoolId !== filters.schoolId) return false;
    if (filters.restrictedToSuperAdmin !== undefined && record.restrictedToSuperAdmin !== filters.restrictedToSuperAdmin) return false;
    if (filters.dateFrom && record.createdAt < filters.dateFrom) return false;
    if (filters.dateTo && record.createdAt > filters.dateTo) return false;
    if (filters.search) {
      const query = filters.search.toLowerCase();
      if (![record.actorName, record.action, record.resourceType, record.resourceId, record.requestId].some((value) => value?.toLowerCase().includes(query))) return false;
    }
    return true;
  };
  return {
    records,
    async create(data) {
      const record: AuditLogRecord = { ...data, id: `00000000-0000-4000-8000-${String(records.length + 1).padStart(12, "0")}`, createdAt: now };
      records.push(record);
      return record;
    },
    async findMany(filters, options) {
      const filtered = records.filter((record) => matches(record, filters)).sort((left, right) => options.sortOrder === "asc" ? left.createdAt.getTime() - right.createdAt.getTime() : right.createdAt.getTime() - left.createdAt.getTime());
      return filtered.slice(options.skip, options.skip + options.take);
    },
    async count(filters) { return records.filter((record) => matches(record, filters)).length; },
    async findById(id) { return records.find((record) => record.id === id) ?? null; },
  };
}

function query(overrides: Partial<ListAuditLogsQuery> = {}): ListAuditLogsQuery {
  return { page: 1, limit: 20, sortOrder: "desc", ...overrides };
}

test("audit persistence stores actor snapshot, request metadata, and each current resource family", async () => {
  const store = repository();
  for (const [action, resourceType] of [["SCHOOL_CREATED", "SCHOOL"], ["ADMIN_CREATED", "ADMIN"], ["TEACHER_CREATED", "TEACHER"], ["STUDENT_CREATED", "STUDENT"], ["PARENT_CREATED", "PARENT"], ["CLASS_CREATED", "CLASS"], ["MEDIA_UPLOADED", "MEDIA"]] as const) {
    await recordAuditEvent(event(action, resourceType), { repository: store, strict: true });
  }
  assert.equal(store.records.length, 7);
  assert.equal(store.records[0]?.actorName, "Puan Sistem");
  assert.equal(store.records[0]?.ipAddress, "127.0.0.1");
  assert.equal(store.records[0]?.createdAt, now);
  assert.equal(store.records[1]?.restrictedToSuperAdmin, true);
  assert.equal(store.records[6]?.afterData instanceof Object, true);
});

test("audit sanitizer redacts secrets, handles arrays/cycles/types, and truncates payloads", () => {
  const circular: { nested?: unknown } = {};
  circular.nested = circular;
  const sanitized = sanitizeAuditData({ passwordHash: "hash", pin: "1234", token: "token", nested: { setupToken: "setup" }, rows: [{ accessToken: "access" }], date: now, count: 4n, circular, fileContent: Buffer.from("file") }) as Record<string, unknown>;
  assert.equal(sanitized.passwordHash, "[REDACTED]");
  assert.equal(sanitized.pin, "[REDACTED]");
  assert.equal((sanitized.nested as Record<string, unknown>).setupToken, "[REDACTED]");
  assert.equal(((sanitized.rows as Array<Record<string, unknown>>)[0]).accessToken, "[REDACTED]");
  assert.equal(sanitized.date, now.toISOString());
  assert.equal(sanitized.count, "4");
  assert.equal((sanitized.circular as Record<string, unknown>).nested, "[CIRCULAR]");
  assert.equal(sanitized.fileContent, "[REDACTED]");
  assert.deepEqual(sanitizeAuditData({ value: "x".repeat(70 * 1024) }), { truncated: true, reason: "AUDIT_PAYLOAD_TOO_LARGE" });
});

test("ADMIN sees non-restricted logs only and restricted detail is indistinguishable from missing", async () => {
  const store = repository();
  await recordAuditEvent(event("SCHOOL_CREATED", "SCHOOL"), { repository: store, strict: true });
  await recordAuditEvent(event("ADMIN_CREATED", "ADMIN"), { repository: store, strict: true });
  const adminList = await listAuditLogs(query(), { role: UserRole.ADMIN }, { repository: store });
  assert.equal(adminList.auditLogs.length, 1);
  const restrictedId = store.records[1]?.id;
  assert.ok(restrictedId);
  await assert.rejects(() => getAuditLogById(restrictedId, { role: UserRole.ADMIN }, { repository: store }), (caught: unknown) => caught instanceof AppError && caught.code === "AUDIT_LOG_NOT_FOUND");
  assert.equal((await listAuditLogs(query(), { role: UserRole.SUPER_ADMIN }, { repository: store })).auditLogs.length, 2);
});

test("audit filters, pagination, details, and access denial follow safe policy", async () => {
  const store = repository();
  await recordAuditEvent(event("SCHOOL_CREATED", "SCHOOL"), { repository: store, strict: true });
  await recordAuditEvent({ ...event("MEDIA_UPLOADED", "MEDIA"), resourceId: "activity-image/2026/07/file.png", after: null, metadata: { fileContent: "not-stored" } }, { repository: store, strict: true });
  const result = await listAuditLogs(query({ limit: 1, action: "MEDIA_UPLOADED", resourceType: "MEDIA", search: "activity-image", sortOrder: "asc" }), { role: UserRole.SUPER_ADMIN }, { repository: store });
  assert.equal(result.auditLogs.length, 1);
  assert.equal(result.pagination.total, 1);
  assert.equal((result.auditLogs[0]?.metadata as Record<string, unknown>).fileContent, "[REDACTED]");
  const id = store.records[0]?.id;
  assert.ok(id);
  assert.equal((await getAuditLogById(id, { role: UserRole.SUPER_ADMIN }, { repository: store })).id, id);
  await assert.rejects(() => listAuditLogs(query(), { role: UserRole.TEACHER }, { repository: store }), (caught: unknown) => caught instanceof AppError && caught.code === "AUDIT_ACCESS_DENIED");
});

test("best-effort persistence does not interrupt callers while strict persistence fails safely", async () => {
  const failing: AuditLogRepository = { async create() { throw new Error("database unavailable"); }, async findMany() { return []; }, async count() { return 0; }, async findById() { return null; } };
  await recordAuditEvent(event(), { repository: failing });
  await assert.rejects(() => recordAuditEvent(event(), { repository: failing, strict: true }), (caught: unknown) => caught instanceof AppError && caught.code === "AUDIT_PERSISTENCE_FAILED");
});

test("transaction client is used when supplied", async () => {
  let calls = 0;
  const transactionClient = { auditLog: { async create() { calls += 1; return {} as never; } } };
  await recordAuditEvent(event(), { transactionClient: transactionClient as never, strict: true });
  assert.equal(calls, 1);
});

test("audit query validation defaults and rejects unsafe filters", () => {
  assert.deepEqual(listAuditLogsQuerySchema.parse({}), { page: 1, limit: 20, sortOrder: "desc" });
  assert.throws(() => listAuditLogsQuerySchema.parse({ limit: 101 }));
  assert.throws(() => listAuditLogsQuerySchema.parse({ actorUserId: "not-a-uuid" }));
  assert.throws(() => listAuditLogsQuerySchema.parse({ dateFrom: "2026-07-27", dateTo: "2026-07-26" }));
  assert.throws(() => listAuditLogsQuerySchema.parse({ arbitrary: "value" }));
  assert.throws(() => auditLogIdParamsSchema.parse({ auditLogId: "invalid" }));
});
