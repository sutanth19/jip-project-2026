import {
  ActivityTemplateStatus,
  Prisma,
  UserRole,
} from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { assertSafeTemplateSchema, type SafeJsonObject } from "../utils/safe-json-schema.js";
import type {
  CreateActivityTemplateBody,
  ListActivityTemplatesQuery,
  UpdateActivityTemplateBody,
} from "../validators/activity-template.validator.js";
import { recordAuditEvent, type AuditEvent } from "./audit.service.js";

export interface ActivityTemplateAuditContext {
  actor: AuthenticatedSession & { name?: string | null };
  requestIp?: string | null;
  userAgent?: string | null;
}

const templateInclude = {
  acceptedItemTypes: { orderBy: { itemType: "asc" } },
} satisfies Prisma.ActivityTemplateInclude;

type ActivityTemplateRecord = Prisma.ActivityTemplateGetPayload<{ include: typeof templateInclude }>;
const allowedRendererKeys = new Set([
  "multiple-choice",
  "matching",
  "drag-drop",
  "fill-blank",
  "arrange-syllables",
  "arrange-letters",
  "word-builder",
  "tracing",
  "copy-writing",
  "free-handwriting",
  "reading",
  "voice-recording",
]);

function appError(code: string, status: number, message: string, details?: unknown): AppError {
  return new AppError(code, status, message, details);
}

function templateNotFound(): AppError {
  return appError("ACTIVITY_TEMPLATE_NOT_FOUND", 404, "Templat aktiviti tidak ditemui.");
}

function accessDenied(): AppError {
  return appError("ACTIVITY_TEMPLATE_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses registri templat aktiviti.");
}

function notEditable(message = "Templat aktiviti ini tidak boleh diubah pada status semasa."): AppError {
  return appError("ACTIVITY_TEMPLATE_NOT_EDITABLE", 409, message);
}

function codeExists(): AppError {
  return appError("ACTIVITY_TEMPLATE_CODE_EXISTS", 409, "Kod templat aktiviti telah digunakan.");
}

function statusInvalid(): AppError {
  return appError("ACTIVITY_TEMPLATE_STATUS_INVALID", 409, "Status templat aktiviti tidak sah.");
}

function itemTypeInvalid(message = "Jenis item templat aktiviti tidak sah."): AppError {
  return appError("ACTIVITY_TEMPLATE_ITEM_TYPE_INVALID", 400, message);
}

function assertRendererKey(rendererKey: string): void {
  if (!allowedRendererKeys.has(rendererKey)) {
    throw appError("ACTIVITY_TEMPLATE_RENDERER_INVALID", 400, "Renderer templat aktiviti tidak sah.");
  }
}

function assertReadAccess(context: ActivityTemplateAuditContext): void {
  if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN && context.actor.role !== UserRole.TEACHER) throw accessDenied();
}

function assertRegistryManagement(context: ActivityTemplateAuditContext): void {
  if (context.actor.role !== UserRole.SUPER_ADMIN) throw accessDenied();
}

function jsonInput(value: SafeJsonObject): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function validateTemplateSchemas(configurationSchema: unknown, contentSchema: unknown): { configurationSchema: SafeJsonObject; contentSchema: SafeJsonObject } {
  assertSafeTemplateSchema(configurationSchema);
  assertSafeTemplateSchema(contentSchema);
  return { configurationSchema, contentSchema };
}

function templateDto(record: ActivityTemplateRecord) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    category: record.category,
    version: record.version,
    status: record.status,
    assessmentMode: record.assessmentMode,
    requiresTeacherReview: record.requiresTeacherReview,
    supportsAutoMarking: record.supportsAutoMarking,
    supportsMedia: record.supportsMedia,
    supportsAudio: record.supportsAudio,
    supportsVideo: record.supportsVideo,
    supportsDrawing: record.supportsDrawing,
    supportsVoiceRecording: record.supportsVoiceRecording,
    supportsFutureAI: record.supportsFutureAI,
    configurationSchema: record.configurationSchema,
    contentSchema: record.contentSchema,
    rendererKey: record.rendererKey,
    acceptedItemTypes: record.acceptedItemTypes.map((itemType) => ({
      id: itemType.id,
      itemType: itemType.itemType,
      isRequired: itemType.isRequired,
      minimumItems: itemType.minimumItems,
      maximumItems: itemType.maximumItems,
    })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function safeAuditTemplate(record: ActivityTemplateRecord) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    version: record.version,
    status: record.status,
    category: record.category,
    rendererKey: record.rendererKey,
    acceptedItemTypes: record.acceptedItemTypes.map((item) => item.itemType),
  };
}

