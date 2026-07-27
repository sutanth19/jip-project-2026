import {
  CurriculumRecordStatus,
  CurriculumStatus,
  DifficultyLevel,
  MediaRole,
  Prisma,
  QuestionAnswerType,
  QuestionBankStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { assertSafeStorageKey } from "../storage/local-storage.adapter.js";
import { getStorageAdapter } from "../storage/storage.service.js";
import { assertSafeMetadata, type SafeJsonValue } from "../utils/safe-json-schema.js";
import type {
  CreateAnswerOptionBody,
  CreateCurriculumLinkBody,
  CreateQuestionBankItemBody,
  CreateQuestionBankMediaBody,
  ListQuestionBankItemsQuery,
  UpdateAnswerOptionBody,
  UpdateQuestionBankItemBody,
} from "../validators/question-bank.validator.js";
import { recordAuditEvent, type AuditEvent } from "./audit.service.js";

export interface QuestionBankAuditContext {
  actor: AuthenticatedSession & { name?: string | null };
  requestIp?: string | null;
  userAgent?: string | null;
}

type SortOrder = "asc" | "desc";

const OPTION_ANSWER_TYPES = new Set<QuestionAnswerType>([
  QuestionAnswerType.SINGLE_CHOICE,
  QuestionAnswerType.MULTIPLE_CHOICE,
  QuestionAnswerType.BOOLEAN,
  QuestionAnswerType.ORDERED_ITEMS,
  QuestionAnswerType.MATCHING_PAIRS,
]);
const IMAGE_ROLES = new Set<MediaRole>([MediaRole.PRIMARY_IMAGE, MediaRole.SUPPORTING_IMAGE]);
const AUDIO_ROLES = new Set<MediaRole>([MediaRole.REFERENCE_AUDIO, MediaRole.INSTRUCTION_AUDIO]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "mp4"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm"]);

const itemInclude = {
  programme: {
    select: {
      id: true,
      code: true,
      name: true,
      curriculumVersionId: true,
      curriculumVersion: { select: { id: true, code: true, name: true, status: true } },
    },
  },
  createdBy: {
    select: {
      id: true,
      role: true,
      admin: { select: { fullName: true } },
      teacher: { select: { fullName: true } },
    },
  },
  curriculumLinks: {
    include: {
      remedialSkill: { select: { id: true, code: true, name: true, programmeId: true, languageStructureId: true } },
      contentStandard: { select: { id: true, code: true, title: true, programmeId: true, curriculumYearId: true } },
      learningStandard: { select: { id: true, code: true, description: true, contentStandardId: true } },
      curriculumYear: { select: { id: true, yearLevel: true, name: true, programmeId: true } },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  },
  answerOptions: { orderBy: { sequence: "asc" } },
  mediaLinks: { orderBy: [{ mediaRole: "asc" }, { sequence: "asc" }] },
} satisfies Prisma.QuestionBankItemInclude;

type QuestionBankItemRecord = Prisma.QuestionBankItemGetPayload<{ include: typeof itemInclude }>;

function appError(code: string, status: number, message: string, details?: unknown): AppError {
  return new AppError(code, status, message, details);
}

function itemNotFound(): AppError {
  return appError("QUESTION_BANK_ITEM_NOT_FOUND", 404, "Item bank soalan tidak ditemui.");
}

function optionNotFound(): AppError {
  return appError("QUESTION_BANK_OPTION_NOT_FOUND", 404, "Pilihan jawapan tidak ditemui.");
}

function mediaNotFound(): AppError {
  return appError("QUESTION_BANK_MEDIA_NOT_FOUND", 404, "Pautan media tidak ditemui.");
}

function accessDenied(): AppError {
  return appError("QUESTION_BANK_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses bank soalan.");
}

function notEditable(): AppError {
  return appError("QUESTION_BANK_ITEM_NOT_EDITABLE", 409, "Item bank soalan ini tidak boleh diubah pada status semasa.");
}

function linkInvalid(message = "Pautan kurikulum tidak sah untuk item bank soalan."): AppError {
  return appError("QUESTION_BANK_CURRICULUM_LINK_INVALID", 400, message);
}

function optionInvalid(message = "Pilihan jawapan tidak sah."): AppError {
  return appError("QUESTION_BANK_OPTION_INVALID", 400, message);
}

function mediaInvalid(message = "Pautan media tidak sah."): AppError {
  return appError("QUESTION_BANK_MEDIA_INVALID", 400, message);
}

function statusInvalid(): AppError {
  return appError("QUESTION_BANK_STATUS_TRANSITION_INVALID", 409, "Peralihan status item bank soalan tidak sah.");
}

function duplicateError(): AppError {
  return appError("QUESTION_BANK_DUPLICATE", 409, "Item dengan kandungan yang sama telah wujud dalam program ini.");
}

function isUniqueError(caught: unknown): boolean {
  return caught instanceof Prisma.PrismaClientKnownRequestError && caught.code === "P2002";
}

function assertManagementAccess(context: QuestionBankAuditContext): void {
  if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN) {
    throw accessDenied();
  }
}

function assertReadAccess(context: QuestionBankAuditContext): void {
  if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN && context.actor.role !== UserRole.TEACHER) {
    throw accessDenied();
  }
}

function normalizeText(content: string): string {
  return content.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("ms-MY");
}

function jsonInput(value: SafeJsonValue): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function safeOptionalJson(value: unknown | undefined): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  assertSafeMetadata(value);
  return jsonInput(value);
}

