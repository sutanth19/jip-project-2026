import { Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";

export const AUDIT_ACTIONS = [
  "SCHOOL_CREATED", "SCHOOL_UPDATED", "SCHOOL_STATUS_CHANGED",
  "ADMIN_CREATED", "ADMIN_UPDATED", "ADMIN_STATUS_CHANGED", "ADMIN_SETUP_RESENT",
  "TEACHER_CREATED", "TEACHER_UPDATED", "TEACHER_STATUS_CHANGED", "TEACHER_SETUP_RESENT", "TEACHER_PERMISSION_GRANTED", "TEACHER_PERMISSION_REVOKED",
  "PARENT_CREATED", "PARENT_UPDATED", "PARENT_STATUS_CHANGED", "PARENT_SETUP_RESENT", "PARENT_STUDENT_LINKED", "PARENT_STUDENT_UNLINKED",
  "STUDENT_CREATED", "STUDENT_UPDATED", "STUDENT_STATUS_CHANGED", "STUDENT_PIN_RESET", "STUDENT_CLASS_CHANGED", "STUDENT_PARENT_LINKED", "STUDENT_PARENT_UNLINKED",
  "CLASS_CREATED", "CLASS_UPDATED", "CLASS_STATUS_CHANGED", "CLASS_TEACHER_CHANGED", "CLASS_STUDENT_ASSIGNED",
  "MEDIA_UPLOADED", "MEDIA_DELETED",
  "PROFILE_UPDATED", "PROFILE_AVATAR_UPDATED", "PASSWORD_CHANGED", "STUDENT_PIN_CHANGED",
  "CURRICULUM_VERSION_CREATED", "CURRICULUM_VERSION_UPDATED", "CURRICULUM_VERSION_PUBLISHED", "CURRICULUM_VERSION_ARCHIVED",
  "CURRICULUM_SUBJECT_CREATED", "CURRICULUM_SUBJECT_UPDATED",
  "CURRICULUM_PROGRAMME_CREATED", "CURRICULUM_PROGRAMME_UPDATED",
  "CURRICULUM_YEAR_CREATED", "CURRICULUM_YEAR_UPDATED",
  "CURRICULUM_STRUCTURE_CREATED", "CURRICULUM_STRUCTURE_UPDATED",
  "CURRICULUM_SKILL_CREATED", "CURRICULUM_SKILL_UPDATED",
  "CURRICULUM_CONTENT_STANDARD_CREATED", "CURRICULUM_CONTENT_STANDARD_UPDATED",
  "CURRICULUM_LEARNING_STANDARD_CREATED", "CURRICULUM_LEARNING_STANDARD_UPDATED",
  "CURRICULUM_MAPPING_CREATED", "CURRICULUM_MAPPING_REMOVED",
  "CURRICULUM_OBJECTIVE_CREATED", "CURRICULUM_OBJECTIVE_UPDATED",
  "CURRICULUM_SUGGESTED_ACTIVITY_CREATED", "CURRICULUM_SUGGESTED_ACTIVITY_UPDATED",
  "CURRICULUM_IMPORTED",
  "QUESTION_BANK_ITEM_CREATED", "QUESTION_BANK_ITEM_UPDATED", "QUESTION_BANK_ITEM_ACTIVATED", "QUESTION_BANK_ITEM_ARCHIVED",
  "QUESTION_BANK_CURRICULUM_LINK_CREATED", "QUESTION_BANK_CURRICULUM_LINK_REMOVED",
  "QUESTION_BANK_OPTION_CREATED", "QUESTION_BANK_OPTION_UPDATED", "QUESTION_BANK_OPTION_REMOVED", "QUESTION_BANK_OPTIONS_REORDERED",
  "QUESTION_BANK_MEDIA_LINKED", "QUESTION_BANK_MEDIA_UNLINKED", "QUESTION_BANK_MEDIA_REORDERED",
  "ACTIVITY_TEMPLATE_CREATED", "ACTIVITY_TEMPLATE_UPDATED", "ACTIVITY_TEMPLATE_ARCHIVED", "ACTIVITY_TEMPLATE_SEEDED",
  "DIGITAL_ACTIVITY_CREATED", "DIGITAL_ACTIVITY_UPDATED", "DIGITAL_ACTIVITY_SUBMITTED_FOR_REVIEW", "DIGITAL_ACTIVITY_RETURNED_TO_DRAFT", "DIGITAL_ACTIVITY_PUBLISHED", "DIGITAL_ACTIVITY_ARCHIVED", "DIGITAL_ACTIVITY_DELETED",
  "DIGITAL_ACTIVITY_CURRICULUM_LINKED", "DIGITAL_ACTIVITY_CURRICULUM_UNLINKED",
  "DIGITAL_ACTIVITY_ITEM_ADDED", "DIGITAL_ACTIVITY_ITEM_UPDATED", "DIGITAL_ACTIVITY_ITEM_REMOVED", "DIGITAL_ACTIVITY_ITEMS_REORDERED",
  "DIGITAL_ACTIVITY_MEDIA_LINKED", "DIGITAL_ACTIVITY_MEDIA_UNLINKED", "DIGITAL_ACTIVITY_MEDIA_REORDERED",
  "SUBMISSION_CREATED", "SUBMISSION_REVIEW_STARTED", "SUBMISSION_ITEM_REVIEWED", "SUBMISSION_ITEM_REVISION_REQUIRED",
  "SUBMISSION_REVIEW_COMPLETED", "SUBMISSION_RETURNED_FOR_REVISION", "SUBMISSION_REVISION_STARTED", "SUBMISSION_CANCELLED", "SUBMISSION_ARCHIVED",
  "ASSESSMENT_CREATED", "ASSESSMENT_AUTO_COMPLETED", "ASSESSMENT_MANUAL_COMPLETED", "ASSESSMENT_RECALCULATED", "ASSESSMENT_ADJUSTED", "ASSESSMENT_INVALIDATED", "ASSESSMENT_ARCHIVED",
  "PBD_EVIDENCE_CREATED", "PBD_TEACHER_OBSERVATION_CREATED", "PBD_EVIDENCE_INVALIDATED",
  "PBD_MASTERY_RECOMMENDED", "PBD_MASTERY_RECALCULATED", "PBD_MASTERY_CONFIRMED", "PBD_MASTERY_OVERRIDDEN", "PBD_MASTERY_ARCHIVED",
  "REPORT_VIEWED", "REPORT_GENERATED", "REPORT_EXPORTED", "DASHBOARD_VIEWED",
  "AI_REQUEST_CREATED", "AI_REQUEST_PROCESSING", "AI_REQUEST_COMPLETED", "AI_REQUEST_FAILED", "AI_REQUEST_BLOCKED", "AI_REQUEST_CANCELLED", "AI_OUTPUT_APPROVED", "AI_OUTPUT_REJECTED", "AI_OUTPUT_ARCHIVED", "AI_PROMPT_TEMPLATE_CREATED", "AI_PROMPT_TEMPLATE_UPDATED", "AI_PROMPT_TEMPLATE_ACTIVATED", "AI_PROMPT_TEMPLATE_ARCHIVED", "AI_QUESTION_DRAFT_CREATED", "AI_ACTIVITY_DRAFT_CREATED", "AI_FEEDBACK_DRAFT_CREATED", "AI_AUDIO_TRANSCRIBED", "AI_READING_ANALYSIS_CREATED", "AI_PRACTICE_SUGGESTION_CREATED",
  "NOTIFICATION_CREATED", "NOTIFICATION_DELIVERED", "NOTIFICATION_FAILED", "NOTIFICATION_READ", "NOTIFICATION_ARCHIVED", "NOTIFICATION_PREFERENCE_CHANGED", "ANNOUNCEMENT_PUBLISHED", "ANNOUNCEMENT_ARCHIVED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_RESOURCE_TYPES = [
  "SCHOOL", "ADMIN", "TEACHER", "TEACHER_PERMISSION_GRANT", "PARENT", "PARENT_STUDENT", "STUDENT", "STUDENT_PARENT", "CLASS", "MEDIA", "PROFILE", "AUTH", "SYSTEM", "CURRICULUM", "QUESTION_BANK", "ACTIVITY_TEMPLATE", "DIGITAL_ACTIVITY", "SUBMISSION", "ASSESSMENT", "PBD_EVIDENCE", "PBD_MASTERY", "REPORT", "DASHBOARD", "AI", "NOTIFICATION", "ANNOUNCEMENT",
] as const;

export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];

