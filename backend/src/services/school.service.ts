import { AccountStatus, Prisma, UserRole } from "@prisma/client";
import { performance } from "node:perf_hooks";
import type { Request } from "express";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import {
  dispatchAuditEvent,
  type AuditEvent,
  type AuditEventDispatcher,
} from "./audit.service.js";
import { normalizeMalaysianPhone } from "../utils/phone.js";
import type {
  CreateSchoolRequest,
  ListSchoolsQuery,
  UpdateSchoolRequest,
} from "../validators/school.validator.js";
import { markRequestPerformance } from "../utils/request-performance.js";

export interface SchoolRecord {
  id: string;
  schoolCode: string;
  schoolName: string;
  logo: string | null;
  principalName: string | null;
  address: string;
  phone: string;
  contactEmail: string | null;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SchoolDetailsRecord extends SchoolRecord {
  counts: {
    admins: number;
    teachers: number;
    students: number;
    classes: number;
  };
}

export interface SchoolActor {
  userId: string;
  profileId: string;
  role: UserRole;
  name?: string | null;
}

export interface SchoolAuditContext {
  actor: SchoolActor;
  requestIp?: string | null;
  userAgent?: string | null;
}

export interface SchoolListFilters {
  skip: number;
  take: number;
  search?: string;
  status?: AccountStatus;
  sortBy: ListSchoolsQuery["sortBy"];
  sortOrder: ListSchoolsQuery["sortOrder"];
}

export interface SchoolRepository {
  findById(id: string): Promise<SchoolRecord | null>;
  findBySchoolCode(schoolCode: string): Promise<SchoolRecord | null>;
  findBySchoolName(schoolName: string): Promise<SchoolRecord | null>;
  findByContactEmail(contactEmail: string): Promise<SchoolRecord | null>;
  create(data: Omit<SchoolRecord, "id" | "createdAt" | "updatedAt">): Promise<SchoolRecord>;
  findMany(filters: SchoolListFilters): Promise<SchoolRecord[]>;
  count(filters: Pick<SchoolListFilters, "search" | "status">): Promise<number>;
  findDetailsById(id: string): Promise<SchoolDetailsRecord | null>;
  update(
    id: string,
    data: Prisma.SchoolUpdateInput,
  ): Promise<SchoolRecord>;
}

export interface SchoolServiceDependencies {
  repository?: SchoolRepository;
  auditDispatcher?: AuditEventDispatcher;
  now?: () => Date;
  request?: Request;
}

const schoolSelect = {
  id: true,
  schoolCode: true,
  schoolName: true,
  logo: true,
  principalName: true,
  address: true,
  phone: true,
  contactEmail: true,
  accountStatus: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SchoolSelect;

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return value.trim();
}

function normalizeSchoolCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeSchoolName(value: string): string {
  return value.trim();
}

function normalizeContactEmail(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  return value.trim().toLowerCase();
}

function schoolNotFound(): AppError {
  return new AppError("SCHOOL_NOT_FOUND", 404, "Sekolah tidak ditemui.");
}

function schoolCodeExists(): AppError {
  return new AppError("SCHOOL_CODE_EXISTS", 409, "Kod sekolah telah digunakan.");
}

function schoolNameExists(): AppError {
  return new AppError("SCHOOL_NAME_EXISTS", 409, "Nama sekolah telah digunakan.");
}

function schoolEmailExists(): AppError {
  return new AppError("SCHOOL_EMAIL_EXISTS", 409, "E-mel perhubungan telah digunakan.");
}

function mapUniqueConstraintError(error: unknown): AppError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return null;
  }

  const target = error.meta?.target;
  const fields = Array.isArray(target)
    ? target.filter((value): value is string => typeof value === "string")
    : typeof target === "string"
      ? [target]
      : [];

  if (fields.some((field) => field.includes("schoolCode"))) {
    return schoolCodeExists();
  }

  if (fields.some((field) => field.includes("schoolName"))) {
    return schoolNameExists();
  }

  if (fields.some((field) => field.includes("contactEmail"))) {
    return schoolEmailExists();
  }

  return new AppError("SCHOOL_CONFLICT", 409, "Maklumat sekolah telah digunakan.");
}

