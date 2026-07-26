import {
  CurriculumDomain,
  CurriculumRecordStatus,
  CurriculumStatus,
  Prisma,
  UserRole,
} from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import {
  dispatchAuditEvent,
  recordAuditEvent,
  type AuditEvent,
} from "./audit.service.js";

export interface CurriculumAuditContext {
  actor: AuthenticatedSession & { name?: string | null };
  requestIp?: string | null;
  userAgent?: string | null;
}

type SortOrder = "asc" | "desc";

interface PaginationQuery {
  page: number;
  limit: number;
}

export interface CreateCurriculumVersionInput {
  code: string;
  name: string;
  description?: string | null;
  sourceYear?: number | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
}

export interface UpdateCurriculumVersionInput {
  code?: string;
  name?: string;
  description?: string | null;
  sourceYear?: number | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
}

export interface ListCurriculumVersionsQuery extends PaginationQuery {
  status?: CurriculumStatus;
  sourceYear?: number;
  search?: string;
  sortBy?: "code" | "name" | "sourceYear" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateSubjectInput {
  code: string;
  name: string;
  description?: string | null;
  status?: CurriculumRecordStatus;
}

export interface UpdateSubjectInput {
  code?: string;
  name?: string;
  description?: string | null;
  status?: CurriculumRecordStatus;
}

export interface ListSubjectsQuery extends PaginationQuery {
  status?: CurriculumRecordStatus;
  search?: string;
  sortBy?: "code" | "name" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateProgrammeInput {
  curriculumVersionId: string;
  subjectId: string;
  code: string;
  name: string;
  description?: string | null;
  status?: CurriculumRecordStatus;
}

export interface UpdateProgrammeInput {
  subjectId?: string;
  code?: string;
  name?: string;
  description?: string | null;
  status?: CurriculumRecordStatus;
}

export interface ListProgrammesQuery extends PaginationQuery {
  curriculumVersionId?: string;
  subjectId?: string;
  status?: CurriculumRecordStatus;
  search?: string;
  sortBy?: "code" | "name" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateCurriculumYearInput {
  yearLevel: number;
  name: string;
  sequence: number;
  status?: CurriculumRecordStatus;
}

export interface UpdateCurriculumYearInput {
  yearLevel?: number;
  name?: string;
  sequence?: number;
  status?: CurriculumRecordStatus;
}

export interface ListCurriculumYearsQuery extends PaginationQuery {
  status?: CurriculumRecordStatus;
  search?: string;
  sortBy?: "sequence" | "yearLevel" | "name" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateLanguageStructureInput {
  code: string;
  name: string;
  description?: string | null;
  sequence: number;
  status?: CurriculumRecordStatus;
}

export interface UpdateLanguageStructureInput {
  code?: string;
  name?: string;
  description?: string | null;
  sequence?: number;
  status?: CurriculumRecordStatus;
}

export interface ListLanguageStructuresQuery extends PaginationQuery {
  status?: CurriculumRecordStatus;
  search?: string;
  sortBy?: "sequence" | "code" | "name" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateRemedialSkillInput {
  languageStructureId: string;
  code: string;
  sequence: number;
  name: string;
  description?: string | null;
  isPreparatory?: boolean;
  status?: CurriculumRecordStatus;
}

export interface UpdateRemedialSkillInput {
  languageStructureId?: string;
  code?: string;
  sequence?: number;
  name?: string;
  description?: string | null;
  isPreparatory?: boolean;
  status?: CurriculumRecordStatus;
}

export interface ListRemedialSkillsQuery extends PaginationQuery {
  languageStructureId?: string;
  status?: CurriculumRecordStatus;
  isPreparatory?: boolean;
  search?: string;
  sortBy?: "sequence" | "code" | "name" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateContentStandardInput {
  curriculumYearId: string;
  code: string;
  title: string;
  description?: string | null;
  domain: CurriculumDomain;
  sequence?: number | null;
  status?: CurriculumRecordStatus;
}

export interface UpdateContentStandardInput {
  curriculumYearId?: string;
  code?: string;
  title?: string;
  description?: string | null;
  domain?: CurriculumDomain;
  sequence?: number | null;
  status?: CurriculumRecordStatus;
}

export interface ListContentStandardsQuery extends PaginationQuery {
  curriculumYearId?: string;
  yearLevel?: number;
  domain?: CurriculumDomain;
  status?: CurriculumRecordStatus;
  search?: string;
  sortBy?: "sequence" | "code" | "title" | "domain" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateLearningStandardInput {
  code: string;
  description: string;
  sequence?: number | null;
  status?: CurriculumRecordStatus;
}

export interface UpdateLearningStandardInput {
  code?: string;
  description?: string;
  sequence?: number | null;
  status?: CurriculumRecordStatus;
}

export interface ListLearningStandardsQuery extends PaginationQuery {
  status?: CurriculumRecordStatus;
  search?: string;
  sortBy?: "sequence" | "code" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface CreateSkillStandardMappingInput {
  isPrimary?: boolean;
  notes?: string | null;
}

export interface CreateLearningObjectiveInput {
  code?: string | null;
  description: string;
  sequence: number;
  status?: CurriculumRecordStatus;
}

export interface UpdateLearningObjectiveInput {
  code?: string | null;
  description?: string;
  sequence?: number;
  status?: CurriculumRecordStatus;
}

export interface CreateSuggestedTeachingActivityInput {
  learningObjectiveId?: string | null;
  title?: string | null;
  description: string;
  sequence: number;
  sourceReference?: string | null;
  status?: CurriculumRecordStatus;
}

export interface UpdateSuggestedTeachingActivityInput {
  learningObjectiveId?: string | null;
  title?: string | null;
  description?: string;
  sequence?: number;
  sourceReference?: string | null;
  status?: CurriculumRecordStatus;
}

export interface CurriculumTreeQuery {
  include?: "summary" | "full";
}

export interface PublicationIssue {
  code: string;
  path: string;
  message: string;
}

const versionSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  sourceYear: true,
  effectiveFrom: true,
  effectiveTo: true,
  status: true,
  publishedAt: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { programmes: true } },
} satisfies Prisma.CurriculumVersionSelect;

const subjectSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { programmes: true } },
} satisfies Prisma.SubjectSelect;

const programmeSelect = {
  id: true,
  curriculumVersionId: true,
  subjectId: true,
  code: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  curriculumVersion: {
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      publishedAt: true,
      archivedAt: true,
    },
  },
  subject: { select: { id: true, code: true, name: true, status: true } },
  _count: {
    select: {
      years: true,
      languageStructures: true,
      remedialSkills: true,
      contentStandards: true,
    },
  },
} satisfies Prisma.CurriculumProgrammeSelect;

type VersionRecord = Prisma.CurriculumVersionGetPayload<{ select: typeof versionSelect }>;
type SubjectRecord = Prisma.SubjectGetPayload<{ select: typeof subjectSelect }>;
type ProgrammeRecord = Prisma.CurriculumProgrammeGetPayload<{ select: typeof programmeSelect }>;

function appError(code: string, statusCode: number, message: string, details?: unknown): AppError {
  return new AppError(code, statusCode, message, details);
}

function versionNotFound(): AppError { return appError("CURRICULUM_VERSION_NOT_FOUND", 404, "Versi kurikulum tidak ditemui."); }
function subjectNotFound(): AppError { return appError("CURRICULUM_SUBJECT_NOT_FOUND", 404, "Subjek kurikulum tidak ditemui."); }
function programmeNotFound(): AppError { return appError("CURRICULUM_PROGRAMME_NOT_FOUND", 404, "Program kurikulum tidak ditemui."); }
function yearNotFound(): AppError { return appError("CURRICULUM_YEAR_NOT_FOUND", 404, "Tahun kurikulum tidak ditemui."); }
function structureNotFound(): AppError { return appError("CURRICULUM_STRUCTURE_NOT_FOUND", 404, "Struktur bahasa tidak ditemui."); }
function skillNotFound(): AppError { return appError("CURRICULUM_SKILL_NOT_FOUND", 404, "Kemahiran pemulihan tidak ditemui."); }
function contentStandardNotFound(): AppError { return appError("CURRICULUM_CONTENT_STANDARD_NOT_FOUND", 404, "Standard Kandungan tidak ditemui."); }
function learningStandardNotFound(): AppError { return appError("CURRICULUM_LEARNING_STANDARD_NOT_FOUND", 404, "Standard Pembelajaran tidak ditemui."); }
function objectiveNotFound(): AppError { return appError("CURRICULUM_OBJECTIVE_NOT_FOUND", 404, "Objektif pembelajaran tidak ditemui."); }
function suggestedActivityNotFound(): AppError { return appError("CURRICULUM_SUGGESTED_ACTIVITY_NOT_FOUND", 404, "Cadangan aktiviti pengajaran tidak ditemui."); }
function mappingNotFound(): AppError { return appError("CURRICULUM_MAPPING_NOT_FOUND", 404, "Pautan kemahiran dan standard pembelajaran tidak ditemui."); }
function accessDenied(): AppError { return appError("CURRICULUM_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses kurikulum ini."); }
function notEditable(): AppError { return appError("CURRICULUM_VERSION_NOT_EDITABLE", 409, "Versi kurikulum ini tidak boleh diubah."); }
function codeConflict(): AppError { return appError("CURRICULUM_CODE_CONFLICT", 409, "Kod kurikulum telah digunakan."); }
function sequenceConflict(): AppError { return appError("CURRICULUM_SEQUENCE_CONFLICT", 409, "Turutan kurikulum telah digunakan."); }
function mappingExists(): AppError { return appError("CURRICULUM_MAPPING_EXISTS", 409, "Pautan kemahiran dan standard pembelajaran telah wujud."); }
function crossVersionLink(): AppError { return appError("CURRICULUM_CROSS_VERSION_LINK", 400, "Rekod kurikulum mesti berada dalam program dan versi yang sama."); }

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeStandardCode(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  return value.trim();
}

function assertDateRange(effectiveFrom: Date | null | undefined, effectiveTo: Date | null | undefined): void {
  if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
    throw appError("CURRICULUM_IMPORT_INVALID", 400, "Tarikh mula kuat kuasa tidak boleh melebihi tarikh tamat kuat kuasa.");
  }
}

function assertReadAccess(context: CurriculumAuditContext): void {
  const readRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER];
  if (!readRoles.includes(context.actor.role)) throw accessDenied();
}

function assertManagementAccess(context: CurriculumAuditContext): void {
  const managementRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
  if (!managementRoles.includes(context.actor.role)) throw accessDenied();
}

function assertSuperAdmin(context: CurriculumAuditContext): void {
  if (context.actor.role !== UserRole.SUPER_ADMIN) throw accessDenied();
}

function assertTeacherPublished(status: CurriculumStatus, context: CurriculumAuditContext): void {
  if (context.actor.role === UserRole.TEACHER && status !== CurriculumStatus.PUBLISHED) throw accessDenied();
}

function assertDraft(status: CurriculumStatus): void {
  if (status !== CurriculumStatus.DRAFT) throw notEditable();
}

function pagination(page: number, limit: number, total: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function versionOrderBy(sortBy: ListCurriculumVersionsQuery["sortBy"], sortOrder: SortOrder): Prisma.CurriculumVersionOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "name": return { name: sortOrder };
    case "sourceYear": return { sourceYear: sortOrder };
    case "status": return { status: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { createdAt: sortOrder };
  }
}

function subjectOrderBy(sortBy: ListSubjectsQuery["sortBy"], sortOrder: SortOrder): Prisma.SubjectOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "name": return { name: sortOrder };
    case "status": return { status: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { createdAt: sortOrder };
  }
}