export interface AuditEvent {
  actorUserId: string | null;
  actorProfileId: string | null;
  actorRole: UserRole | null;
  actorName: string | null;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  schoolId: string | null;
  before: unknown;
  after: unknown;
  metadata?: unknown;
  timestamp: Date;
  requestIp: string | null;
  userAgent: string | null;
  requestId?: string | null;
}

export type AuditEventDispatcher = (event: AuditEvent) => Promise<void> | void;

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  actorProfileId: string | null;
  actorRole: UserRole | null;
  actorName: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  schoolId: string | null;
  beforeData: Prisma.JsonValue | null;
  afterData: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  restrictedToSuperAdmin: boolean;
  createdAt: Date;
}

export interface AuditLogFilters {
  search?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  actorRole?: UserRole;
  schoolId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  restrictedToSuperAdmin?: boolean;
}

export interface AuditLogRepository {
  create(data: Omit<AuditLogRecord, "id" | "createdAt">): Promise<AuditLogRecord>;
  findMany(filters: AuditLogFilters, options: { skip: number; take: number; sortOrder: "asc" | "desc" }): Promise<AuditLogRecord[]>;
  count(filters: AuditLogFilters): Promise<number>;
  findById(id: string): Promise<AuditLogRecord | null>;
}

export interface AuditReadContext { role: UserRole; }