function safeAuditItem(record: QuestionBankItemRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    type: record.type,
    status: record.status,
    difficulty: record.difficulty,
    normalizedText: record.normalizedText,
  };
}

function auditEvent(
  context: QuestionBankAuditContext,
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
    resourceType: "QUESTION_BANK",
    resourceId,
    schoolId: null,
    before,
    after,
    timestamp: new Date(),
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

function itemDto(record: QuestionBankItemRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    type: record.type,
    title: record.title,
    content: record.content,
    normalizedText: record.normalizedText,
    languagePattern: record.languagePattern,
    instructions: record.instructions,
    explanation: record.explanation,
    answerType: record.answerType,
    correctAnswer: record.correctAnswer,
    difficulty: record.difficulty,
    status: record.status,
    sourceReference: record.sourceReference,
    metadata: record.metadata,
    publishedAt: record.publishedAt,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    programme: {
      id: record.programme.id,
      code: record.programme.code,
      name: record.programme.name,
      version: record.programme.curriculumVersion,
    },
    creator: {
      userId: record.createdBy.id,
      role: record.createdBy.role,
      name: record.createdBy.admin?.fullName ?? record.createdBy.teacher?.fullName ?? null,
    },
    curriculumLinks: record.curriculumLinks.map((link) => ({
      id: link.id,
      isPrimary: link.isPrimary,
      createdAt: link.createdAt,
      remedialSkill: link.remedialSkill,
      contentStandard: link.contentStandard,
      learningStandard: link.learningStandard,
      curriculumYear: link.curriculumYear,
    })),
    options: record.answerOptions.map((option) => ({
      id: option.id,
      label: option.label,
      content: option.content,
      isCorrect: option.isCorrect,
      sequence: option.sequence,
      metadata: option.metadata,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    })),
    media: record.mediaLinks.map((media) => ({
      id: media.id,
      mediaKey: media.mediaKey,
      mediaRole: media.mediaRole,
      mimeType: media.mimeType,
      originalName: media.originalName,
      sequence: media.sequence,
      altText: media.altText,
      url: getStorageAdapter().getPublicUrl(media.mediaKey),
      createdAt: media.createdAt,
    })),
  };
}

function itemListDto(record: QuestionBankItemRecord) {
  const dto = itemDto(record);
  return {
    ...dto,
    curriculumLinks: dto.curriculumLinks.map((link) => ({
      id: link.id,
      isPrimary: link.isPrimary,
      remedialSkill: link.remedialSkill ? { id: link.remedialSkill.id, code: link.remedialSkill.code, name: link.remedialSkill.name } : null,
      contentStandard: link.contentStandard ? { id: link.contentStandard.id, code: link.contentStandard.code, title: link.contentStandard.title } : null,
      learningStandard: link.learningStandard ? { id: link.learningStandard.id, code: link.learningStandard.code } : null,
      curriculumYear: link.curriculumYear ? { id: link.curriculumYear.id, yearLevel: link.curriculumYear.yearLevel, name: link.curriculumYear.name } : null,
    })),
  };
}

async function getItemRecord(itemId: string): Promise<QuestionBankItemRecord> {
  const item = await prisma.questionBankItem.findUnique({ where: { id: itemId }, include: itemInclude });
  if (!item) throw itemNotFound();
  return item;
}

function assertVisible(record: QuestionBankItemRecord, context: QuestionBankAuditContext): void {
  assertReadAccess(context);
  if (context.actor.role === UserRole.TEACHER && record.status !== QuestionBankStatus.ACTIVE) {
    throw itemNotFound();
  }
}

function assertDraft(record: QuestionBankItemRecord): void {
  if (record.status !== QuestionBankStatus.DRAFT) throw notEditable();
}

async function assertProgrammeUsable(programmeId: string): Promise<void> {
  const programme = await prisma.curriculumProgramme.findUnique({
    where: { id: programmeId },
    select: { status: true, curriculumVersion: { select: { status: true } } },
  });
  if (!programme || programme.status === CurriculumRecordStatus.ARCHIVED || programme.curriculumVersion.status === CurriculumStatus.ARCHIVED) {
    throw linkInvalid("Program atau versi kurikulum tidak tersedia.");
  }
}