function programmeOrderBy(sortBy: ListProgrammesQuery["sortBy"], sortOrder: SortOrder): Prisma.CurriculumProgrammeOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "name": return { name: sortOrder };
    case "status": return { status: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { createdAt: sortOrder };
  }
}

function yearOrderBy(sortBy: ListCurriculumYearsQuery["sortBy"], sortOrder: SortOrder): Prisma.CurriculumYearOrderByWithRelationInput {
  switch (sortBy) {
    case "yearLevel": return { yearLevel: sortOrder };
    case "name": return { name: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

function structureOrderBy(sortBy: ListLanguageStructuresQuery["sortBy"], sortOrder: SortOrder): Prisma.LanguageStructureOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "name": return { name: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

function skillOrderBy(sortBy: ListRemedialSkillsQuery["sortBy"], sortOrder: SortOrder): Prisma.RemedialSkillOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "name": return { name: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

function contentStandardOrderBy(sortBy: ListContentStandardsQuery["sortBy"], sortOrder: SortOrder): Prisma.ContentStandardOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "title": return { title: sortOrder };
    case "domain": return { domain: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

function learningStandardOrderBy(sortBy: ListLearningStandardsQuery["sortBy"], sortOrder: SortOrder): Prisma.LearningStandardOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

function mapUniqueError(caught: unknown): AppError | null {
  if (!(caught instanceof Prisma.PrismaClientKnownRequestError) || caught.code !== "P2002") return null;
  const target = Array.isArray(caught.meta?.target)
    ? caught.meta.target.join(" ").toLowerCase()
    : String(caught.meta?.target ?? "").toLowerCase();
  if (target.includes("remedialskillid") && target.includes("learningstandardid")) return mappingExists();
  if (target.includes("sequence")) return sequenceConflict();
  return codeConflict();
}

async function withUniqueConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (caught) {
    const mapped = mapUniqueError(caught);
    if (mapped) throw mapped;
    throw caught;
  }
}

function auditEvent(
  context: CurriculumAuditContext,
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
    resourceType: "CURRICULUM",
    resourceId,
    schoolId: null,
    before,
    after,
    timestamp: new Date(),
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

async function audit(
  context: CurriculumAuditContext,
  action: AuditEvent["action"],
  resourceId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await dispatchAuditEvent(auditEvent(context, action, resourceId, before, after));
}

function versionDto(record: VersionRecord) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    sourceYear: record.sourceYear,
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo,
    status: record.status,
    publishedAt: record.publishedAt,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    programmeCount: record._count.programmes,
  };
}

function versionAuditDto(record: VersionRecord) {
  return { id: record.id, code: record.code, name: record.name, status: record.status, sourceYear: record.sourceYear };
}

function subjectDto(record: SubjectRecord) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    programmeCount: record._count.programmes,
  };
}

function subjectAuditDto(record: SubjectRecord) {
  return { id: record.id, code: record.code, name: record.name, status: record.status };
}

function programmeDto(record: ProgrammeRecord) {
  return {
    id: record.id,
    curriculumVersionId: record.curriculumVersionId,
    subjectId: record.subjectId,
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.curriculumVersion,
    subject: record.subject,
    counts: {
      years: record._count.years,
      languageStructures: record._count.languageStructures,
      remedialSkills: record._count.remedialSkills,
      contentStandards: record._count.contentStandards,
    },
  };
}

function programmeAuditDto(record: ProgrammeRecord) {
  return { id: record.id, versionId: record.curriculumVersionId, subjectId: record.subjectId, code: record.code, name: record.name, status: record.status };
}

async function getVersionRecord(versionId: string): Promise<VersionRecord> {
  const record = await prisma.curriculumVersion.findUnique({ where: { id: versionId }, select: versionSelect });
  if (!record) throw versionNotFound();
  return record;
}

async function getSubjectRecord(subjectId: string): Promise<SubjectRecord> {
  const record = await prisma.subject.findUnique({ where: { id: subjectId }, select: subjectSelect });
  if (!record) throw subjectNotFound();
  return record;
}

async function getProgrammeRecord(programmeId: string): Promise<ProgrammeRecord> {
  const record = await prisma.curriculumProgramme.findUnique({ where: { id: programmeId }, select: programmeSelect });
  if (!record) throw programmeNotFound();
  return record;
}

function assertReadableProgramme(record: ProgrammeRecord, context: CurriculumAuditContext): void {
  assertReadAccess(context);
  assertTeacherPublished(record.curriculumVersion.status, context);
}

function assertEditableProgramme(record: ProgrammeRecord, context: CurriculumAuditContext): void {
  assertManagementAccess(context);
  assertDraft(record.curriculumVersion.status);
}

export async function createCurriculumVersion(data: CreateCurriculumVersionInput, context: CurriculumAuditContext) {
  assertManagementAccess(context);
  const code = normalizeCode(data.code);
  assertDateRange(data.effectiveFrom, data.effectiveTo);
  const existing = await prisma.curriculumVersion.findUnique({ where: { code }, select: { id: true } });
  if (existing) throw appError("CURRICULUM_VERSION_EXISTS", 409, "Kod versi kurikulum telah digunakan.");
  const record = await withUniqueConflict(() => prisma.curriculumVersion.create({
    data: {
      code,
      name: data.name.trim(),
      description: normalizeOptionalText(data.description) ?? null,
      sourceYear: data.sourceYear ?? null,
      effectiveFrom: data.effectiveFrom ?? null,
      effectiveTo: data.effectiveTo ?? null,
      status: CurriculumStatus.DRAFT,
    },
    select: versionSelect,
  }));
  const result = versionDto(record);
  await audit(context, "CURRICULUM_VERSION_CREATED", record.id, null, versionAuditDto(record));
  return result;
}

export async function listCurriculumVersions(query: ListCurriculumVersionsQuery, context: CurriculumAuditContext) {
  assertReadAccess(context);
  const search = query.search?.trim();
  const where: Prisma.CurriculumVersionWhereInput = {
    ...(context.actor.role === UserRole.TEACHER ? { status: CurriculumStatus.PUBLISHED } : query.status ? { status: query.status } : {}),
    ...(query.sourceYear !== undefined ? { sourceYear: query.sourceYear } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.curriculumVersion.findMany({
      where,
      select: versionSelect,
      orderBy: versionOrderBy(query.sortBy, query.sortOrder ?? "desc"),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.curriculumVersion.count({ where }),
  ]);
  return { versions: records.map(versionDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getCurriculumVersion(versionId: string, context: CurriculumAuditContext) {
  assertReadAccess(context);
  const record = await getVersionRecord(versionId);
  assertTeacherPublished(record.status, context);
  const programmes = await prisma.curriculumProgramme.findMany({
    where: { curriculumVersionId: versionId },
    select: programmeSelect,
    orderBy: { createdAt: "desc" },
  });
  return { version: versionDto(record), programmes: programmes.map(programmeDto) };
}

export async function updateCurriculumVersion(versionId: string, data: UpdateCurriculumVersionInput, context: CurriculumAuditContext) {
  assertManagementAccess(context);
  const before = await getVersionRecord(versionId);
  assertDraft(before.status);
  const code = data.code === undefined ? before.code : normalizeCode(data.code);
  if (code !== before.code) {
    const duplicate = await prisma.curriculumVersion.findUnique({ where: { code }, select: { id: true } });
    if (duplicate && duplicate.id !== versionId) throw appError("CURRICULUM_VERSION_EXISTS", 409, "Kod versi kurikulum telah digunakan.");
  }
  const effectiveFrom = data.effectiveFrom === undefined ? before.effectiveFrom : data.effectiveFrom;
  const effectiveTo = data.effectiveTo === undefined ? before.effectiveTo : data.effectiveTo;
  assertDateRange(effectiveFrom, effectiveTo);
  const record = await withUniqueConflict(() => prisma.curriculumVersion.update({
    where: { id: versionId },
    data: {
      ...(data.code !== undefined ? { code } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: normalizeOptionalText(data.description) } : {}),
      ...(data.sourceYear !== undefined ? { sourceYear: data.sourceYear } : {}),
      ...(data.effectiveFrom !== undefined ? { effectiveFrom: data.effectiveFrom } : {}),
      ...(data.effectiveTo !== undefined ? { effectiveTo: data.effectiveTo } : {}),
    },
    select: versionSelect,
  }));
  const result = versionDto(record);
  await audit(context, "CURRICULUM_VERSION_UPDATED", record.id, versionAuditDto(before), versionAuditDto(record));
  return result;
}

export async function createSubject(data: CreateSubjectInput, context: CurriculumAuditContext) {
  assertManagementAccess(context);
  const code = normalizeCode(data.code);
  const duplicate = await prisma.subject.findFirst({ where: { OR: [{ code }, { name: data.name.trim() }] }, select: { id: true } });
  if (duplicate) throw codeConflict();
  const record = await withUniqueConflict(() => prisma.subject.create({
    data: { code, name: data.name.trim(), description: normalizeOptionalText(data.description) ?? null, status: data.status ?? CurriculumRecordStatus.ACTIVE },
    select: subjectSelect,
  }));
  const result = subjectDto(record);
  await audit(context, "CURRICULUM_SUBJECT_CREATED", record.id, null, subjectAuditDto(record));
  return result;
}

export async function listSubjects(query: ListSubjectsQuery, context: CurriculumAuditContext) {
  assertReadAccess(context);
  const search = query.search?.trim();
  const where: Prisma.SubjectWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(context.actor.role === UserRole.TEACHER ? { programmes: { some: { curriculumVersion: { status: CurriculumStatus.PUBLISHED } } } } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.subject.findMany({ where, select: subjectSelect, orderBy: subjectOrderBy(query.sortBy, query.sortOrder ?? "desc"), skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.subject.count({ where }),
  ]);
  return { subjects: records.map(subjectDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getSubject(subjectId: string, context: CurriculumAuditContext) {
  assertReadAccess(context);
  const record = await getSubjectRecord(subjectId);
  if (context.actor.role === UserRole.TEACHER) {
    const publishedProgramme = await prisma.curriculumProgramme.findFirst({ where: { subjectId, curriculumVersion: { status: CurriculumStatus.PUBLISHED } }, select: { id: true } });
    if (!publishedProgramme) throw accessDenied();
  }
  return { subject: subjectDto(record) };
}

export async function updateSubject(subjectId: string, data: UpdateSubjectInput, context: CurriculumAuditContext) {
  assertManagementAccess(context);
  const before = await getSubjectRecord(subjectId);
  const immutableUse = await prisma.curriculumProgramme.findFirst({
    where: { subjectId, curriculumVersion: { status: { in: [CurriculumStatus.PUBLISHED, CurriculumStatus.ARCHIVED] } } },
    select: { id: true },
  });
  if (immutableUse) throw notEditable();
  const code = data.code === undefined ? before.code : normalizeCode(data.code);
  const name = data.name === undefined ? before.name : data.name.trim();
  if (code !== before.code || name !== before.name) {
    const duplicate = await prisma.subject.findFirst({ where: { id: { not: subjectId }, OR: [{ code }, { name }] }, select: { id: true } });
    if (duplicate) throw codeConflict();
  }
  const record = await withUniqueConflict(() => prisma.subject.update({
    where: { id: subjectId },
    data: {
      ...(data.code !== undefined ? { code } : {}),
      ...(data.name !== undefined ? { name } : {}),
      ...(data.description !== undefined ? { description: normalizeOptionalText(data.description) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: subjectSelect,
  }));
  const result = subjectDto(record);
  await audit(context, "CURRICULUM_SUBJECT_UPDATED", record.id, subjectAuditDto(before), subjectAuditDto(record));
  return result;
}

export async function createProgramme(data: CreateProgrammeInput, context: CurriculumAuditContext) {
  assertManagementAccess(context);
  const [version, subject] = await Promise.all([getVersionRecord(data.curriculumVersionId), getSubjectRecord(data.subjectId)]);
  assertDraft(version.status);
  const code = normalizeCode(data.code);
  const duplicate = await prisma.curriculumProgramme.findUnique({ where: { curriculumVersionId_code: { curriculumVersionId: version.id, code } }, select: { id: true } });
  if (duplicate) throw codeConflict();
  const record = await withUniqueConflict(() => prisma.curriculumProgramme.create({
    data: {
      curriculumVersionId: version.id,
      subjectId: subject.id,
      code,
      name: data.name.trim(),
      description: normalizeOptionalText(data.description) ?? null,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: programmeSelect,
  }));
  const result = programmeDto(record);
  await audit(context, "CURRICULUM_PROGRAMME_CREATED", record.id, null, programmeAuditDto(record));
  return result;
}

export async function listProgrammes(query: ListProgrammesQuery, context: CurriculumAuditContext) {
  assertReadAccess(context);
  const search = query.search?.trim();
  const where: Prisma.CurriculumProgrammeWhereInput = {
    ...(query.curriculumVersionId ? { curriculumVersionId: query.curriculumVersionId } : {}),
    ...(query.subjectId ? { subjectId: query.subjectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(context.actor.role === UserRole.TEACHER ? { curriculumVersion: { status: CurriculumStatus.PUBLISHED } } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.curriculumProgramme.findMany({ where, select: programmeSelect, orderBy: programmeOrderBy(query.sortBy, query.sortOrder ?? "desc"), skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.curriculumProgramme.count({ where }),
  ]);
  return { programmes: records.map(programmeDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getProgramme(programmeId: string, context: CurriculumAuditContext) {
  const record = await getProgrammeRecord(programmeId);
  assertReadableProgramme(record, context);
  return { programme: programmeDto(record) };
}

export async function updateProgramme(programmeId: string, data: UpdateProgrammeInput, context: CurriculumAuditContext) {
  const before = await getProgrammeRecord(programmeId);
  assertEditableProgramme(before, context);
  const subjectId = data.subjectId ?? before.subjectId;
  if (data.subjectId !== undefined) await getSubjectRecord(subjectId);
  const code = data.code === undefined ? before.code : normalizeCode(data.code);
  if (code !== before.code) {
    const duplicate = await prisma.curriculumProgramme.findUnique({ where: { curriculumVersionId_code: { curriculumVersionId: before.curriculumVersionId, code } }, select: { id: true } });
    if (duplicate && duplicate.id !== programmeId) throw codeConflict();
  }
  const record = await withUniqueConflict(() => prisma.curriculumProgramme.update({
    where: { id: programmeId },
    data: {
      ...(data.subjectId !== undefined ? { subjectId } : {}),
      ...(data.code !== undefined ? { code } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: normalizeOptionalText(data.description) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: programmeSelect,
  }));
  const result = programmeDto(record);
  await audit(context, "CURRICULUM_PROGRAMME_UPDATED", record.id, programmeAuditDto(before), programmeAuditDto(record));
  return result;
}

const yearSelect = {
  id: true,
  programmeId: true,
  yearLevel: true,
  name: true,
  sequence: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  programme: {
    select: {
      id: true,
      code: true,
      curriculumVersion: { select: { id: true, status: true } },
    },
  },
  _count: { select: { contentStandards: true } },
} satisfies Prisma.CurriculumYearSelect;

const structureSelect = {
  id: true,
  programmeId: true,
  code: true,
  name: true,
  description: true,
  sequence: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  programme: {
    select: {
      id: true,
      code: true,
      curriculumVersion: { select: { id: true, status: true } },
    },
  },
  _count: { select: { remedialSkills: true } },
} satisfies Prisma.LanguageStructureSelect;

type YearRecord = Prisma.CurriculumYearGetPayload<{ select: typeof yearSelect }>;
type StructureRecord = Prisma.LanguageStructureGetPayload<{ select: typeof structureSelect }>;

function yearDto(record: YearRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    yearLevel: record.yearLevel,
    name: record.name,
    sequence: record.sequence,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    contentStandardCount: record._count.contentStandards,
  };
}

function yearAuditDto(record: YearRecord) {
  return { id: record.id, programmeId: record.programmeId, yearLevel: record.yearLevel, name: record.name, sequence: record.sequence, status: record.status };
}

function structureDto(record: StructureRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    code: record.code,
    name: record.name,
    description: record.description,
    sequence: record.sequence,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    remedialSkillCount: record._count.remedialSkills,
  };
}

function structureAuditDto(record: StructureRecord) {
  return { id: record.id, programmeId: record.programmeId, code: record.code, name: record.name, sequence: record.sequence, status: record.status };
}

async function getYearRecord(yearId: string): Promise<YearRecord> {
  const record = await prisma.curriculumYear.findUnique({ where: { id: yearId }, select: yearSelect });
  if (!record) throw yearNotFound();
  return record;
}

async function getStructureRecord(structureId: string): Promise<StructureRecord> {
  const record = await prisma.languageStructure.findUnique({ where: { id: structureId }, select: structureSelect });
  if (!record) throw structureNotFound();
  return record;
}

function assertBmYearLevel(programmeCode: string, yearLevel: number): void {
  if (programmeCode === "BM-PEMULIHAN" && ![1, 2, 3].includes(yearLevel)) {
    throw appError("CURRICULUM_IMPORT_INVALID", 400, "Program BM Pemulihan hanya menyokong Tahun 1 hingga Tahun 3.");
  }
}

export async function createCurriculumYear(programmeId: string, data: CreateCurriculumYearInput, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertEditableProgramme(programme, context);
  assertBmYearLevel(programme.code, data.yearLevel);
  const duplicate = await prisma.curriculumYear.findFirst({
    where: { programmeId, OR: [{ yearLevel: data.yearLevel }, { sequence: data.sequence }] },
    select: { id: true },
  });
  if (duplicate) throw sequenceConflict();
  const record = await withUniqueConflict(() => prisma.curriculumYear.create({
    data: {
      programmeId,
      yearLevel: data.yearLevel,
      name: data.name.trim(),
      sequence: data.sequence,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: yearSelect,
  }));
  const result = yearDto(record);
  await audit(context, "CURRICULUM_YEAR_CREATED", record.id, null, yearAuditDto(record));
  return result;
}

export async function listCurriculumYears(programmeId: string, query: ListCurriculumYearsQuery, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertReadableProgramme(programme, context);
  const search = query.search?.trim();
  const where: Prisma.CurriculumYearWhereInput = {
    programmeId,
    ...(query.status ? { status: query.status } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.curriculumYear.findMany({ where, select: yearSelect, orderBy: yearOrderBy(query.sortBy, query.sortOrder ?? "asc"), skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.curriculumYear.count({ where }),
  ]);
  return { years: records.map(yearDto), pagination: pagination(query.page, query.limit, total) };
}

export async function updateCurriculumYear(yearId: string, data: UpdateCurriculumYearInput, context: CurriculumAuditContext) {
  const before = await getYearRecord(yearId);
  const programme = await getProgrammeRecord(before.programmeId);
  assertEditableProgramme(programme, context);
  const yearLevel = data.yearLevel ?? before.yearLevel;
  const sequence = data.sequence ?? before.sequence;
  assertBmYearLevel(programme.code, yearLevel);
  if (yearLevel !== before.yearLevel || sequence !== before.sequence) {
    const duplicate = await prisma.curriculumYear.findFirst({
      where: { programmeId: before.programmeId, id: { not: yearId }, OR: [{ yearLevel }, { sequence }] },
      select: { id: true },
    });
    if (duplicate) throw sequenceConflict();
  }
  const record = await withUniqueConflict(() => prisma.curriculumYear.update({
    where: { id: yearId },
    data: {
      ...(data.yearLevel !== undefined ? { yearLevel } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.sequence !== undefined ? { sequence } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: yearSelect,
  }));
  const result = yearDto(record);
  await audit(context, "CURRICULUM_YEAR_UPDATED", record.id, yearAuditDto(before), yearAuditDto(record));
  return result;
}

export async function createLanguageStructure(programmeId: string, data: CreateLanguageStructureInput, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertEditableProgramme(programme, context);
  const code = normalizeCode(data.code);
  const duplicate = await prisma.languageStructure.findFirst({
    where: { programmeId, OR: [{ code }, { sequence: data.sequence }] },
    select: { id: true },
  });
  if (duplicate) throw codeConflict();
  const record = await withUniqueConflict(() => prisma.languageStructure.create({
    data: {
      programmeId,
      code,
      name: data.name.trim(),
      description: normalizeOptionalText(data.description) ?? null,
      sequence: data.sequence,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: structureSelect,
  }));
  const result = structureDto(record);
  await audit(context, "CURRICULUM_STRUCTURE_CREATED", record.id, null, structureAuditDto(record));
  return result;
}

export async function listLanguageStructures(programmeId: string, query: ListLanguageStructuresQuery, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertReadableProgramme(programme, context);
  const search = query.search?.trim();
  const where: Prisma.LanguageStructureWhereInput = {
    programmeId,
    ...(query.status ? { status: query.status } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.languageStructure.findMany({ where, select: structureSelect, orderBy: structureOrderBy(query.sortBy, query.sortOrder ?? "asc"), skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.languageStructure.count({ where }),
  ]);
  return { languageStructures: records.map(structureDto), pagination: pagination(query.page, query.limit, total) };
}

export async function updateLanguageStructure(structureId: string, data: UpdateLanguageStructureInput, context: CurriculumAuditContext) {
  const before = await getStructureRecord(structureId);
  const programme = await getProgrammeRecord(before.programmeId);
  assertEditableProgramme(programme, context);
  const code = data.code === undefined ? before.code : normalizeCode(data.code);
  const sequence = data.sequence ?? before.sequence;
  if (code !== before.code || sequence !== before.sequence) {
    const duplicate = await prisma.languageStructure.findFirst({
      where: { programmeId: before.programmeId, id: { not: structureId }, OR: [{ code }, { sequence }] },
      select: { id: true },
    });
    if (duplicate) {
      if (sequence !== before.sequence) throw sequenceConflict();
      throw codeConflict();
    }
  }
  const record = await withUniqueConflict(() => prisma.languageStructure.update({
    where: { id: structureId },
    data: {
      ...(data.code !== undefined ? { code } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: normalizeOptionalText(data.description) } : {}),
      ...(data.sequence !== undefined ? { sequence } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: structureSelect,
  }));
  const result = structureDto(record);
  await audit(context, "CURRICULUM_STRUCTURE_UPDATED", record.id, structureAuditDto(before), structureAuditDto(record));
  return result;
}

const skillSelect = {
  id: true,
  programmeId: true,
  languageStructureId: true,
  code: true,
  sequence: true,
  name: true,
  description: true,
  isPreparatory: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  programme: {
    select: {
      id: true,
      code: true,
      curriculumVersion: { select: { id: true, code: true, status: true } },
    },
  },
  languageStructure: { select: { id: true, code: true, name: true, sequence: true, status: true } },
  _count: { select: { learningObjectives: true, suggestedActivities: true, standardMappings: true } },
} satisfies Prisma.RemedialSkillSelect;

type SkillRecord = Prisma.RemedialSkillGetPayload<{ select: typeof skillSelect }>;

function skillDto(record: SkillRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    languageStructureId: record.languageStructureId,
    code: record.code,
    sequence: record.sequence,
    name: record.name,
    description: record.description,
    isPreparatory: record.isPreparatory,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    languageStructure: record.languageStructure,
    objectiveCount: record._count.learningObjectives,
    suggestedActivityCount: record._count.suggestedActivities,
    mappedLearningStandardCount: record._count.standardMappings,
  };
}

function skillAuditDto(record: SkillRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    languageStructureId: record.languageStructureId,
    code: record.code,
    sequence: record.sequence,
    name: record.name,
    isPreparatory: record.isPreparatory,
    status: record.status,
  };
}

async function getSkillRecord(skillId: string): Promise<SkillRecord> {
  const record = await prisma.remedialSkill.findUnique({ where: { id: skillId }, select: skillSelect });
  if (!record) throw skillNotFound();
  return record;
}

function assertReadableSkill(record: SkillRecord, context: CurriculumAuditContext): void {
  assertReadAccess(context);
  assertTeacherPublished(record.programme.curriculumVersion.status, context);
}

function assertEditableSkill(record: SkillRecord, context: CurriculumAuditContext): void {
  assertManagementAccess(context);
  assertDraft(record.programme.curriculumVersion.status);
}

async function assertStructureBelongsToProgramme(structureId: string, programmeId: string): Promise<void> {
  const structure = await getStructureRecord(structureId);
  if (structure.programmeId !== programmeId) throw crossVersionLink();
}

export async function createRemedialSkill(programmeId: string, data: CreateRemedialSkillInput, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertEditableProgramme(programme, context);
  await assertStructureBelongsToProgramme(data.languageStructureId, programmeId);
  const code = normalizeCode(data.code);
  const duplicate = await prisma.remedialSkill.findFirst({
    where: { programmeId, OR: [{ code }, { sequence: data.sequence }] },
    select: { id: true },
  });
  if (duplicate) throw codeConflict();
  const record = await withUniqueConflict(() => prisma.remedialSkill.create({
    data: {
      programmeId,
      languageStructureId: data.languageStructureId,
      code,
      sequence: data.sequence,
      name: data.name.trim(),
      description: normalizeOptionalText(data.description) ?? null,
      isPreparatory: data.isPreparatory ?? false,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: skillSelect,
  }));
  const result = skillDto(record);
  await audit(context, "CURRICULUM_SKILL_CREATED", record.id, null, skillAuditDto(record));
  return result;
}

export async function listRemedialSkills(programmeId: string, query: ListRemedialSkillsQuery, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertReadableProgramme(programme, context);
  const search = query.search?.trim();
  const where: Prisma.RemedialSkillWhereInput = {
    programmeId,
    ...(query.languageStructureId ? { languageStructureId: query.languageStructureId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.isPreparatory !== undefined ? { isPreparatory: query.isPreparatory } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { name: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.remedialSkill.findMany({
      where,
      select: skillSelect,
      orderBy: skillOrderBy(query.sortBy, query.sortOrder ?? "asc"),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.remedialSkill.count({ where }),
  ]);
  return { remedialSkills: records.map(skillDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getRemedialSkill(skillId: string, context: CurriculumAuditContext) {
  const record = await getSkillRecord(skillId);
  assertReadableSkill(record, context);
  const [objectives, suggestedActivities, mappings] = await Promise.all([
    prisma.learningObjective.findMany({ where: { remedialSkillId: skillId }, select: objectiveSelect, orderBy: { sequence: "asc" } }),
    prisma.suggestedTeachingActivity.findMany({ where: { remedialSkillId: skillId }, select: suggestedActivitySelect, orderBy: { sequence: "asc" } }),
    prisma.remedialSkillStandardMapping.findMany({
      where: { remedialSkillId: skillId },
      select: mappingSelect,
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return {
    skill: skillDto(record),
    objectives: objectives.map(objectiveDto),
    suggestedActivities: suggestedActivities.map(suggestedActivityDto),
    learningStandardMappings: mappings.map(mappingDto),
  };
}

export async function updateRemedialSkill(skillId: string, data: UpdateRemedialSkillInput, context: CurriculumAuditContext) {
  const before = await getSkillRecord(skillId);
  assertEditableSkill(before, context);
  const languageStructureId = data.languageStructureId ?? before.languageStructureId;
  if (data.languageStructureId !== undefined) await assertStructureBelongsToProgramme(languageStructureId, before.programmeId);
  const code = data.code === undefined ? before.code : normalizeCode(data.code);
  const sequence = data.sequence ?? before.sequence;
  if (code !== before.code || sequence !== before.sequence) {
    const duplicate = await prisma.remedialSkill.findFirst({
      where: { programmeId: before.programmeId, id: { not: skillId }, OR: [{ code }, { sequence }] },
      select: { id: true },
    });
    if (duplicate) {
      if (sequence !== before.sequence) throw sequenceConflict();
      throw codeConflict();
    }
  }
  const record = await withUniqueConflict(() => prisma.remedialSkill.update({
    where: { id: skillId },
    data: {
      ...(data.languageStructureId !== undefined ? { languageStructureId } : {}),
      ...(data.code !== undefined ? { code } : {}),
      ...(data.sequence !== undefined ? { sequence } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: normalizeOptionalText(data.description) } : {}),
      ...(data.isPreparatory !== undefined ? { isPreparatory: data.isPreparatory } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: skillSelect,
  }));
  const result = skillDto(record);
  await audit(context, "CURRICULUM_SKILL_UPDATED", record.id, skillAuditDto(before), skillAuditDto(record));
  return result;
}

const contentStandardSelect = {
  id: true,
  programmeId: true,
  curriculumYearId: true,
  code: true,
  title: true,
  description: true,
  domain: true,
  sequence: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  programme: {
    select: {
      id: true,
      code: true,
      curriculumVersion: { select: { id: true, code: true, status: true } },
    },
  },
  curriculumYear: { select: { id: true, yearLevel: true, name: true, sequence: true, status: true } },
  _count: { select: { learningStandards: true } },
} satisfies Prisma.ContentStandardSelect;

const learningStandardSelect = {
  id: true,
  contentStandardId: true,
  code: true,
  description: true,
  sequence: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  contentStandard: {
    select: {
      id: true,
      programmeId: true,
      code: true,
      title: true,
      domain: true,
      curriculumYear: { select: { id: true, yearLevel: true, name: true, sequence: true } },
      programme: { select: { id: true, code: true, curriculumVersion: { select: { id: true, code: true, status: true } } } },
    },
  },
  _count: { select: { remedialMappings: true } },
} satisfies Prisma.LearningStandardSelect;

type ContentStandardRecord = Prisma.ContentStandardGetPayload<{ select: typeof contentStandardSelect }>;
type LearningStandardRecord = Prisma.LearningStandardGetPayload<{ select: typeof learningStandardSelect }>;

function contentStandardDto(record: ContentStandardRecord) {
  return {
    id: record.id,
    programmeId: record.programmeId,
    curriculumYearId: record.curriculumYearId,
    code: record.code,
    title: record.title,
    description: record.description,
    domain: record.domain,
    sequence: record.sequence,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    year: record.curriculumYear,
    learningStandardCount: record._count.learningStandards,
  };
}

function contentStandardAuditDto(record: ContentStandardRecord) {
  return { id: record.id, programmeId: record.programmeId, curriculumYearId: record.curriculumYearId, code: record.code, title: record.title, domain: record.domain, sequence: record.sequence, status: record.status };
}

function learningStandardDto(record: LearningStandardRecord) {
  return {
    id: record.id,
    contentStandardId: record.contentStandardId,
    code: record.code,
    description: record.description,
    sequence: record.sequence,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    contentStandard: {
      id: record.contentStandard.id,
      code: record.contentStandard.code,
      title: record.contentStandard.title,
      domain: record.contentStandard.domain,
    },
    year: record.contentStandard.curriculumYear,
    programme: { id: record.contentStandard.programme.id, code: record.contentStandard.programme.code },
    remedialSkillMappingCount: record._count.remedialMappings,
  };
}

function learningStandardAuditDto(record: LearningStandardRecord) {
  return { id: record.id, contentStandardId: record.contentStandardId, code: record.code, sequence: record.sequence, status: record.status };
}

async function getContentStandardRecord(contentStandardId: string): Promise<ContentStandardRecord> {
  const record = await prisma.contentStandard.findUnique({ where: { id: contentStandardId }, select: contentStandardSelect });
  if (!record) throw contentStandardNotFound();
  return record;
}

async function getLearningStandardRecord(learningStandardId: string): Promise<LearningStandardRecord> {
  const record = await prisma.learningStandard.findUnique({ where: { id: learningStandardId }, select: learningStandardSelect });
  if (!record) throw learningStandardNotFound();
  return record;
}

function assertReadableContentStandard(record: ContentStandardRecord, context: CurriculumAuditContext): void {
  assertReadAccess(context);
  assertTeacherPublished(record.programme.curriculumVersion.status, context);
}

function assertEditableContentStandard(record: ContentStandardRecord, context: CurriculumAuditContext): void {
  assertManagementAccess(context);
  assertDraft(record.programme.curriculumVersion.status);
}

function assertReadableLearningStandard(record: LearningStandardRecord, context: CurriculumAuditContext): void {
  assertReadAccess(context);
  assertTeacherPublished(record.contentStandard.programme.curriculumVersion.status, context);
}

function assertEditableLearningStandard(record: LearningStandardRecord, context: CurriculumAuditContext): void {
  assertManagementAccess(context);
  assertDraft(record.contentStandard.programme.curriculumVersion.status);
}

async function assertYearBelongsToProgramme(yearId: string, programmeId: string): Promise<void> {
  const year = await getYearRecord(yearId);
  if (year.programmeId !== programmeId) throw crossVersionLink();
}

export async function createContentStandard(programmeId: string, data: CreateContentStandardInput, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertEditableProgramme(programme, context);
  await assertYearBelongsToProgramme(data.curriculumYearId, programmeId);
  const code = normalizeStandardCode(data.code);
  const duplicate = await prisma.contentStandard.findUnique({
    where: { programmeId_curriculumYearId_code: { programmeId, curriculumYearId: data.curriculumYearId, code } },
    select: { id: true },
  });
  if (duplicate) throw codeConflict();
  const record = await withUniqueConflict(() => prisma.contentStandard.create({
    data: {
      programmeId,
      curriculumYearId: data.curriculumYearId,
      code,
      title: data.title.trim(),
      description: normalizeOptionalText(data.description) ?? null,
      domain: data.domain,
      sequence: data.sequence ?? null,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: contentStandardSelect,
  }));
  const result = contentStandardDto(record);
  await audit(context, "CURRICULUM_CONTENT_STANDARD_CREATED", record.id, null, contentStandardAuditDto(record));
  return result;
}

export async function listContentStandards(programmeId: string, query: ListContentStandardsQuery, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertReadableProgramme(programme, context);
  const search = query.search?.trim();
  const where: Prisma.ContentStandardWhereInput = {
    programmeId,
    ...(query.curriculumYearId ? { curriculumYearId: query.curriculumYearId } : {}),
    ...(query.yearLevel ? { curriculumYear: { yearLevel: query.yearLevel } } : {}),
    ...(query.domain ? { domain: query.domain } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { title: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.contentStandard.findMany({
      where,
      select: contentStandardSelect,
      orderBy: [contentStandardOrderBy(query.sortBy, query.sortOrder ?? "asc"), { code: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.contentStandard.count({ where }),
  ]);
  return { contentStandards: records.map(contentStandardDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getContentStandard(contentStandardId: string, context: CurriculumAuditContext) {
  const record = await getContentStandardRecord(contentStandardId);
  assertReadableContentStandard(record, context);
  const learningStandards = await prisma.learningStandard.findMany({
    where: { contentStandardId },
    select: learningStandardSelect,
    orderBy: [{ sequence: "asc" }, { code: "asc" }],
  });
  return { contentStandard: contentStandardDto(record), learningStandards: learningStandards.map(learningStandardDto) };
}

export async function updateContentStandard(contentStandardId: string, data: UpdateContentStandardInput, context: CurriculumAuditContext) {
  const before = await getContentStandardRecord(contentStandardId);
  assertEditableContentStandard(before, context);
  const curriculumYearId = data.curriculumYearId ?? before.curriculumYearId;
  if (data.curriculumYearId !== undefined) await assertYearBelongsToProgramme(curriculumYearId, before.programmeId);
  const code = data.code === undefined ? before.code : normalizeStandardCode(data.code);
  if (code !== before.code || curriculumYearId !== before.curriculumYearId) {
    const duplicate = await prisma.contentStandard.findUnique({
      where: { programmeId_curriculumYearId_code: { programmeId: before.programmeId, curriculumYearId, code } },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== contentStandardId) throw codeConflict();
  }
  const record = await withUniqueConflict(() => prisma.contentStandard.update({
    where: { id: contentStandardId },
    data: {
      ...(data.curriculumYearId !== undefined ? { curriculumYearId } : {}),
      ...(data.code !== undefined ? { code } : {}),
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: normalizeOptionalText(data.description) } : {}),
      ...(data.domain !== undefined ? { domain: data.domain } : {}),
      ...(data.sequence !== undefined ? { sequence: data.sequence } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: contentStandardSelect,
  }));
  const result = contentStandardDto(record);
  await audit(context, "CURRICULUM_CONTENT_STANDARD_UPDATED", record.id, contentStandardAuditDto(before), contentStandardAuditDto(record));
  return result;
}

export async function createLearningStandard(contentStandardId: string, data: CreateLearningStandardInput, context: CurriculumAuditContext) {
  const contentStandard = await getContentStandardRecord(contentStandardId);
  assertEditableContentStandard(contentStandard, context);
  const code = normalizeStandardCode(data.code);
  const duplicate = await prisma.learningStandard.findUnique({ where: { contentStandardId_code: { contentStandardId, code } }, select: { id: true } });
  if (duplicate) throw codeConflict();
  const record = await withUniqueConflict(() => prisma.learningStandard.create({
    data: {
      contentStandardId,
      code,
      description: data.description.trim(),
      sequence: data.sequence ?? null,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: learningStandardSelect,
  }));
  const result = learningStandardDto(record);
  await audit(context, "CURRICULUM_LEARNING_STANDARD_CREATED", record.id, null, learningStandardAuditDto(record));
  return result;
}

export async function listLearningStandards(contentStandardId: string, query: ListLearningStandardsQuery, context: CurriculumAuditContext) {
  const contentStandard = await getContentStandardRecord(contentStandardId);
  assertReadableContentStandard(contentStandard, context);
  const search = query.search?.trim();
  const where: Prisma.LearningStandardWhereInput = {
    contentStandardId,
    ...(query.status ? { status: query.status } : {}),
    ...(search ? { OR: [{ code: { contains: search, mode: "insensitive" } }, { description: { contains: search, mode: "insensitive" } }] } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.learningStandard.findMany({
      where,
      select: learningStandardSelect,
      orderBy: [learningStandardOrderBy(query.sortBy, query.sortOrder ?? "asc"), { code: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.learningStandard.count({ where }),
  ]);
  return { learningStandards: records.map(learningStandardDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getLearningStandard(learningStandardId: string, context: CurriculumAuditContext) {
  const record = await getLearningStandardRecord(learningStandardId);
  assertReadableLearningStandard(record, context);
  return { learningStandard: learningStandardDto(record) };
}

export async function updateLearningStandard(learningStandardId: string, data: UpdateLearningStandardInput, context: CurriculumAuditContext) {
  const before = await getLearningStandardRecord(learningStandardId);
  assertEditableLearningStandard(before, context);
  const code = data.code === undefined ? before.code : normalizeStandardCode(data.code);
  if (code !== before.code) {
    const duplicate = await prisma.learningStandard.findUnique({ where: { contentStandardId_code: { contentStandardId: before.contentStandardId, code } }, select: { id: true } });
    if (duplicate && duplicate.id !== learningStandardId) throw codeConflict();
  }
  const record = await withUniqueConflict(() => prisma.learningStandard.update({
    where: { id: learningStandardId },
    data: {
      ...(data.code !== undefined ? { code } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.sequence !== undefined ? { sequence: data.sequence } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: learningStandardSelect,
  }));
  const result = learningStandardDto(record);
  await audit(context, "CURRICULUM_LEARNING_STANDARD_UPDATED", record.id, learningStandardAuditDto(before), learningStandardAuditDto(record));
  return result;
}

export interface ListSkillStandardMappingsQuery extends PaginationQuery {
  isPrimary?: boolean;
}

export interface ListLearningObjectivesQuery extends PaginationQuery {
  status?: CurriculumRecordStatus;
  sortBy?: "sequence" | "code" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

export interface ListSuggestedTeachingActivitiesQuery extends PaginationQuery {
  status?: CurriculumRecordStatus;
  sortBy?: "sequence" | "title" | "status" | "createdAt" | "updatedAt";
  sortOrder?: SortOrder;
}

function objectiveOrderBy(sortBy: ListLearningObjectivesQuery["sortBy"], sortOrder: SortOrder): Prisma.LearningObjectiveOrderByWithRelationInput {
  switch (sortBy) {
    case "code": return { code: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

function suggestedActivityOrderBy(sortBy: ListSuggestedTeachingActivitiesQuery["sortBy"], sortOrder: SortOrder): Prisma.SuggestedTeachingActivityOrderByWithRelationInput {
  switch (sortBy) {
    case "title": return { title: sortOrder };
    case "status": return { status: sortOrder };
    case "createdAt": return { createdAt: sortOrder };
    case "updatedAt": return { updatedAt: sortOrder };
    default: return { sequence: sortOrder };
  }
}

const mappingSelect = {
  id: true,
  remedialSkillId: true,
  learningStandardId: true,
  isPrimary: true,
  notes: true,
  createdAt: true,
  remedialSkill: {
    select: {
      id: true,
      programmeId: true,
      code: true,
      sequence: true,
      name: true,
      languageStructure: { select: { id: true, code: true, name: true } },
      programme: { select: { id: true, code: true, curriculumVersion: { select: { id: true, code: true, status: true } } } },
    },
  },
  learningStandard: {
    select: {
      id: true,
      code: true,
      description: true,
      sequence: true,
      status: true,
      contentStandard: {
        select: {
          id: true,
          programmeId: true,
          code: true,
          title: true,
          domain: true,
          curriculumYear: { select: { id: true, yearLevel: true, name: true, sequence: true } },
          programme: { select: { id: true, code: true, curriculumVersion: { select: { id: true, code: true, status: true } } } },
        },
      },
    },
  },
} satisfies Prisma.RemedialSkillStandardMappingSelect;

const objectiveSelect = {
  id: true,
  remedialSkillId: true,
  code: true,
  description: true,
  sequence: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  remedialSkill: {
    select: {
      id: true,
      programmeId: true,
      code: true,
      sequence: true,
      name: true,
      programme: { select: { id: true, code: true, curriculumVersion: { select: { id: true, code: true, status: true } } } },
    },
  },
  _count: { select: { suggestedActivities: true } },
} satisfies Prisma.LearningObjectiveSelect;

const suggestedActivitySelect = {
  id: true,
  remedialSkillId: true,
  learningObjectiveId: true,
  title: true,
  description: true,
  sequence: true,
  sourceReference: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  remedialSkill: {
    select: {
      id: true,
      programmeId: true,
      code: true,
      sequence: true,
      name: true,
      programme: { select: { id: true, code: true, curriculumVersion: { select: { id: true, code: true, status: true } } } },
    },
  },
  learningObjective: { select: { id: true, code: true, description: true, sequence: true, status: true } },
} satisfies Prisma.SuggestedTeachingActivitySelect;

type MappingRecord = Prisma.RemedialSkillStandardMappingGetPayload<{ select: typeof mappingSelect }>;
type ObjectiveRecord = Prisma.LearningObjectiveGetPayload<{ select: typeof objectiveSelect }>;
type SuggestedActivityRecord = Prisma.SuggestedTeachingActivityGetPayload<{ select: typeof suggestedActivitySelect }>;

function mappingDto(record: MappingRecord) {
  return {
    id: record.id,
    remedialSkillId: record.remedialSkillId,
    learningStandardId: record.learningStandardId,
    isPrimary: record.isPrimary,
    notes: record.notes,
    createdAt: record.createdAt,
    learningStandard: {
      id: record.learningStandard.id,
      code: record.learningStandard.code,
      description: record.learningStandard.description,
      sequence: record.learningStandard.sequence,
      status: record.learningStandard.status,
    },
    contentStandard: {
      id: record.learningStandard.contentStandard.id,
      code: record.learningStandard.contentStandard.code,
      title: record.learningStandard.contentStandard.title,
      domain: record.learningStandard.contentStandard.domain,
    },
    year: record.learningStandard.contentStandard.curriculumYear,
  };
}

function mappingAuditDto(record: MappingRecord) {
  return { id: record.id, remedialSkillId: record.remedialSkillId, learningStandardId: record.learningStandardId, isPrimary: record.isPrimary };
}

function objectiveDto(record: ObjectiveRecord) {
  return {
    id: record.id,
    remedialSkillId: record.remedialSkillId,
    code: record.code,
    description: record.description,
    sequence: record.sequence,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    suggestedActivityCount: record._count.suggestedActivities,
  };
}

function objectiveAuditDto(record: ObjectiveRecord) {
  return { id: record.id, remedialSkillId: record.remedialSkillId, code: record.code, sequence: record.sequence, status: record.status };
}

function suggestedActivityDto(record: SuggestedActivityRecord) {
  return {
    id: record.id,
    remedialSkillId: record.remedialSkillId,
    learningObjectiveId: record.learningObjectiveId,
    title: record.title,
    description: record.description,
    sequence: record.sequence,
    sourceReference: record.sourceReference,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    learningObjective: record.learningObjective === null ? null : {
      id: record.learningObjective.id,
      code: record.learningObjective.code,
      sequence: record.learningObjective.sequence,
      status: record.learningObjective.status,
    },
  };
}

function suggestedActivityAuditDto(record: SuggestedActivityRecord) {
  return { id: record.id, remedialSkillId: record.remedialSkillId, learningObjectiveId: record.learningObjectiveId, title: record.title, sequence: record.sequence, status: record.status };
}

async function getObjectiveRecord(objectiveId: string): Promise<ObjectiveRecord> {
  const record = await prisma.learningObjective.findUnique({ where: { id: objectiveId }, select: objectiveSelect });
  if (!record) throw objectiveNotFound();
  return record;
}

async function getSuggestedActivityRecord(activityId: string): Promise<SuggestedActivityRecord> {
  const record = await prisma.suggestedTeachingActivity.findUnique({ where: { id: activityId }, select: suggestedActivitySelect });
  if (!record) throw suggestedActivityNotFound();
  return record;
}

function assertSameProgrammeAndVersion(skill: SkillRecord, learningStandard: LearningStandardRecord): void {
  const standardProgramme = learningStandard.contentStandard.programme;
  if (
    skill.programmeId !== learningStandard.contentStandard.programmeId ||
    skill.programme.curriculumVersion.id !== standardProgramme.curriculumVersion.id
  ) {
    throw crossVersionLink();
  }
}

export async function createSkillStandardMapping(
  skillId: string,
  learningStandardId: string,
  data: CreateSkillStandardMappingInput,
  context: CurriculumAuditContext,
) {
  const [skill, learningStandard] = await Promise.all([getSkillRecord(skillId), getLearningStandardRecord(learningStandardId)]);
  assertEditableSkill(skill, context);
  assertEditableLearningStandard(learningStandard, context);
  assertSameProgrammeAndVersion(skill, learningStandard);
  const existing = await prisma.remedialSkillStandardMapping.findUnique({ where: { remedialSkillId_learningStandardId: { remedialSkillId: skillId, learningStandardId } }, select: { id: true } });
  if (existing) throw mappingExists();
  const record = await withUniqueConflict(() => prisma.remedialSkillStandardMapping.create({
    data: { remedialSkillId: skillId, learningStandardId, isPrimary: data.isPrimary ?? false, notes: normalizeOptionalText(data.notes) ?? null },
    select: mappingSelect,
  }));
  const result = mappingDto(record);
  await audit(context, "CURRICULUM_MAPPING_CREATED", record.id, null, mappingAuditDto(record));
  return result;
}

export async function listSkillStandardMappings(skillId: string, query: ListSkillStandardMappingsQuery, context: CurriculumAuditContext) {
  const skill = await getSkillRecord(skillId);
  assertReadableSkill(skill, context);
  const where: Prisma.RemedialSkillStandardMappingWhereInput = {
    remedialSkillId: skillId,
    ...(query.isPrimary !== undefined ? { isPrimary: query.isPrimary } : {}),
  };
  const [records, total] = await Promise.all([
    prisma.remedialSkillStandardMapping.findMany({ where, select: mappingSelect, orderBy: { createdAt: "asc" }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.remedialSkillStandardMapping.count({ where }),
  ]);
  return { mappings: records.map(mappingDto), pagination: pagination(query.page, query.limit, total) };
}

export async function removeSkillStandardMapping(skillId: string, learningStandardId: string, context: CurriculumAuditContext): Promise<void> {
  const skill = await getSkillRecord(skillId);
  assertEditableSkill(skill, context);
  const mapping = await prisma.remedialSkillStandardMapping.findUnique({
    where: { remedialSkillId_learningStandardId: { remedialSkillId: skillId, learningStandardId } },
    select: mappingSelect,
  });
  if (!mapping) throw mappingNotFound();
  await prisma.remedialSkillStandardMapping.delete({ where: { id: mapping.id } });
  await audit(context, "CURRICULUM_MAPPING_REMOVED", mapping.id, mappingAuditDto(mapping), null);
}

export async function createLearningObjective(skillId: string, data: CreateLearningObjectiveInput, context: CurriculumAuditContext) {
  const skill = await getSkillRecord(skillId);
  assertEditableSkill(skill, context);
  const duplicate = await prisma.learningObjective.findUnique({ where: { remedialSkillId_sequence: { remedialSkillId: skillId, sequence: data.sequence } }, select: { id: true } });
  if (duplicate) throw sequenceConflict();
  const record = await withUniqueConflict(() => prisma.learningObjective.create({
    data: {
      remedialSkillId: skillId,
      code: data.code === undefined || data.code === null ? data.code ?? null : normalizeCode(data.code),
      description: data.description.trim(),
      sequence: data.sequence,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: objectiveSelect,
  }));
  const result = objectiveDto(record);
  await audit(context, "CURRICULUM_OBJECTIVE_CREATED", record.id, null, objectiveAuditDto(record));
  return result;
}

export async function listLearningObjectives(skillId: string, query: ListLearningObjectivesQuery, context: CurriculumAuditContext) {
  const skill = await getSkillRecord(skillId);
  assertReadableSkill(skill, context);
  const where: Prisma.LearningObjectiveWhereInput = { remedialSkillId: skillId, ...(query.status ? { status: query.status } : {}) };
  const [records, total] = await Promise.all([
    prisma.learningObjective.findMany({ where, select: objectiveSelect, orderBy: objectiveOrderBy(query.sortBy, query.sortOrder ?? "asc"), skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.learningObjective.count({ where }),
  ]);
  return { objectives: records.map(objectiveDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getLearningObjective(objectiveId: string, context: CurriculumAuditContext) {
  const record = await getObjectiveRecord(objectiveId);
  assertReadAccess(context);
  assertTeacherPublished(record.remedialSkill.programme.curriculumVersion.status, context);
  return { objective: objectiveDto(record) };
}

export async function updateLearningObjective(objectiveId: string, data: UpdateLearningObjectiveInput, context: CurriculumAuditContext) {
  const before = await getObjectiveRecord(objectiveId);
  assertManagementAccess(context);
  assertDraft(before.remedialSkill.programme.curriculumVersion.status);
  const sequence = data.sequence ?? before.sequence;
  if (sequence !== before.sequence) {
    const duplicate = await prisma.learningObjective.findUnique({ where: { remedialSkillId_sequence: { remedialSkillId: before.remedialSkillId, sequence } }, select: { id: true } });
    if (duplicate && duplicate.id !== objectiveId) throw sequenceConflict();
  }
  const record = await withUniqueConflict(() => prisma.learningObjective.update({
    where: { id: objectiveId },
    data: {
      ...(data.code !== undefined ? { code: data.code === null ? null : normalizeCode(data.code) } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.sequence !== undefined ? { sequence } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: objectiveSelect,
  }));
  const result = objectiveDto(record);
  await audit(context, "CURRICULUM_OBJECTIVE_UPDATED", record.id, objectiveAuditDto(before), objectiveAuditDto(record));
  return result;
}

async function assertObjectiveBelongsToSkill(objectiveId: string, skillId: string): Promise<void> {
  const objective = await getObjectiveRecord(objectiveId);
  if (objective.remedialSkillId !== skillId) throw crossVersionLink();
}

export async function createSuggestedTeachingActivity(skillId: string, data: CreateSuggestedTeachingActivityInput, context: CurriculumAuditContext) {
  const skill = await getSkillRecord(skillId);
  assertEditableSkill(skill, context);
  if (data.learningObjectiveId) await assertObjectiveBelongsToSkill(data.learningObjectiveId, skillId);
  const duplicate = await prisma.suggestedTeachingActivity.findUnique({ where: { remedialSkillId_sequence: { remedialSkillId: skillId, sequence: data.sequence } }, select: { id: true } });
  if (duplicate) throw sequenceConflict();
  const record = await withUniqueConflict(() => prisma.suggestedTeachingActivity.create({
    data: {
      remedialSkillId: skillId,
      learningObjectiveId: data.learningObjectiveId ?? null,
      title: normalizeOptionalText(data.title) ?? null,
      description: data.description.trim(),
      sequence: data.sequence,
      sourceReference: normalizeOptionalText(data.sourceReference) ?? null,
      status: data.status ?? CurriculumRecordStatus.ACTIVE,
    },
    select: suggestedActivitySelect,
  }));
  const result = suggestedActivityDto(record);
  await audit(context, "CURRICULUM_SUGGESTED_ACTIVITY_CREATED", record.id, null, suggestedActivityAuditDto(record));
  return result;
}

export async function listSuggestedTeachingActivities(skillId: string, query: ListSuggestedTeachingActivitiesQuery, context: CurriculumAuditContext) {
  const skill = await getSkillRecord(skillId);
  assertReadableSkill(skill, context);
  const where: Prisma.SuggestedTeachingActivityWhereInput = { remedialSkillId: skillId, ...(query.status ? { status: query.status } : {}) };
  const [records, total] = await Promise.all([
    prisma.suggestedTeachingActivity.findMany({ where, select: suggestedActivitySelect, orderBy: suggestedActivityOrderBy(query.sortBy, query.sortOrder ?? "asc"), skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.suggestedTeachingActivity.count({ where }),
  ]);
  return { suggestedActivities: records.map(suggestedActivityDto), pagination: pagination(query.page, query.limit, total) };
}

export async function getSuggestedTeachingActivity(activityId: string, context: CurriculumAuditContext) {
  const record = await getSuggestedActivityRecord(activityId);
  assertReadAccess(context);
  assertTeacherPublished(record.remedialSkill.programme.curriculumVersion.status, context);
  return { suggestedActivity: suggestedActivityDto(record) };
}

export async function updateSuggestedTeachingActivity(activityId: string, data: UpdateSuggestedTeachingActivityInput, context: CurriculumAuditContext) {
  const before = await getSuggestedActivityRecord(activityId);
  assertManagementAccess(context);
  assertDraft(before.remedialSkill.programme.curriculumVersion.status);
  const learningObjectiveId = data.learningObjectiveId === undefined ? before.learningObjectiveId : data.learningObjectiveId;
  if (learningObjectiveId) await assertObjectiveBelongsToSkill(learningObjectiveId, before.remedialSkillId);
  const sequence = data.sequence ?? before.sequence;
  if (sequence !== before.sequence) {
    const duplicate = await prisma.suggestedTeachingActivity.findUnique({ where: { remedialSkillId_sequence: { remedialSkillId: before.remedialSkillId, sequence } }, select: { id: true } });
    if (duplicate && duplicate.id !== activityId) throw sequenceConflict();
  }
  const record = await withUniqueConflict(() => prisma.suggestedTeachingActivity.update({
    where: { id: activityId },
    data: {
      ...(data.learningObjectiveId !== undefined ? { learningObjectiveId } : {}),
      ...(data.title !== undefined ? { title: normalizeOptionalText(data.title) } : {}),
      ...(data.description !== undefined ? { description: data.description.trim() } : {}),
      ...(data.sequence !== undefined ? { sequence } : {}),
      ...(data.sourceReference !== undefined ? { sourceReference: normalizeOptionalText(data.sourceReference) } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: suggestedActivitySelect,
  }));
  const result = suggestedActivityDto(record);
  await audit(context, "CURRICULUM_SUGGESTED_ACTIVITY_UPDATED", record.id, suggestedActivityAuditDto(before), suggestedActivityAuditDto(record));
  return result;
}

function publicationIssue(code: string, path: string, message: string): PublicationIssue {
  return { code, path, message };
}

function expectedStructureForBmSkill(code: string): string {
  if (code === "KP-PRA") return "PRA";
  const numericCode = Number(code.slice(2));
  if (numericCode >= 1 && numericCode <= 3) return "ABJAD";
  if ([4, 9, 17].includes(numericCode)) return "SUKU_KATA";
  if (numericCode >= 5 && numericCode <= 30) return "PERKATAAN";
  return "AYAT";
}

function duplicateValues(values: readonly string[] | readonly number[]): Array<string | number> {
  const seen = new Set<string | number>();
  const duplicate = new Set<string | number>();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}

async function publicationValidationIssues(
  tx: Prisma.TransactionClient,
  versionId: string,
): Promise<PublicationIssue[]> {
  const version = await tx.curriculumVersion.findUnique({
    where: { id: versionId },
    include: {
      programmes: {
        include: {
          subject: { select: { id: true, code: true, name: true } },
          years: { select: { id: true, yearLevel: true, sequence: true } },
          languageStructures: { select: { id: true, programmeId: true, code: true, sequence: true } },
          remedialSkills: {
            include: {
              languageStructure: { select: { id: true, programmeId: true, code: true } },
              learningObjectives: { select: { id: true, remedialSkillId: true, sequence: true } },
              suggestedActivities: { select: { id: true, remedialSkillId: true, learningObjectiveId: true, sequence: true } },
              standardMappings: {
                include: {
                  learningStandard: {
                    include: {
                      contentStandard: {
                        include: {
                          programme: { select: { id: true, curriculumVersionId: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          contentStandards: {
            include: {
              curriculumYear: { select: { id: true, programmeId: true } },
              learningStandards: { select: { id: true, sequence: true } },
            },
          },
        },
      },
    },
  });
  if (!version) throw versionNotFound();
  const issues: PublicationIssue[] = [];
  if (version.programmes.length === 0) {
    issues.push(publicationIssue("MISSING_PROGRAMME", "programmes", "Versi kurikulum mesti mempunyai sekurang-kurangnya satu program."));
    return issues;
  }

  let contentStandardCount = 0;
  let learningStandardCount = 0;
  for (const programme of version.programmes) {
    const programmePath = `programmes.${programme.code}`;
    if (!programme.subject) issues.push(publicationIssue("MISSING_SUBJECT", `${programmePath}.subject`, "Program mesti mempunyai subjek."));
    contentStandardCount += programme.contentStandards.length;
    learningStandardCount += programme.contentStandards.reduce((total, standard) => total + standard.learningStandards.length, 0);
    const contentStandardSequences = programme.contentStandards.flatMap((standard) => standard.sequence === null ? [] : [standard.sequence]);
    const duplicateContentStandardSequences = duplicateValues(contentStandardSequences);
    for (const sequence of duplicateContentStandardSequences) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.contentStandards.${sequence}`, "Turutan Standard Kandungan berulang."));
    for (const standard of programme.contentStandards) {
      if (standard.curriculumYear.programmeId !== programme.id) {
        issues.push(publicationIssue("CROSS_PROGRAMME_YEAR", `${programmePath}.contentStandards.${standard.id}.curriculumYearId`, "Tahun Standard Kandungan mesti berada dalam program yang sama."));
      }
      const learningStandardSequences = standard.learningStandards.flatMap((learningStandard) => learningStandard.sequence === null ? [] : [learningStandard.sequence]);
      for (const sequence of duplicateValues(learningStandardSequences)) {
        issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.contentStandards.${standard.code}.learningStandards.${sequence}`, "Turutan Standard Pembelajaran berulang."));
      }
    }

    const duplicateYearSequences = duplicateValues(programme.years.map((year) => year.sequence));
    for (const sequence of duplicateYearSequences) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.years.${sequence}`, "Turutan tahun berulang."));
    const duplicateStructureCodes = duplicateValues(programme.languageStructures.map((structure) => structure.code));
    for (const code of duplicateStructureCodes) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.languageStructures.${code}`, "Kod struktur bahasa berulang."));
    const duplicateStructureSequences = duplicateValues(programme.languageStructures.map((structure) => structure.sequence));
    for (const sequence of duplicateStructureSequences) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.languageStructures.${sequence}`, "Turutan struktur bahasa berulang."));
    const duplicateSkillCodes = duplicateValues(programme.remedialSkills.map((skill) => skill.code));
    for (const code of duplicateSkillCodes) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.remedialSkills.${code}`, "Kod kemahiran berulang."));
    const duplicateSkillSequences = duplicateValues(programme.remedialSkills.map((skill) => skill.sequence));
    for (const sequence of duplicateSkillSequences) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.remedialSkills.${sequence}`, "Turutan kemahiran berulang."));

    const publishedElsewhere = await tx.curriculumProgramme.findFirst({
      where: {
        code: programme.code,
        curriculumVersionId: { not: versionId },
        curriculumVersion: { status: CurriculumStatus.PUBLISHED },
      },
      select: { id: true },
    });
    if (publishedElsewhere) {
      issues.push(publicationIssue("PUBLISHED_PROGRAMME_EXISTS", `${programmePath}.code`, "Satu versi program dengan kod ini telah diterbitkan."));
    }

    for (const skill of programme.remedialSkills) {
      if (skill.languageStructure.programmeId !== programme.id) {
        issues.push(publicationIssue("CROSS_PROGRAMME_STRUCTURE", `${programmePath}.remedialSkills.${skill.code}.languageStructureId`, "Struktur bahasa kemahiran mesti berada dalam program yang sama."));
      }
      const objectiveIds = new Set(skill.learningObjectives.map((objective) => objective.id));
      const duplicateObjectiveSequences = duplicateValues(skill.learningObjectives.map((objective) => objective.sequence));
      for (const sequence of duplicateObjectiveSequences) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.remedialSkills.${skill.code}.objectives.${sequence}`, "Turutan objektif berulang."));
      const duplicateActivitySequences = duplicateValues(skill.suggestedActivities.map((activity) => activity.sequence));
      for (const sequence of duplicateActivitySequences) issues.push(publicationIssue("DUPLICATE_ORDERING", `${programmePath}.remedialSkills.${skill.code}.suggestedActivities.${sequence}`, "Turutan aktiviti dicadangkan berulang."));
      for (const objective of skill.learningObjectives) {
        if (objective.remedialSkillId !== skill.id) issues.push(publicationIssue("ORPHAN_OBJECTIVE", `${programmePath}.remedialSkills.${skill.code}.objectives.${objective.id}`, "Objektif mesti dimiliki oleh kemahiran yang sama."));
      }
      for (const activity of skill.suggestedActivities) {
        if (activity.remedialSkillId !== skill.id) issues.push(publicationIssue("ORPHAN_SUGGESTED_ACTIVITY", `${programmePath}.remedialSkills.${skill.code}.suggestedActivities.${activity.id}`, "Aktiviti mesti dimiliki oleh kemahiran yang sama."));
        if (activity.learningObjectiveId && !objectiveIds.has(activity.learningObjectiveId)) {
          issues.push(publicationIssue("CROSS_SKILL_OBJECTIVE", `${programmePath}.remedialSkills.${skill.code}.suggestedActivities.${activity.id}.learningObjectiveId`, "Objektif aktiviti mesti berasal daripada kemahiran yang sama."));
        }
      }
      for (const mapping of skill.standardMappings) {
        const mappedProgramme = mapping.learningStandard.contentStandard.programme;
        if (mappedProgramme.id !== programme.id || mappedProgramme.curriculumVersionId !== version.id) {
          issues.push(publicationIssue("CROSS_VERSION_MAPPING", `${programmePath}.remedialSkills.${skill.code}.mappings.${mapping.id}`, "Pemetaan kemahiran dan standard mesti berada dalam program serta versi yang sama."));
        }
      }
    }

    if (programme.code === "BM-PEMULIHAN") {
      for (const level of [1, 2, 3]) {
        if (!programme.years.some((year) => year.yearLevel === level)) {
          issues.push(publicationIssue("MISSING_YEAR", `${programmePath}.years.${level}`, `Tahun ${level} belum diwujudkan.`));
        }
      }
      const expectedStructures = ["PRA", "ABJAD", "SUKU_KATA", "PERKATAAN", "AYAT"];
      for (const code of expectedStructures) {
        if (!programme.languageStructures.some((structure) => structure.code === code)) {
          issues.push(publicationIssue("MISSING_LANGUAGE_STRUCTURE", `${programmePath}.languageStructures.${code}`, `Struktur bahasa ${code} belum diwujudkan.`));
        }
      }
      const expectedSkills = ["KP-PRA", ...Array.from({ length: 32 }, (_value, index) => `KP${String(index + 1).padStart(2, "0")}`)];
      for (const skill of programme.remedialSkills) {
        if (!expectedSkills.includes(skill.code)) {
          issues.push(publicationIssue("UNEXPECTED_SKILL", `${programmePath}.remedialSkills.${skill.code}`, "Kod kemahiran tidak termasuk dalam struktur BM Pemulihan 2019."));
        }
      }
      for (const code of expectedSkills) {
        const skill = programme.remedialSkills.find((candidate) => candidate.code === code);
        if (!skill) {
          issues.push(publicationIssue("MISSING_SKILL", `remedialSkills.${code}`, `Kemahiran ${code} belum diwujudkan.`));
          continue;
        }
        const expectedSequence = code === "KP-PRA" ? 0 : Number(code.slice(2));
        if (skill.sequence !== expectedSequence) {
          issues.push(publicationIssue("INVALID_SKILL_SEQUENCE", `${programmePath}.remedialSkills.${code}.sequence`, `${code} mesti menggunakan turutan ${expectedSequence}.`));
        }
        if (skill.languageStructure.code !== expectedStructureForBmSkill(code)) {
          issues.push(publicationIssue("INVALID_SKILL_STRUCTURE", `${programmePath}.remedialSkills.${code}.languageStructureId`, `${code} dipautkan kepada struktur bahasa yang tidak sah.`));
        }
        if (code === "KP-PRA" && !skill.isPreparatory) {
          issues.push(publicationIssue("INVALID_PREPARATORY_SKILL", `${programmePath}.remedialSkills.KP-PRA.isPreparatory`, "KP-PRA mesti ditandakan sebagai kemahiran persediaan."));
        }
      }
    }
  }
  if (contentStandardCount === 0) issues.push(publicationIssue("MISSING_CONTENT_STANDARD", "contentStandards", "Sekurang-kurangnya satu Standard Kandungan diperlukan."));
  if (learningStandardCount === 0) issues.push(publicationIssue("MISSING_LEARNING_STANDARD", "learningStandards", "Sekurang-kurangnya satu Standard Pembelajaran diperlukan."));
  return issues;
}

function invalidPublication(issues: PublicationIssue[]): AppError {
  return appError("CURRICULUM_PUBLICATION_INVALID", 409, "Versi kurikulum tidak memenuhi syarat penerbitan.", { issues });
}

export async function publishCurriculumVersion(versionId: string, context: CurriculumAuditContext) {
  assertSuperAdmin(context);
  return prisma.$transaction(async (tx) => {
    const before = await tx.curriculumVersion.findUnique({ where: { id: versionId }, select: versionSelect });
    if (!before) throw versionNotFound();
    assertDraft(before.status);
    const issues = await publicationValidationIssues(tx, versionId);
    if (issues.length > 0) throw invalidPublication(issues);
    const record = await tx.curriculumVersion.update({
      where: { id: versionId },
      data: { status: CurriculumStatus.PUBLISHED, publishedAt: new Date(), archivedAt: null },
      select: versionSelect,
    });
    await recordAuditEvent(
      auditEvent(context, "CURRICULUM_VERSION_PUBLISHED", record.id, versionAuditDto(before), versionAuditDto(record)),
      { transactionClient: tx, strict: true },
    );
    return versionDto(record);
  });
}

export async function archiveCurriculumVersion(versionId: string, context: CurriculumAuditContext) {
  assertSuperAdmin(context);
  return prisma.$transaction(async (tx) => {
    const before = await tx.curriculumVersion.findUnique({ where: { id: versionId }, select: versionSelect });
    if (!before) throw versionNotFound();
    if (before.status !== CurriculumStatus.PUBLISHED) throw notEditable();
    const record = await tx.curriculumVersion.update({
      where: { id: versionId },
      data: { status: CurriculumStatus.ARCHIVED, archivedAt: new Date() },
      select: versionSelect,
    });
    await recordAuditEvent(
      auditEvent(context, "CURRICULUM_VERSION_ARCHIVED", record.id, versionAuditDto(before), versionAuditDto(record)),
      { transactionClient: tx, strict: true },
    );
    return versionDto(record);
  });
}

const treeStructureSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  sequence: true,
  status: true,
  remedialSkills: {
    select: {
      id: true,
      programmeId: true,
      languageStructureId: true,
      code: true,
      sequence: true,
      name: true,
      description: true,
      isPreparatory: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { learningObjectives: true, suggestedActivities: true, standardMappings: true } },
    },
    orderBy: { sequence: "asc" },
  },
} satisfies Prisma.LanguageStructureSelect;

const fullTreeSkillSelect = {
  id: true,
  programmeId: true,
  languageStructureId: true,
  code: true,
  sequence: true,
  name: true,
  description: true,
  isPreparatory: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  learningObjectives: { select: objectiveSelect, orderBy: { sequence: "asc" } },
  suggestedActivities: { select: suggestedActivitySelect, orderBy: { sequence: "asc" } },
  standardMappings: { select: mappingSelect, orderBy: { createdAt: "asc" } },
} satisfies Prisma.RemedialSkillSelect;

type TreeStructureRecord = Prisma.LanguageStructureGetPayload<{ select: typeof treeStructureSelect }>;
type FullTreeSkillRecord = Prisma.RemedialSkillGetPayload<{ select: typeof fullTreeSkillSelect }>;

function treeSummaryStructureDto(record: TreeStructureRecord) {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    description: record.description,
    sequence: record.sequence,
    status: record.status,
    skills: record.remedialSkills.map((skill) => ({
      id: skill.id,
      code: skill.code,
      sequence: skill.sequence,
      name: skill.name,
      description: skill.description,
      isPreparatory: skill.isPreparatory,
      status: skill.status,
      objectiveCount: skill._count.learningObjectives,
      suggestedActivityCount: skill._count.suggestedActivities,
      mappedLearningStandardCount: skill._count.standardMappings,
    })),
  };
}

function fullTreeSkillDto(record: FullTreeSkillRecord) {
  return {
    id: record.id,
    code: record.code,
    sequence: record.sequence,
    name: record.name,
    description: record.description,
    isPreparatory: record.isPreparatory,
    status: record.status,
    objectives: record.learningObjectives.map(objectiveDto),
    suggestedActivities: record.suggestedActivities.map(suggestedActivityDto),
    learningStandardMappings: record.standardMappings.map(mappingDto),
  };
}

export async function getCurriculumTree(programmeId: string, query: CurriculumTreeQuery, context: CurriculumAuditContext) {
  const programme = await getProgrammeRecord(programmeId);
  assertReadableProgramme(programme, context);
  const years = await prisma.curriculumYear.findMany({ where: { programmeId }, select: yearSelect, orderBy: { sequence: "asc" } });
  const include = query.include ?? "summary";
  if (include === "summary") {
    const structures = await prisma.languageStructure.findMany({ where: { programmeId }, select: treeStructureSelect, orderBy: { sequence: "asc" } });
    return {
      programme: { id: programme.id, code: programme.code, name: programme.name, description: programme.description, status: programme.status },
      version: programme.curriculumVersion,
      years: years.map(yearDto),
      languageStructures: structures.map(treeSummaryStructureDto),
    };
  }
  const [structures, skills] = await Promise.all([
    prisma.languageStructure.findMany({ where: { programmeId }, select: { id: true, code: true, name: true, description: true, sequence: true, status: true }, orderBy: { sequence: "asc" } }),
    prisma.remedialSkill.findMany({ where: { programmeId }, select: fullTreeSkillSelect, orderBy: { sequence: "asc" } }),
  ]);
  const skillsByStructure = new Map<string, FullTreeSkillRecord[]>();
  for (const skill of skills) {
    const current = skillsByStructure.get(skill.languageStructureId) ?? [];
    current.push(skill);
    skillsByStructure.set(skill.languageStructureId, current);
  }
  return {
    programme: { id: programme.id, code: programme.code, name: programme.name, description: programme.description, status: programme.status },
    version: programme.curriculumVersion,
    years: years.map(yearDto),
    languageStructures: structures.map((structure) => ({
      ...structure,
      skills: (skillsByStructure.get(structure.id) ?? []).map(fullTreeSkillDto),
    })),
  };
}