export interface ListAuditLogsQuery {
  page: number;
  limit: number;
  search?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  actorRole?: UserRole;
  schoolId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortOrder: "asc" | "desc";
}

export interface AuditPersistenceOptions {
  transactionClient?: Pick<Prisma.TransactionClient, "auditLog">;
  strict?: boolean;
  repository?: AuditLogRepository;
}

export interface AuditServiceDependencies { repository?: AuditLogRepository; }

type SafeJsonPrimitive = string | number | boolean | null;
export type SafeAuditJson = SafeJsonPrimitive | SafeAuditJson[] | { [key: string]: SafeAuditJson };

const MAX_AUDIT_JSON_BYTES = 64 * 1024;
const MAX_AUDIT_DEPTH = 8;
const REDACTED = "[REDACTED]";
const RESTRICTED_ACTIONS = new Set<AuditAction>([
  "ADMIN_CREATED", "ADMIN_UPDATED", "ADMIN_STATUS_CHANGED", "ADMIN_SETUP_RESENT",
]);

function appError(code: string, status: number, message: string): AppError {
  return new AppError(code, status, message);
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return normalized === "pin" || normalized === "currentpin" || normalized === "newpin" || normalized === "confirmpin" || normalized === "pinhash" ||
    normalized.includes("password") || normalized.includes("token") || normalized.includes("secret") ||
    normalized === "authorization" || normalized === "cookie" || normalized === "apikey" || normalized === "databaseurl" ||
    normalized === "filecontent" || normalized === "buffer";
}

function truncationMarker(reason: string): SafeAuditJson {
  return { truncated: true, reason };
}