async function findDuplicates(
  programmeId: string,
  type: CreateQuestionBankItemBody["type"],
  content: string,
  excludeItemId?: string,
) {
  const normalizedText = normalizeText(content);
  return prisma.questionBankItem.findMany({
    where: {
      programmeId,
      type,
      normalizedText,
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
    },
    select: { id: true, title: true, status: true, createdAt: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

async function assertDuplicatePolicy(
  programmeId: string,
  type: CreateQuestionBankItemBody["type"],
  content: string,
  context: QuestionBankAuditContext,
  override: boolean | undefined,
  excludeItemId?: string,
): Promise<void> {
  const duplicates = await findDuplicates(programmeId, type, content, excludeItemId);
  if (duplicates.length === 0) return;
  if (override && context.actor.role === UserRole.SUPER_ADMIN) return;
  throw duplicateError();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function sequenceList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.some((entry) => !Number.isInteger(entry) || (entry as number) < 0)) return null;
  return value as number[];
}

function booleanAnswer(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  const object = asRecord(value);
  return object && typeof object.value === "boolean" ? object.value : null;
}

function correctSequences(answerType: QuestionAnswerType, correctAnswer: unknown): number[] | null {
  const object = asRecord(correctAnswer);
  if (answerType === QuestionAnswerType.SINGLE_CHOICE) {
    return object && Number.isInteger(object.optionSequence) && (object.optionSequence as number) >= 0 ? [object.optionSequence as number] : null;
  }
  if (answerType === QuestionAnswerType.MULTIPLE_CHOICE) return object ? sequenceList(object.optionSequences) : null;
  if (answerType === QuestionAnswerType.ORDERED_ITEMS) return object ? sequenceList(object.sequences) : null;
  return null;
}

function assertCorrectAnswerShape(answerType: QuestionAnswerType, correctAnswer: unknown, requireValue: boolean): void {
  if (answerType === QuestionAnswerType.NONE) {
    if (correctAnswer !== undefined && correctAnswer !== null) throw optionInvalid("Jenis jawapan NONE tidak menerima jawapan betul.");
    return;
  }
  if ((correctAnswer === undefined || correctAnswer === null) && !requireValue) return;
  if (correctAnswer === undefined || correctAnswer === null) throw optionInvalid("Jawapan betul diperlukan sebelum aktivasi.");
  if (answerType === QuestionAnswerType.TEXT) {
    const object = asRecord(correctAnswer);
    if (!(typeof correctAnswer === "string" && correctAnswer.trim()) && !(object && typeof object.value === "string" && object.value.trim())) {
      throw optionInvalid("Jawapan teks tidak sah.");
    }
    return;
  }
  if (answerType === QuestionAnswerType.BOOLEAN) {
    if (booleanAnswer(correctAnswer) === null) throw optionInvalid("Jawapan boolean tidak sah.");
    return;
  }
  if (answerType === QuestionAnswerType.SINGLE_CHOICE || answerType === QuestionAnswerType.MULTIPLE_CHOICE || answerType === QuestionAnswerType.ORDERED_ITEMS) {
    const sequences = correctSequences(answerType, correctAnswer);
    if (!sequences || sequences.length === 0 || new Set(sequences).size !== sequences.length) throw optionInvalid("Turutan jawapan betul tidak sah.");
    return;
  }
  if (answerType === QuestionAnswerType.MATCHING_PAIRS) {
    const object = asRecord(correctAnswer);
    const pairs = object?.pairs;
    if (!Array.isArray(pairs) || pairs.length === 0 || pairs.some((pair) => {
      const item = asRecord(pair);
      return !item || !Number.isInteger(item.sourceSequence) || !Number.isInteger(item.targetSequence) || (item.sourceSequence as number) < 0 || (item.targetSequence as number) < 0;
    })) {
      throw optionInvalid("Pasangan jawapan betul tidak sah.");
    }
  }
}

function assertOptionsCompatible(answerType: QuestionAnswerType): void {
  if (!OPTION_ANSWER_TYPES.has(answerType)) {
    throw optionInvalid("Jenis jawapan ini tidak menerima pilihan jawapan.");
  }
}

function assertContiguousSequences(options: Array<{ sequence: number }>): void {
  const values = options.map((option) => option.sequence).sort((left, right) => left - right);
  if (values.some((value, index) => value !== index)) throw optionInvalid("Turutan pilihan mesti bermula pada 0 tanpa jurang.");
}

function assertActivationOptions(record: QuestionBankItemRecord): void {
  assertCorrectAnswerShape(record.answerType, record.correctAnswer, true);
  const options = record.answerOptions;
  if (record.answerType === QuestionAnswerType.NONE || record.answerType === QuestionAnswerType.TEXT) {
    if (options.length > 0) throw optionInvalid("Jenis jawapan ini tidak boleh mempunyai pilihan jawapan.");
    return;
  }
  assertOptionsCompatible(record.answerType);
  assertContiguousSequences(options);
  const correct = options.filter((option) => option.isCorrect);
  if (record.answerType === QuestionAnswerType.SINGLE_CHOICE) {
    if (correct.length !== 1) throw optionInvalid("SINGLE_CHOICE memerlukan tepat satu pilihan betul.");
    if (correctSequences(record.answerType, record.correctAnswer)?.[0] !== correct[0]?.sequence) throw optionInvalid("Jawapan betul tidak sepadan dengan pilihan.");
    return;
  }
  if (record.answerType === QuestionAnswerType.MULTIPLE_CHOICE) {
    if (correct.length === 0) throw optionInvalid("MULTIPLE_CHOICE memerlukan sekurang-kurangnya satu pilihan betul.");
    const selected = correctSequences(record.answerType, record.correctAnswer) ?? [];
    if (selected.length !== correct.length || selected.some((entry) => !correct.some((option) => option.sequence === entry))) throw optionInvalid("Jawapan berbilang tidak sepadan dengan pilihan.");
    return;
  }
  if (record.answerType === QuestionAnswerType.BOOLEAN) {
    const expected = booleanAnswer(record.correctAnswer);
    const standardized = options.length === 2 && options.some((option) => option.sequence === 0 && option.content.toLowerCase() === "false") && options.some((option) => option.sequence === 1 && option.content.toLowerCase() === "true");
    if (!standardized || expected === null || correct.length !== 1 || correct[0]?.content.toLowerCase() !== String(expected)) throw optionInvalid("Pilihan BOOLEAN mesti menggunakan false dan true yang standard.");
    return;
  }
  if (record.answerType === QuestionAnswerType.ORDERED_ITEMS) {
    const ordered = correctSequences(record.answerType, record.correctAnswer) ?? [];
    if (options.length < 2 || ordered.length !== options.length || new Set(ordered).size !== options.length || ordered.some((entry) => !options.some((option) => option.sequence === entry))) throw optionInvalid("Jawapan ORDERED_ITEMS tidak sepadan dengan semua pilihan.");
    return;
  }
  const pairs = (asRecord(record.correctAnswer)?.pairs ?? []) as unknown[];
  const validPairs = pairs.every((pair) => {
    const value = asRecord(pair);
    return value && options.some((option) => option.sequence === value.sourceSequence) && options.some((option) => option.sequence === value.targetSequence);
  });
  if (options.length < 2 || !validPairs) throw optionInvalid("Pasangan jawapan tidak sepadan dengan pilihan.");
}

function extensionOf(mediaKey: string): string {
  const extension = mediaKey.split(".").pop()?.toLowerCase();
  return extension ?? "";
}

function assertMediaType(mediaKey: string, mediaRole: MediaRole, mimeType?: string | null): void {
  const extension = extensionOf(mediaKey);
  const normalizedMime = mimeType?.toLowerCase() ?? "";
  if (IMAGE_ROLES.has(mediaRole)) {
    if (!IMAGE_EXTENSIONS.has(extension) || (normalizedMime && !normalizedMime.startsWith("image/")) || !["activity-image/", "tracing-asset/"].some((prefix) => mediaKey.startsWith(prefix))) throw mediaInvalid("Peranan imej memerlukan fail imej yang sesuai.");
    return;
  }
  if (AUDIO_ROLES.has(mediaRole)) {
    if (!AUDIO_EXTENSIONS.has(extension) || (normalizedMime && !normalizedMime.startsWith("audio/")) || !mediaKey.startsWith("activity-audio/")) throw mediaInvalid("Peranan audio memerlukan fail audio yang sesuai.");
    return;
  }
  if (!VIDEO_EXTENSIONS.has(extension) || (normalizedMime && !normalizedMime.startsWith("video/")) || !mediaKey.startsWith("activity-video/")) {
    throw mediaInvalid("Peranan video memerlukan fail video yang sesuai.");
  }
}

async function assertMediaExists(mediaKey: string, mediaRole: MediaRole, mimeType?: string | null): Promise<void> {
  try {
    assertSafeStorageKey(mediaKey);
    assertMediaType(mediaKey, mediaRole, mimeType);
    if (!(await getStorageAdapter().exists(mediaKey))) throw mediaInvalid("Fail media tidak ditemui dalam storan.");
  } catch (caught) {
    if (caught instanceof AppError && caught.code === "QUESTION_BANK_MEDIA_INVALID") throw caught;
    throw mediaInvalid();
  }
}

async function validateCurriculumLink(programmeId: string, input: CreateCurriculumLinkBody): Promise<void> {
  const [skill, contentStandard, learningStandard, year] = await Promise.all([
    input.remedialSkillId ? prisma.remedialSkill.findUnique({ where: { id: input.remedialSkillId }, select: { programmeId: true, languageStructureId: true } }) : null,
    input.contentStandardId ? prisma.contentStandard.findUnique({ where: { id: input.contentStandardId }, select: { programmeId: true, curriculumYearId: true } }) : null,
    input.learningStandardId ? prisma.learningStandard.findUnique({ where: { id: input.learningStandardId }, select: { contentStandard: { select: { programmeId: true, curriculumYearId: true, id: true } } } }) : null,
    input.curriculumYearId ? prisma.curriculumYear.findUnique({ where: { id: input.curriculumYearId }, select: { programmeId: true } }) : null,
  ]);
  if ((input.remedialSkillId && !skill) || (input.contentStandardId && !contentStandard) || (input.learningStandardId && !learningStandard) || (input.curriculumYearId && !year)) throw linkInvalid();
  const programmeIds = [skill?.programmeId, contentStandard?.programmeId, learningStandard?.contentStandard.programmeId, year?.programmeId].filter((id): id is string => Boolean(id));
  if (programmeIds.some((id) => id !== programmeId)) throw linkInvalid("Semua pautan mesti daripada program kurikulum yang sama.");
  if (input.learningStandardId && input.contentStandardId && learningStandard?.contentStandard.id !== input.contentStandardId) throw linkInvalid("SP mesti sepadan dengan SK yang diberikan.");
  const impliedYearId = contentStandard?.curriculumYearId ?? learningStandard?.contentStandard.curriculumYearId;
  if (input.curriculumYearId && impliedYearId && input.curriculumYearId !== impliedYearId) throw linkInvalid("SP atau SK mesti sepadan dengan Tahun kurikulum yang diberikan.");
}

function linkWhere(input: CreateCurriculumLinkBody): Prisma.QuestionBankCurriculumLinkWhereInput {
  return {
    remedialSkillId: input.remedialSkillId ?? null,
    contentStandardId: input.contentStandardId ?? null,
    learningStandardId: input.learningStandardId ?? null,
    curriculumYearId: input.curriculumYearId ?? null,
  };
}

function questionItemOrderBy(sortBy: ListQuestionBankItemsQuery["sortBy"], sortOrder: SortOrder): Prisma.QuestionBankItemOrderByWithRelationInput {
  return { [sortBy]: sortOrder } as Prisma.QuestionBankItemOrderByWithRelationInput;
}

function questionItemWhere(query: ListQuestionBankItemsQuery, context: QuestionBankAuditContext): Prisma.QuestionBankItemWhereInput {
  const curriculumFilters: Prisma.QuestionBankCurriculumLinkWhereInput[] = [];
  if (query.yearLevel) curriculumFilters.push({ OR: [{ curriculumYear: { yearLevel: query.yearLevel } }, { contentStandard: { curriculumYear: { yearLevel: query.yearLevel } } }] });
  if (query.languageStructureId) curriculumFilters.push({ remedialSkill: { languageStructureId: query.languageStructureId } });
  if (query.remedialSkillId) curriculumFilters.push({ remedialSkillId: query.remedialSkillId });
  if (query.contentStandardId) curriculumFilters.push({ contentStandardId: query.contentStandardId });
  if (query.learningStandardId) curriculumFilters.push({ learningStandardId: query.learningStandardId });
  const mediaFilters: Prisma.QuestionBankItemWhereInput[] = [];
  if (query.hasImage !== undefined) {
    mediaFilters.push({ mediaLinks: query.hasImage ? { some: { mediaRole: { in: [MediaRole.PRIMARY_IMAGE, MediaRole.SUPPORTING_IMAGE] } } } : { none: { mediaRole: { in: [MediaRole.PRIMARY_IMAGE, MediaRole.SUPPORTING_IMAGE] } } } });
  }
  if (query.hasAudio !== undefined) {
    mediaFilters.push({ mediaLinks: query.hasAudio ? { some: { mediaRole: { in: [MediaRole.REFERENCE_AUDIO, MediaRole.INSTRUCTION_AUDIO] } } } : { none: { mediaRole: { in: [MediaRole.REFERENCE_AUDIO, MediaRole.INSTRUCTION_AUDIO] } } } });
  }
  if (query.hasVideo !== undefined) {
    mediaFilters.push({ mediaLinks: query.hasVideo ? { some: { mediaRole: MediaRole.REFERENCE_VIDEO } } : { none: { mediaRole: MediaRole.REFERENCE_VIDEO } } });
  }
  return {
    ...(context.actor.role === UserRole.TEACHER ? { status: QuestionBankStatus.ACTIVE } : query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.difficulty ? { difficulty: query.difficulty } : {}),
    ...(query.programmeId ? { programmeId: query.programmeId } : {}),
    ...(query.curriculumVersionId ? { programme: { curriculumVersionId: query.curriculumVersionId } } : {}),
    ...(query.createdByUserId ? { createdByUserId: query.createdByUserId } : {}),
    ...(query.search ? { OR: [
      { title: { contains: query.search, mode: "insensitive" } },
      { content: { contains: query.search, mode: "insensitive" } },
      { normalizedText: { contains: normalizeText(query.search), mode: "insensitive" } },
      { languagePattern: { contains: query.search, mode: "insensitive" } },
      { instructions: { contains: query.search, mode: "insensitive" } },
      { sourceReference: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
    ...(curriculumFilters.length ? { curriculumLinks: { some: { AND: curriculumFilters } } } : {}),
    ...(mediaFilters.length ? { AND: mediaFilters } : {}),
  };
}

export async function createQuestionBankItem(input: CreateQuestionBankItemBody, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  await assertProgrammeUsable(input.programmeId);
  assertCorrectAnswerShape(input.answerType, input.correctAnswer, false);
  await assertDuplicatePolicy(input.programmeId, input.type, input.content, context, input.allowDuplicateOverride);
  const item = await prisma.questionBankItem.create({
    data: {
      programmeId: input.programmeId,
      createdByUserId: context.actor.userId,
      type: input.type,
      title: input.title ?? null,
      content: input.content,
      normalizedText: normalizeText(input.content),
      languagePattern: input.languagePattern ?? null,
      instructions: input.instructions ?? null,
      explanation: input.explanation ?? null,
      answerType: input.answerType,
      ...(input.correctAnswer !== undefined ? { correctAnswer: safeOptionalJson(input.correctAnswer) } : {}),
      difficulty: input.difficulty,
      sourceReference: input.sourceReference ?? null,
      ...(input.metadata !== undefined ? { metadata: safeOptionalJson(input.metadata) } : {}),
    },
    include: itemInclude,
  });
  await recordAuditEvent(auditEvent(context, "QUESTION_BANK_ITEM_CREATED", item.id, null, safeAuditItem(item)));
  return itemDto(item);
}

export async function listQuestionBankItems(query: ListQuestionBankItemsQuery, context: QuestionBankAuditContext) {
  assertReadAccess(context);
  const where = questionItemWhere(query, context);
  const [items, total] = await Promise.all([
    prisma.questionBankItem.findMany({ where, include: itemInclude, skip: (query.page - 1) * query.limit, take: query.limit, orderBy: questionItemOrderBy(query.sortBy, query.sortOrder) }),
    prisma.questionBankItem.count({ where }),
  ]);
  const totalPages = Math.ceil(total / query.limit);
  return { items: items.map(itemListDto), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

export async function getQuestionBankItem(itemId: string, context: QuestionBankAuditContext) {
  const item = await getItemRecord(itemId);
  assertVisible(item, context);
  return itemDto(item);
}

export async function updateQuestionBankItem(itemId: string, input: UpdateQuestionBankItemBody, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const existing = await getItemRecord(itemId);
  assertDraft(existing);
  const content = input.content ?? existing.content;
  const answerType = input.answerType ?? existing.answerType;
  const correctAnswer = input.correctAnswer === undefined ? existing.correctAnswer : input.correctAnswer;
  assertCorrectAnswerShape(answerType, correctAnswer, false);
  if (input.content !== undefined) await assertDuplicatePolicy(existing.programmeId, existing.type, input.content, context, input.allowDuplicateOverride, itemId);
  const updated = await prisma.questionBankItem.update({
    where: { id: itemId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content, normalizedText: normalizeText(input.content) } : {}),
      ...(input.languagePattern !== undefined ? { languagePattern: input.languagePattern } : {}),
      ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
      ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
      ...(input.answerType !== undefined ? { answerType: input.answerType } : {}),
      ...(input.correctAnswer !== undefined ? { correctAnswer: safeOptionalJson(input.correctAnswer) } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
      ...(input.sourceReference !== undefined ? { sourceReference: input.sourceReference } : {}),
      ...(input.metadata !== undefined ? { metadata: safeOptionalJson(input.metadata) } : {}),
    },
    include: itemInclude,
  });
  await recordAuditEvent(auditEvent(context, "QUESTION_BANK_ITEM_UPDATED", itemId, safeAuditItem(existing), safeAuditItem(updated)));
  return itemDto(updated);
}

export async function checkQuestionBankDuplicates(
  input: { programmeId: string; type: CreateQuestionBankItemBody["type"]; content: string; excludeItemId?: string },
  context: QuestionBankAuditContext,
) {
  assertManagementAccess(context);
  const duplicates = await findDuplicates(input.programmeId, input.type, input.content, input.excludeItemId);
  return { normalizedText: normalizeText(input.content), hasDuplicates: duplicates.length > 0, warningCode: duplicates.length ? "QUESTION_BANK_DUPLICATE" : null, duplicates };
}

export async function addQuestionBankCurriculumLink(itemId: string, input: CreateCurriculumLinkBody, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  await validateCurriculumLink(item.programmeId, input);
  let link;
  try {
    link = await prisma.$transaction(async (tx) => {
      const existing = await tx.questionBankCurriculumLink.findFirst({ where: { questionBankItemId: itemId, ...linkWhere(input) } });
      if (existing) throw appError("QUESTION_BANK_CURRICULUM_LINK_EXISTS", 409, "Pautan kurikulum yang sama telah wujud.");
      if (input.isPrimary) await tx.questionBankCurriculumLink.updateMany({ where: { questionBankItemId: itemId, isPrimary: true }, data: { isPrimary: false } });
      const created = await tx.questionBankCurriculumLink.create({ data: { questionBankItemId: itemId, remedialSkillId: input.remedialSkillId ?? null, contentStandardId: input.contentStandardId ?? null, learningStandardId: input.learningStandardId ?? null, curriculumYearId: input.curriculumYearId ?? null, isPrimary: input.isPrimary } });
      await recordAuditEvent(auditEvent(context, "QUESTION_BANK_CURRICULUM_LINK_CREATED", created.id, null, { itemId, isPrimary: created.isPrimary }), { transactionClient: tx });
      return created;
    });
  } catch (caught) {
    if (isUniqueError(caught)) throw appError("QUESTION_BANK_CURRICULUM_LINK_EXISTS", 409, "Pautan kurikulum yang sama telah wujud.");
    throw caught;
  }
  return link;
}

export async function listQuestionBankCurriculumLinks(itemId: string, context: QuestionBankAuditContext) {
  const item = await getItemRecord(itemId);
  assertVisible(item, context);
  return itemDto(item).curriculumLinks;
}

export async function removeQuestionBankCurriculumLink(itemId: string, linkId: string, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  const link = await prisma.questionBankCurriculumLink.findFirst({ where: { id: linkId, questionBankItemId: itemId } });
  if (!link) throw linkInvalid("Pautan kurikulum tidak ditemui.");
  await prisma.$transaction(async (tx) => {
    await tx.questionBankCurriculumLink.delete({ where: { id: linkId } });
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_CURRICULUM_LINK_REMOVED", linkId, { itemId, isPrimary: link.isPrimary }, null), { transactionClient: tx });
  });
}

export async function addQuestionBankAnswerOption(itemId: string, input: CreateAnswerOptionBody, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  assertOptionsCompatible(item.answerType);
  let option;
  try {
    option = await prisma.questionBankAnswerOption.create({ data: { questionBankItemId: itemId, label: input.label ?? null, content: input.content, isCorrect: input.isCorrect, sequence: input.sequence, ...(input.metadata !== undefined ? { metadata: safeOptionalJson(input.metadata) } : {}) } });
  } catch (caught) {
    if (isUniqueError(caught)) throw optionInvalid("Turutan pilihan telah digunakan.");
    throw caught;
  }
  await recordAuditEvent(auditEvent(context, "QUESTION_BANK_OPTION_CREATED", option.id, null, { itemId, sequence: option.sequence, isCorrect: option.isCorrect }));
  return option;
}

export async function listQuestionBankAnswerOptions(itemId: string, context: QuestionBankAuditContext) {
  const item = await getItemRecord(itemId);
  assertVisible(item, context);
  return itemDto(item).options;
}

export async function updateQuestionBankAnswerOption(itemId: string, optionId: string, input: UpdateAnswerOptionBody, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  const before = await prisma.questionBankAnswerOption.findFirst({ where: { id: optionId, questionBankItemId: itemId } });
  if (!before) throw optionNotFound();
  const option = await prisma.questionBankAnswerOption.update({ where: { id: optionId }, data: { ...(input.label !== undefined ? { label: input.label } : {}), ...(input.content !== undefined ? { content: input.content } : {}), ...(input.isCorrect !== undefined ? { isCorrect: input.isCorrect } : {}), ...(input.metadata !== undefined ? { metadata: safeOptionalJson(input.metadata) } : {}) } });
  await recordAuditEvent(auditEvent(context, "QUESTION_BANK_OPTION_UPDATED", optionId, { itemId, sequence: before.sequence, isCorrect: before.isCorrect }, { itemId, sequence: option.sequence, isCorrect: option.isCorrect }));
  return option;
}

export async function removeQuestionBankAnswerOption(itemId: string, optionId: string, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  const option = await prisma.questionBankAnswerOption.findFirst({ where: { id: optionId, questionBankItemId: itemId } });
  if (!option) throw optionNotFound();
  await prisma.$transaction(async (tx) => {
    await tx.questionBankAnswerOption.delete({ where: { id: optionId } });
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_OPTION_REMOVED", optionId, { itemId, sequence: option.sequence }, null), { transactionClient: tx });
  });
}

export async function reorderQuestionBankOptions(itemId: string, optionIds: string[], context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  await prisma.$transaction(async (tx) => {
    const options = await tx.questionBankAnswerOption.findMany({ where: { questionBankItemId: itemId }, select: { id: true } });
    if (options.length !== optionIds.length || options.some((option) => !optionIds.includes(option.id))) throw optionInvalid("Susunan mesti mengandungi semua pilihan untuk item ini.");
    const offset = options.length + 100_000;
    await Promise.all(options.map((option, index) => tx.questionBankAnswerOption.update({ where: { id: option.id }, data: { sequence: offset + index } })));
    await Promise.all(optionIds.map((optionId, index) => tx.questionBankAnswerOption.update({ where: { id: optionId }, data: { sequence: index } })));
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_OPTIONS_REORDERED", itemId, null, { optionCount: optionIds.length }), { transactionClient: tx });
  });
}

export async function addQuestionBankMedia(itemId: string, input: CreateQuestionBankMediaBody, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  await assertMediaExists(input.mediaKey, input.mediaRole, input.mimeType);
  let media;
  try {
    media = await prisma.questionBankMedia.create({ data: { questionBankItemId: itemId, mediaKey: input.mediaKey, mediaRole: input.mediaRole, mimeType: input.mimeType ?? null, originalName: input.originalName ?? null, sequence: input.sequence, altText: input.altText ?? null } });
  } catch (caught) {
    if (isUniqueError(caught)) throw mediaInvalid("Turutan media untuk peranan ini telah digunakan.");
    throw caught;
  }
  await recordAuditEvent(auditEvent(context, "QUESTION_BANK_MEDIA_LINKED", media.id, null, { itemId, mediaRole: media.mediaRole, sequence: media.sequence, mimeType: media.mimeType }));
  return { ...media, url: getStorageAdapter().getPublicUrl(media.mediaKey) };
}

export async function listQuestionBankMedia(itemId: string, context: QuestionBankAuditContext) {
  const item = await getItemRecord(itemId);
  assertVisible(item, context);
  return itemDto(item).media;
}

export async function removeQuestionBankMedia(itemId: string, mediaLinkId: string, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  const media = await prisma.questionBankMedia.findFirst({ where: { id: mediaLinkId, questionBankItemId: itemId } });
  if (!media) throw mediaNotFound();
  await prisma.$transaction(async (tx) => {
    await tx.questionBankMedia.delete({ where: { id: mediaLinkId } });
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_MEDIA_UNLINKED", mediaLinkId, { itemId, mediaRole: media.mediaRole, sequence: media.sequence }, null), { transactionClient: tx });
  });
}

export async function reorderQuestionBankMedia(itemId: string, mediaLinkIds: string[], context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  assertDraft(item);
  await prisma.$transaction(async (tx) => {
    const media = await tx.questionBankMedia.findMany({ where: { questionBankItemId: itemId }, select: { id: true, mediaRole: true } });
    if (media.length !== mediaLinkIds.length || media.some((entry) => !mediaLinkIds.includes(entry.id))) throw mediaInvalid("Susunan mesti mengandungi semua pautan media untuk item ini.");
    const offset = media.length + 100_000;
    await Promise.all(media.map((entry, index) => tx.questionBankMedia.update({ where: { id: entry.id }, data: { sequence: offset + index } })));
    const roleSequences = new Map<MediaRole, number>();
    await Promise.all(mediaLinkIds.map(async (mediaLinkId) => {
      const entry = media.find((candidate) => candidate.id === mediaLinkId);
      if (!entry) throw mediaInvalid();
      const nextSequence = roleSequences.get(entry.mediaRole) ?? 0;
      roleSequences.set(entry.mediaRole, nextSequence + 1);
      await tx.questionBankMedia.update({ where: { id: mediaLinkId }, data: { sequence: nextSequence } });
    }));
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_MEDIA_REORDERED", itemId, null, { mediaCount: mediaLinkIds.length }), { transactionClient: tx });
  });
}

export async function activateQuestionBankItem(itemId: string, context: QuestionBankAuditContext, allowDuplicateOverride?: boolean) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  if (item.status !== QuestionBankStatus.DRAFT) throw statusInvalid();
  const issues: string[] = [];
  try { await assertProgrammeUsable(item.programmeId); } catch { issues.push("PROGRAMME_INVALID"); }
  if (!item.content.trim()) issues.push("CONTENT_INVALID");
  if (item.curriculumLinks.length === 0) issues.push("CURRICULUM_LINK_REQUIRED");
  for (const link of item.curriculumLinks) {
    try {
      await validateCurriculumLink(item.programmeId, { remedialSkillId: link.remedialSkillId ?? undefined, contentStandardId: link.contentStandardId ?? undefined, learningStandardId: link.learningStandardId ?? undefined, curriculumYearId: link.curriculumYearId ?? undefined, isPrimary: link.isPrimary });
    } catch { issues.push("CURRICULUM_LINK_INVALID"); break; }
  }
  try { assertActivationOptions(item); } catch { issues.push("ANSWER_CONFIGURATION_INVALID"); }
  for (const media of item.mediaLinks) {
    try { await assertMediaExists(media.mediaKey, media.mediaRole, media.mimeType); } catch { issues.push("MEDIA_INVALID"); break; }
  }
  const duplicates = await findDuplicates(item.programmeId, item.type, item.content, item.id);
  if (duplicates.length && !(allowDuplicateOverride && context.actor.role === UserRole.SUPER_ADMIN)) issues.push("DUPLICATE_CONFLICT");
  if (issues.length) throw appError("QUESTION_BANK_ACTIVATION_INVALID", 400, "Item bank soalan belum memenuhi syarat aktivasi.", { issues });
  const activated = await prisma.$transaction(async (tx) => {
    const updated = await tx.questionBankItem.update({ where: { id: itemId }, data: { status: QuestionBankStatus.ACTIVE, publishedAt: new Date() }, include: itemInclude });
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_ITEM_ACTIVATED", itemId, safeAuditItem(item), safeAuditItem(updated)), { transactionClient: tx, strict: true });
    return updated;
  });
  return itemDto(activated);
}

export async function archiveQuestionBankItem(itemId: string, context: QuestionBankAuditContext) {
  assertManagementAccess(context);
  const item = await getItemRecord(itemId);
  if (item.status !== QuestionBankStatus.ACTIVE) throw statusInvalid();
  const archived = await prisma.$transaction(async (tx) => {
    const updated = await tx.questionBankItem.update({ where: { id: itemId }, data: { status: QuestionBankStatus.ARCHIVED, archivedAt: new Date() }, include: itemInclude });
    await recordAuditEvent(auditEvent(context, "QUESTION_BANK_ITEM_ARCHIVED", itemId, safeAuditItem(item), safeAuditItem(updated)), { transactionClient: tx, strict: true });
    return updated;
  });
  return itemDto(archived);
}

export { normalizeText };