function statusTransitionInvalid(): AppError {
  return new AppError(
    "SCHOOL_STATUS_TRANSITION_INVALID",
    403,
    "Perubahan status sekolah tidak dibenarkan.",
  );
}

function toSchoolRecord(school: Prisma.SchoolGetPayload<{ select: typeof schoolSelect }>): SchoolRecord {
  return school;
}

function buildWhere(filters: Pick<SchoolListFilters, "search" | "status">): Prisma.SchoolWhereInput {
  const search = filters.search?.trim();
  const searchConditions: Prisma.SchoolWhereInput[] = search
    ? [
        { schoolCode: { contains: search, mode: "insensitive" } },
        { schoolName: { contains: search, mode: "insensitive" } },
        { principalName: { contains: search, mode: "insensitive" } },
        { contactEmail: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    : [];

  return {
    ...(filters.status ? { accountStatus: filters.status } : {}),
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
  };
}

const prismaSchoolRepository: SchoolRepository = {
  async findById(id) {
    const school = await prisma.school.findUnique({
      where: { id },
      select: schoolSelect,
    });

    return school ? toSchoolRecord(school) : null;
  },
  async findBySchoolCode(schoolCode) {
    const school = await prisma.school.findUnique({
      where: { schoolCode },
      select: schoolSelect,
    });

    return school ? toSchoolRecord(school) : null;
  },
  async findBySchoolName(schoolName) {
    const school = await prisma.school.findUnique({
      where: { schoolName },
      select: schoolSelect,
    });

    return school ? toSchoolRecord(school) : null;
  },
  async findByContactEmail(contactEmail) {
    const school = await prisma.school.findUnique({
      where: { contactEmail },
      select: schoolSelect,
    });

    return school ? toSchoolRecord(school) : null;
  },
  async create(data) {
    const school = await prisma.school.create({
      data,
      select: schoolSelect,
    });

    return toSchoolRecord(school);
  },
  async findMany(filters) {
    const schools = await prisma.school.findMany({
      where: buildWhere(filters),
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip: filters.skip,
      take: filters.take,
      select: schoolSelect,
    });

    return schools.map(toSchoolRecord);
  },
  count(filters) {
    return prisma.school.count({ where: buildWhere(filters) });
  },
  async findDetailsById(id) {
    const school = await prisma.school.findUnique({
      where: { id },
      select: {
        ...schoolSelect,
        _count: {
          select: {
            admins: true,
            teachers: true,
            students: true,
            classes: true,
          },
        },
      },
    });

    if (!school) {
      return null;
    }

    const { _count, ...schoolRecord } = school;

    return {
      ...schoolRecord,
      counts: _count,
    };
  },
  async update(id, data) {
    const school = await prisma.school.update({
      where: { id },
      data,
      select: schoolSelect,
    });

    return toSchoolRecord(school);
  },
};

function toAuditEvent(
  context: SchoolAuditContext,
  action: AuditEvent["action"],
  school: SchoolRecord,
  timestamp: Date,
  before: SchoolRecord | null,
): AuditEvent {
  return {
    actorUserId: context.actor.userId,
    actorProfileId: context.actor.profileId,
    actorRole: context.actor.role,
    actorName: context.actor.name ?? null,
    action,
    resourceType: "SCHOOL",
    resourceId: school.id,
    schoolId: school.id,
    before,
    after: school,
    timestamp,
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

async function assertUniqueForCreate(
  repository: SchoolRepository,
  data: Omit<SchoolRecord, "id" | "createdAt" | "updatedAt">,
): Promise<void> {
  const [codeMatch, nameMatch, emailMatch] = await Promise.all([
    repository.findBySchoolCode(data.schoolCode),
    repository.findBySchoolName(data.schoolName),
    data.contactEmail
      ? repository.findByContactEmail(data.contactEmail)
      : Promise.resolve(null),
  ]);

  if (codeMatch) {
    throw schoolCodeExists();
  }

  if (nameMatch) {
    throw schoolNameExists();
  }

  if (emailMatch) {
    throw schoolEmailExists();
  }
}

async function assertUniqueForUpdate(
  repository: SchoolRepository,
  currentSchoolId: string,
  data: Prisma.SchoolUpdateInput,
): Promise<void> {
  const schoolCode = typeof data.schoolCode === "string" ? data.schoolCode : undefined;
  const schoolName = typeof data.schoolName === "string" ? data.schoolName : undefined;
  const contactEmail = typeof data.contactEmail === "string" ? data.contactEmail : undefined;

  const [codeMatch, nameMatch, emailMatch] = await Promise.all([
    schoolCode ? repository.findBySchoolCode(schoolCode) : Promise.resolve(null),
    schoolName ? repository.findBySchoolName(schoolName) : Promise.resolve(null),
    contactEmail ? repository.findByContactEmail(contactEmail) : Promise.resolve(null),
  ]);

  if (codeMatch && codeMatch.id !== currentSchoolId) {
    throw schoolCodeExists();
  }

  if (nameMatch && nameMatch.id !== currentSchoolId) {
    throw schoolNameExists();
  }

  if (emailMatch && emailMatch.id !== currentSchoolId) {
    throw schoolEmailExists();
  }
}

function normalizeCreateInput(data: CreateSchoolRequest): Omit<SchoolRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    schoolCode: normalizeSchoolCode(data.schoolCode),
    schoolName: normalizeSchoolName(data.schoolName),
    principalName: normalizeOptionalString(data.principalName) ?? null,
    address: data.address.trim(),
    phone: normalizeMalaysianPhone(data.phone),
    contactEmail: normalizeContactEmail(data.contactEmail) ?? null,
    logo: normalizeOptionalString(data.logo) ?? null,
    accountStatus: AccountStatus.ACTIVE,
  };
}

function normalizeUpdateInput(data: UpdateSchoolRequest): Prisma.SchoolUpdateInput {
  const update: Prisma.SchoolUpdateInput = {};

  if (data.schoolCode !== undefined) {
    update.schoolCode = normalizeSchoolCode(data.schoolCode);
  }
  if (data.schoolName !== undefined) {
    update.schoolName = normalizeSchoolName(data.schoolName);
  }
  if (data.principalName !== undefined) {
    update.principalName = normalizeOptionalString(data.principalName);
  }
  if (data.address !== undefined) {
    update.address = data.address.trim();
  }
  if (data.phone !== undefined) {
    update.phone = normalizeMalaysianPhone(data.phone);
  }
  if (data.contactEmail !== undefined) {
    update.contactEmail = normalizeContactEmail(data.contactEmail);
  }
  if (data.logo !== undefined) {
    update.logo = normalizeOptionalString(data.logo);
  }

  return update;
}

function canTransitionStatus(
  currentStatus: AccountStatus,
  nextStatus: AccountStatus,
  actorRole: UserRole,
): boolean {
  if (currentStatus === AccountStatus.ACTIVE) {
    return nextStatus === AccountStatus.SUSPENDED || nextStatus === AccountStatus.ARCHIVED;
  }

  if (currentStatus === AccountStatus.SUSPENDED) {
    return nextStatus === AccountStatus.ACTIVE || nextStatus === AccountStatus.ARCHIVED;
  }

  return (
    currentStatus === AccountStatus.ARCHIVED &&
    nextStatus === AccountStatus.ACTIVE &&
    actorRole === UserRole.SUPER_ADMIN
  );
}

export async function createSchool(
  data: CreateSchoolRequest,
  context: SchoolAuditContext,
  deps: SchoolServiceDependencies = {},
): Promise<SchoolRecord> {
  const repository = deps.repository ?? prismaSchoolRepository;
  const normalized = normalizeCreateInput(data);

  await assertUniqueForCreate(repository, normalized);
  let school: SchoolRecord;

  try {
    school = await repository.create(normalized);
  } catch (error) {
    const mappedError = mapUniqueConstraintError(error);

    if (mappedError) {
      throw mappedError;
    }

    throw error;
  }

  await dispatchAuditEvent(
    toAuditEvent(
      context,
      "SCHOOL_CREATED",
      school,
      deps.now?.() ?? new Date(),
      null,
    ),
    deps.auditDispatcher,
  );

  return school;
}

export async function listSchools(
  query: ListSchoolsQuery,
  deps: SchoolServiceDependencies = {},
): Promise<{
  schools: SchoolRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> {
  const serviceStartedAt = performance.now();
  const repository = deps.repository ?? prismaSchoolRepository;
  const page = query.page;
  const limit = query.limit;
  const filters: SchoolListFilters = {
    skip: (page - 1) * limit,
    take: limit,
    search: query.search?.trim() || undefined,
    status: query.status,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const [schools, total] = await Promise.all([
    (async () => {
      const startedAt = performance.now();
      const result = await repository.findMany(filters);
      if (deps.request) {
        markRequestPerformance(deps.request, "prismaFindManyMs", performance.now() - startedAt);
      }
      return result;
    })(),
    (async () => {
      const startedAt = performance.now();
      const result = await repository.count(filters);
      if (deps.request) {
        markRequestPerformance(deps.request, "prismaCountMs", performance.now() - startedAt);
      }
      return result;
    })(),
  ]);
  const totalPages = Math.ceil(total / limit);
  if (deps.request) {
    markRequestPerformance(deps.request, "serviceMs", performance.now() - serviceStartedAt);
  }

  return {
    schools,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getSchoolById(
  schoolId: string,
  deps: SchoolServiceDependencies = {},
): Promise<SchoolDetailsRecord> {
  const repository = deps.repository ?? prismaSchoolRepository;
  const school = await repository.findDetailsById(schoolId);

  if (!school) {
    throw schoolNotFound();
  }

  return school;
}

export async function updateSchool(
  schoolId: string,
  data: UpdateSchoolRequest,
  context: SchoolAuditContext,
  deps: SchoolServiceDependencies = {},
): Promise<SchoolRecord> {
  const repository = deps.repository ?? prismaSchoolRepository;
  const current = await repository.findById(schoolId);

  if (!current) {
    throw schoolNotFound();
  }

  const normalized = normalizeUpdateInput(data);
  await assertUniqueForUpdate(repository, schoolId, normalized);
  let school: SchoolRecord;

  try {
    school = await repository.update(schoolId, normalized);
  } catch (error) {
    const mappedError = mapUniqueConstraintError(error);

    if (mappedError) {
      throw mappedError;
    }

    throw error;
  }

  await dispatchAuditEvent(
    toAuditEvent(
      context,
      "SCHOOL_UPDATED",
      school,
      deps.now?.() ?? new Date(),
      current,
    ),
    deps.auditDispatcher,
  );

  return school;
}

export async function updateSchoolStatus(
  schoolId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED",
  context: SchoolAuditContext,
  deps: SchoolServiceDependencies = {},
): Promise<SchoolRecord> {
  const repository = deps.repository ?? prismaSchoolRepository;
  const current = await repository.findById(schoolId);

  if (!current) {
    throw schoolNotFound();
  }

  if (!canTransitionStatus(current.accountStatus, status, context.actor.role)) {
    throw statusTransitionInvalid();
  }

  const school = await repository.update(schoolId, { accountStatus: status });

  await dispatchAuditEvent(
    toAuditEvent(
      context,
      "SCHOOL_STATUS_CHANGED",
      school,
      deps.now?.() ?? new Date(),
      current,
    ),
    deps.auditDispatcher,
  );

  return school;
}

export const schoolStatusPolicy =
  "ACTIVE may transition to SUSPENDED or ARCHIVED; SUSPENDED may transition to ACTIVE or ARCHIVED; only SUPER_ADMIN may restore ARCHIVED schools to ACTIVE.";