function safeNumber(value: number): SafeJsonPrimitive {
  return Number.isFinite(value) ? value : String(value);
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): SafeAuditJson {
  if (depth > MAX_AUDIT_DEPTH) return truncationMarker("AUDIT_MAX_DEPTH_EXCEEDED");
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return safeNumber(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return String(value);
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry, depth + 1, seen));
  if (value instanceof Buffer || value instanceof Uint8Array) return REDACTED;
  if (value.constructor?.name === "Decimal") return value.toString();
  const result: { [key: string]: SafeAuditJson } = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    result[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(nestedValue, depth + 1, seen);
  }
  return result;
}

export function sanitizeAuditData(value: unknown): SafeAuditJson {
  const sanitized = sanitizeValue(value, 0, new WeakSet<object>());
  try {
    return Buffer.byteLength(JSON.stringify(sanitized), "utf8") > MAX_AUDIT_JSON_BYTES
      ? truncationMarker("AUDIT_PAYLOAD_TOO_LARGE")
      : sanitized;
  } catch {
    return truncationMarker("AUDIT_PAYLOAD_INVALID");
  }
}

function sanitizeText(value: string | null | undefined, maxLength: number): string | null {
  if (!value) return null;
  return value.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, maxLength) || null;
}

function safeJsonOrNull(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  return sanitizeAuditData(value) as Prisma.InputJsonValue;
}

function toRecordData(event: AuditEvent): Omit<AuditLogRecord, "id" | "createdAt"> {
  return {
    actorUserId: event.actorUserId,
    actorProfileId: event.actorProfileId,
    actorRole: event.actorRole,
    actorName: sanitizeText(event.actorName, 256),
    action: event.action,
    resourceType: event.resourceType,
    resourceId: sanitizeText(event.resourceId, 512),
    schoolId: event.schoolId,
    beforeData: safeJsonOrNull(event.before) as Prisma.JsonValue | null,
    afterData: safeJsonOrNull(event.after) as Prisma.JsonValue | null,
    metadata: safeJsonOrNull(event.metadata) as Prisma.JsonValue | null,
    ipAddress: sanitizeText(event.requestIp, 128),
    userAgent: sanitizeText(event.userAgent, 512),
    requestId: sanitizeText(event.requestId, 128),
    restrictedToSuperAdmin: RESTRICTED_ACTIONS.has(event.action),
  };
}

function prismaWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.action) where.action = filters.action;
  if (filters.resourceType) where.resourceType = filters.resourceType;
  if (filters.resourceId) where.resourceId = filters.resourceId;
  if (filters.actorUserId) where.actorUserId = filters.actorUserId;
  if (filters.actorRole) where.actorRole = filters.actorRole;
  if (filters.schoolId) where.schoolId = filters.schoolId;
  if (filters.restrictedToSuperAdmin !== undefined) where.restrictedToSuperAdmin = filters.restrictedToSuperAdmin;
  if (filters.dateFrom || filters.dateTo) where.createdAt = { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) };
  if (filters.search) where.OR = [
    { actorName: { contains: filters.search, mode: "insensitive" } },
    { action: { contains: filters.search, mode: "insensitive" } },
    { resourceType: { contains: filters.search, mode: "insensitive" } },
    { resourceId: { contains: filters.search, mode: "insensitive" } },
    { requestId: { contains: filters.search, mode: "insensitive" } },
  ];
  return where;
}

const prismaAuditRepository: AuditLogRepository = {
  async create(data) {
    return prisma.auditLog.create({ data: { ...data, beforeData: data.beforeData as Prisma.InputJsonValue | undefined, afterData: data.afterData as Prisma.InputJsonValue | undefined, metadata: data.metadata as Prisma.InputJsonValue | undefined } });
  },
  async findMany(filters, options) {
    return prisma.auditLog.findMany({ where: prismaWhere(filters), orderBy: { createdAt: options.sortOrder }, skip: options.skip, take: options.take });
  },
  async count(filters) { return prisma.auditLog.count({ where: prismaWhere(filters) }); },
  async findById(id) { return prisma.auditLog.findUnique({ where: { id } }); },
};