function auditEvent(
  context: ActivityTemplateAuditContext,
  action: AuditEvent["action"],
  resourceId: string,
  before: unknown,
  after: unknown,
): AuditEvent {
  return {
    actorUserId: context.actor.userId,
    actorProfileId: context.actor.profileId,
    actorRole: context.actor.role,
    actorName: context.actor.name ?? null,
    action,
    resourceType: "ACTIVITY_TEMPLATE",
    resourceId,
    schoolId: null,
    before,
    after,
    timestamp: new Date(),
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

async function getTemplateRecord(templateId: string): Promise<ActivityTemplateRecord> {
  const record = await prisma.activityTemplate.findUnique({ where: { id: templateId }, include: templateInclude });
  if (!record) throw templateNotFound();
  return record;
}

function assertVisible(record: ActivityTemplateRecord, context: ActivityTemplateAuditContext): void {
  assertReadAccess(context);
  if (context.actor.role === UserRole.TEACHER && record.status !== ActivityTemplateStatus.ACTIVE) throw templateNotFound();
}

function validateItemTypes(input: Array<{ minimumItems?: number | null; maximumItems?: number | null; isRequired: boolean }>): void {
  if (input.length === 0) throw itemTypeInvalid("Templat mesti menerima sekurang-kurangnya satu jenis item.");
  for (const itemType of input) {
    if (itemType.minimumItems !== undefined && itemType.minimumItems !== null && itemType.maximumItems !== undefined && itemType.maximumItems !== null && itemType.maximumItems < itemType.minimumItems) {
      throw itemTypeInvalid("Bilangan item maksimum tidak boleh kurang daripada minimum.");
    }
    if (itemType.isRequired && itemType.minimumItems === 0) throw itemTypeInvalid("Jenis item wajib mesti mempunyai minimum sekurang-kurangnya satu.");
  }
}

function isUniqueError(caught: unknown): boolean {
  return caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === "P2002";
}

function templateOrderBy(sortBy: ListActivityTemplatesQuery["sortBy"], sortOrder: "asc" | "desc"): Prisma.ActivityTemplateOrderByWithRelationInput {
  return { [sortBy]: sortOrder } as Prisma.ActivityTemplateOrderByWithRelationInput;
}

function templateWhere(query: ListActivityTemplatesQuery, context: ActivityTemplateAuditContext): Prisma.ActivityTemplateWhereInput {
  return {
    ...(context.actor.role === UserRole.TEACHER ? { status: ActivityTemplateStatus.ACTIVE } : query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.assessmentMode ? { assessmentMode: query.assessmentMode } : {}),
    ...(query.supportsAutoMarking !== undefined ? { supportsAutoMarking: query.supportsAutoMarking } : {}),
    ...(query.supportsDrawing !== undefined ? { supportsDrawing: query.supportsDrawing } : {}),
    ...(query.supportsVoiceRecording !== undefined ? { supportsVoiceRecording: query.supportsVoiceRecording } : {}),
    ...(query.supportsFutureAI !== undefined ? { supportsFutureAI: query.supportsFutureAI } : {}),
    ...(query.search ? { OR: [
      { code: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
      { description: { contains: query.search, mode: "insensitive" } },
      { rendererKey: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
  };
}

export async function createActivityTemplate(input: CreateActivityTemplateBody, context: ActivityTemplateAuditContext) {
  assertRegistryManagement(context);
  assertRendererKey(input.rendererKey);
  const schemas = validateTemplateSchemas(input.configurationSchema, input.contentSchema);
  validateItemTypes(input.acceptedItemTypes);
  try {
    const template = await prisma.activityTemplate.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        version: input.version,
        status: input.status,
        assessmentMode: input.assessmentMode,
        requiresTeacherReview: input.requiresTeacherReview,
        supportsAutoMarking: input.supportsAutoMarking,
        supportsMedia: input.supportsMedia,
        supportsAudio: input.supportsAudio,
        supportsVideo: input.supportsVideo,
        supportsDrawing: input.supportsDrawing,
        supportsVoiceRecording: input.supportsVoiceRecording,
        supportsFutureAI: input.supportsFutureAI,
        configurationSchema: jsonInput(schemas.configurationSchema),
        contentSchema: jsonInput(schemas.contentSchema),
        rendererKey: input.rendererKey,
        acceptedItemTypes: { create: input.acceptedItemTypes.map((itemType) => ({ itemType: itemType.itemType, isRequired: itemType.isRequired, minimumItems: itemType.minimumItems ?? null, maximumItems: itemType.maximumItems ?? null })) },
      },
      include: templateInclude,
    });
    await recordAuditEvent(auditEvent(context, "ACTIVITY_TEMPLATE_CREATED", template.id, null, safeAuditTemplate(template)));
    return templateDto(template);
  } catch (caught) {
    if (isUniqueError(caught)) throw codeExists();
    throw caught;
  }
}

export async function listActivityTemplates(query: ListActivityTemplatesQuery, context: ActivityTemplateAuditContext) {
  assertReadAccess(context);
  const where = templateWhere(query, context);
  const [templates, total] = await Promise.all([
    prisma.activityTemplate.findMany({ where, include: templateInclude, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: templateOrderBy(query.sortBy, query.sortOrder) }),
    prisma.activityTemplate.count({ where }),
  ]);
  const totalPages = Math.ceil(total / query.limit);
  return { templates: templates.map(templateDto), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

export async function getActivityTemplate(templateId: string, context: ActivityTemplateAuditContext) {
  const template = await getTemplateRecord(templateId);
  assertVisible(template, context);
  return templateDto(template);
}

export async function updateActivityTemplate(templateId: string, input: UpdateActivityTemplateBody, context: ActivityTemplateAuditContext) {
  assertRegistryManagement(context);
  const existing = await getTemplateRecord(templateId);
  if (existing.status === ActivityTemplateStatus.ARCHIVED) throw notEditable();
  const contractChanged = input.configurationSchema !== undefined || input.contentSchema !== undefined || input.acceptedItemTypes !== undefined;
  if (input.version !== undefined && input.version < existing.version) throw notEditable("Versi templat tidak boleh dikurangkan.");
  if (contractChanged && (input.version === undefined || input.version <= existing.version)) throw notEditable("Perubahan kontrak memerlukan peningkatan versi templat.");
  const schemas = input.configurationSchema !== undefined || input.contentSchema !== undefined
    ? validateTemplateSchemas(input.configurationSchema ?? existing.configurationSchema, input.contentSchema ?? existing.contentSchema)
    : null;
  if (input.acceptedItemTypes) validateItemTypes(input.acceptedItemTypes);
  const template = await prisma.$transaction(async (tx) => {
    if (input.acceptedItemTypes) await tx.activityTemplateItemType.deleteMany({ where: { activityTemplateId: templateId } });
    return tx.activityTemplate.update({
      where: { id: templateId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.version !== undefined ? { version: input.version } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assessmentMode !== undefined ? { assessmentMode: input.assessmentMode } : {}),
        ...(input.requiresTeacherReview !== undefined ? { requiresTeacherReview: input.requiresTeacherReview } : {}),
        ...(input.supportsAutoMarking !== undefined ? { supportsAutoMarking: input.supportsAutoMarking } : {}),
        ...(input.supportsMedia !== undefined ? { supportsMedia: input.supportsMedia } : {}),
        ...(input.supportsAudio !== undefined ? { supportsAudio: input.supportsAudio } : {}),
        ...(input.supportsVideo !== undefined ? { supportsVideo: input.supportsVideo } : {}),
        ...(input.supportsDrawing !== undefined ? { supportsDrawing: input.supportsDrawing } : {}),
        ...(input.supportsVoiceRecording !== undefined ? { supportsVoiceRecording: input.supportsVoiceRecording } : {}),
        ...(input.supportsFutureAI !== undefined ? { supportsFutureAI: input.supportsFutureAI } : {}),
        ...(schemas ? { configurationSchema: jsonInput(schemas.configurationSchema), contentSchema: jsonInput(schemas.contentSchema) } : {}),
        ...(input.acceptedItemTypes ? { acceptedItemTypes: { create: input.acceptedItemTypes.map((itemType) => ({ itemType: itemType.itemType, isRequired: itemType.isRequired, minimumItems: itemType.minimumItems ?? null, maximumItems: itemType.maximumItems ?? null })) } } : {}),
      },
      include: templateInclude,
    });
  });
  await recordAuditEvent(auditEvent(context, "ACTIVITY_TEMPLATE_UPDATED", templateId, safeAuditTemplate(existing), safeAuditTemplate(template)));
  return templateDto(template);
}

export async function updateActivityTemplateStatus(templateId: string, status: "ACTIVE" | "INACTIVE", context: ActivityTemplateAuditContext) {
  assertRegistryManagement(context);
  const existing = await getTemplateRecord(templateId);
  if (existing.status === ActivityTemplateStatus.ARCHIVED) throw statusInvalid();
  const template = await prisma.activityTemplate.update({ where: { id: templateId }, data: { status }, include: templateInclude });
  await recordAuditEvent(auditEvent(context, "ACTIVITY_TEMPLATE_UPDATED", templateId, safeAuditTemplate(existing), safeAuditTemplate(template)));
  return templateDto(template);
}

export async function archiveActivityTemplate(templateId: string, context: ActivityTemplateAuditContext) {
  assertRegistryManagement(context);
  const existing = await getTemplateRecord(templateId);
  if (existing.status === ActivityTemplateStatus.ARCHIVED) throw statusInvalid();
  const template = await prisma.$transaction(async (tx) => {
    const updated = await tx.activityTemplate.update({ where: { id: templateId }, data: { status: ActivityTemplateStatus.ARCHIVED }, include: templateInclude });
    await recordAuditEvent(auditEvent(context, "ACTIVITY_TEMPLATE_ARCHIVED", templateId, safeAuditTemplate(existing), safeAuditTemplate(updated)), { transactionClient: tx, strict: true });
    return updated;
  });
  return templateDto(template);
}

export { templateDto, safeAuditTemplate };