function auditPersistenceFailed(): AppError {
  return appError("AUDIT_PERSISTENCE_FAILED", 500, "Rekod audit tidak dapat disimpan.");
}

export async function recordAuditEvent(event: AuditEvent, options: AuditPersistenceOptions = {}): Promise<void> {
  const data = toRecordData(event);
  try {
    if (options.repository) {
      await options.repository.create(data);
    } else if (options.transactionClient) {
      await options.transactionClient.auditLog.create({ data: { ...data, beforeData: data.beforeData as Prisma.InputJsonValue | undefined, afterData: data.afterData as Prisma.InputJsonValue | undefined, metadata: data.metadata as Prisma.InputJsonValue | undefined } });
    } else {
      await prismaAuditRepository.create(data);
    }
  } catch {
    if (options.strict) throw auditPersistenceFailed();
    console.error("Audit persistence failed", { action: event.action, resourceType: event.resourceType, resourceId: event.resourceId });
  }
}

export async function dispatchAuditEvent(event: AuditEvent, dispatcher?: AuditEventDispatcher): Promise<void> {
  if (dispatcher) {
    await dispatcher(event);
    return;
  }
  if (process.env.NODE_ENV === "test") return;
  await recordAuditEvent(event);
}

function enforceAuditReaderAccess(context: AuditReadContext): void {
  if (context.role !== UserRole.SUPER_ADMIN && context.role !== UserRole.ADMIN) {
    throw appError("AUDIT_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses rekod audit.");
  }
}

function visibleFilters(query: ListAuditLogsQuery, context: AuditReadContext): AuditLogFilters {
  enforceAuditReaderAccess(context);
  return {
    search: query.search,
    action: query.action,
    resourceType: query.resourceType,
    resourceId: query.resourceId,
    actorUserId: query.actorUserId,
    actorRole: query.actorRole,
    schoolId: query.schoolId,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    ...(context.role === UserRole.ADMIN ? { restrictedToSuperAdmin: false } : {}),
  };
}

function mapAuditLog(record: AuditLogRecord) {
  return {
    id: record.id,
    actor: { userId: record.actorUserId, profileId: record.actorProfileId, role: record.actorRole, name: record.actorName },
    action: record.action,
    resource: { type: record.resourceType, id: record.resourceId },
    schoolId: record.schoolId,
    before: record.beforeData === null ? null : sanitizeAuditData(record.beforeData),
    after: record.afterData === null ? null : sanitizeAuditData(record.afterData),
    metadata: record.metadata === null ? null : sanitizeAuditData(record.metadata),
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    requestId: record.requestId,
    createdAt: record.createdAt,
  };
}

export async function listAuditLogs(query: ListAuditLogsQuery, context: AuditReadContext, deps: AuditServiceDependencies = {}) {
  const repository = deps.repository ?? prismaAuditRepository;
  const filters = visibleFilters(query, context);
  const [records, total] = await Promise.all([
    repository.findMany(filters, { skip: (query.page - 1) * query.limit, take: query.limit, sortOrder: query.sortOrder }),
    repository.count(filters),
  ]);
  const totalPages = Math.ceil(total / query.limit);
  return { auditLogs: records.map(mapAuditLog), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

export async function getAuditLogById(auditLogId: string, context: AuditReadContext, deps: AuditServiceDependencies = {}) {
  enforceAuditReaderAccess(context);
  const record = await (deps.repository ?? prismaAuditRepository).findById(auditLogId);
  if (!record || (context.role === UserRole.ADMIN && record.restrictedToSuperAdmin)) {
    throw appError("AUDIT_LOG_NOT_FOUND", 404, "Rekod audit tidak ditemui.");
  }
  return mapAuditLog(record);
}
