import {
  AccountStatus,
  Prisma,
  TeacherPermission,
  UserRole,
} from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { PermissionGrantContext } from "../middleware/auth.middleware.js";
import {
  consumeTeacherPermissionGrantInTransaction,
  type ConsumeTeacherPermissionGrantInput,
  type TeacherPermissionGrantRepository,
} from "./authorization.service.js";
import {
  dispatchAuditEvent,
  type AuditEvent,
  type AuditEventDispatcher,
} from "./audit.service.js";
import { generateSetupToken } from "../utils/generateSetupToken.js";
import { normalizeMalaysianPhone } from "../utils/phone.js";
import type {
  CreateTeacherGrantRequest,
  CreateTeacherRequest,
  ListTeachersQuery,
  UpdateTeacherRequest,
} from "../validators/teacher.validator.js";

const teacherAccountSelect = {
  id: true,
  userId: true,
  schoolId: true,
  teacherId: true,
  fullName: true,
  gender: true,
  phone: true,
  position: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
  school: {
    select: {
      id: true,
      schoolCode: true,
      schoolName: true,
    },
  },
  user: {
    select: {
      id: true,
      role: true,
      email: true,
      passwordHash: true,
      accountStatus: true,
      isFirstLogin: true,
      lastLogin: true,
      setupToken: true,
      setupTokenExpiry: true,
    },
  },
} satisfies Prisma.TeacherSelect;

const teacherClassSelect = {
  id: true,
  schoolId: true,
  className: true,
  yearLevel: true,
  academicYear: true,
  accountStatus: true,
  _count: {
    select: {
      students: true,
    },
  },
} satisfies Prisma.SchoolClassSelect;

const teacherGrantSelect = {
  id: true,
  teacherId: true,
  grantedById: true,
  permission: true,
  expiresAt: true,
  maxUses: true,
  usedCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TeacherPermissionGrantSelect;

type PrismaTeacherAccount = Prisma.TeacherGetPayload<{
  select: typeof teacherAccountSelect;
}>;
type PrismaTeacherClass = Prisma.SchoolClassGetPayload<{
  select: typeof teacherClassSelect;
}>;
type PrismaTeacherGrant = Prisma.TeacherPermissionGrantGetPayload<{
  select: typeof teacherGrantSelect;
}>;

export interface TeacherAccountRecord extends PrismaTeacherAccount {}

export interface TeacherDetailsRecord extends TeacherAccountRecord {
  classes: PrismaTeacherClass[];
}

export interface TeacherGrantRecord extends PrismaTeacherGrant {}

export interface TeacherActor {
  userId: string;
  profileId: string;
  role: UserRole;
  schoolId: string | null;
  name?: string | null;
}

export interface TeacherAuditContext {
  actor: TeacherActor;
  permissionGrant?: PermissionGrantContext;
  requestIp?: string | null;
  userAgent?: string | null;
}

export interface TeacherProvisionInput {
  schoolId: string;
  teacherId: string;
  fullName: string;
  gender: CreateTeacherRequest["gender"];
  email: string;
  phone: string | null;
  position: string | null;
  avatar: string | null;
  setupToken: string;
  setupTokenExpiry: Date;
  permissionConsumption?: ConsumeTeacherPermissionGrantInput;
  now: Date;
}

export interface TeacherProfileUpdateInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  position?: string | null;
  avatar?: string | null;
}

export interface TeacherListFilters {
  skip: number;
  take: number;
  search?: string;
  status?: AccountStatus;
  schoolId?: string;
  position?: string;
  sortBy: ListTeachersQuery["sortBy"];
  sortOrder: ListTeachersQuery["sortOrder"];
}

export interface TeacherRepository {
  findById(id: string): Promise<TeacherAccountRecord | null>;
  findDetailsById(id: string): Promise<TeacherDetailsRecord | null>;
  findBySchoolAndTeacherId(schoolId: string, teacherId: string): Promise<TeacherAccountRecord | null>;
  findByPhone(phone: string): Promise<TeacherAccountRecord | null>;
  findUserIdByEmail(email: string): Promise<string | null>;
  schoolExists(schoolId: string): Promise<boolean>;
  create(input: TeacherProvisionInput): Promise<TeacherAccountRecord>;
  findMany(filters: TeacherListFilters): Promise<TeacherAccountRecord[]>;
  count(filters: Pick<TeacherListFilters, "search" | "status" | "schoolId" | "position">): Promise<number>;
  updateProfile(id: string, input: TeacherProfileUpdateInput): Promise<TeacherAccountRecord>;
  updateStatus(id: string, status: AccountStatus): Promise<TeacherAccountRecord>;
  refreshSetup(id: string, setupToken: string, setupTokenExpiry: Date): Promise<TeacherAccountRecord>;
  createGrant(input: {
    teacherId: string;
    grantedById: string;
    permission: TeacherPermission;
    expiresAt: Date | null;
    maxUses: number;
  }): Promise<TeacherGrantRecord>;
  findGrants(teacherId: string): Promise<TeacherGrantRecord[]>;
  findGrant(teacherId: string, grantId: string): Promise<TeacherGrantRecord | null>;
  revokeGrant(teacherId: string, grantId: string): Promise<TeacherGrantRecord>;
}

export type InvitationDeliveryStatus = "QUEUED" | "SENT" | "DEVELOPMENT_PREVIEW" | "FAILED";

export interface TeacherSetupInvitation {
  teacherId: string;
  email: string;
  setupToken: string;
  expiresAt: Date;
}

export type TeacherInvitationDispatcher = (
  invitation: TeacherSetupInvitation,
) => Promise<InvitationDeliveryStatus> | InvitationDeliveryStatus;

export interface TeacherServiceDependencies {
  repository?: TeacherRepository;
  auditDispatcher?: AuditEventDispatcher;
  invitationDispatcher?: TeacherInvitationDispatcher;
  now?: () => Date;
  setupTokenGenerator?: () => string;
  setupExpiryHours?: number;
}

export interface TeacherResponse {
  id: string;
  userId: string;
  schoolId: string;
  teacherId: string;
  fullName: string;
  gender: CreateTeacherRequest["gender"];
  email: string;
  phone: string | null;
  position: string | null;
  avatar: string | null;
  accountStatus: AccountStatus;
  isFirstLogin: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  school: {
    id: string;
    schoolCode: string;
    schoolName: string;
  };
}

export interface TeacherDetailsResponse extends TeacherResponse {
  assignedClasses: Array<{
    id: string;
    className: string;
    yearLevel: number;
    academicYear: number;
    accountStatus: AccountStatus;
    studentCount: number;
  }>;
  studentCount: number;
}

export interface TeacherGrantResponse {
  id: string;
  teacherId: string;
  grantedById: string;
  permission: TeacherPermission;
  expiresAt: Date | null;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function teacherNotFound(): AppError {
  return new AppError("TEACHER_NOT_FOUND", 404, "Guru tidak ditemui.");
}

function schoolNotFound(): AppError {
  return new AppError("SCHOOL_NOT_FOUND", 404, "Sekolah tidak ditemui.");
}

function teacherIdExists(): AppError {
  return new AppError("TEACHER_ID_EXISTS", 409, "ID guru telah digunakan di sekolah ini.");
}

function teacherEmailExists(): AppError {
  return new AppError("TEACHER_EMAIL_EXISTS", 409, "E-mel guru telah digunakan.");
}

function teacherPhoneExists(): AppError {
  return new AppError("TEACHER_PHONE_EXISTS", 409, "Nombor telefon guru telah digunakan.");
}

function teacherStatusTransitionInvalid(): AppError {
  return new AppError(
    "TEACHER_STATUS_TRANSITION_INVALID",
    403,
    "Perubahan status guru tidak dibenarkan.",
  );
}

function teacherSetupAlreadyCompleted(): AppError {
  return new AppError(
    "TEACHER_SETUP_ALREADY_COMPLETED",
    409,
    "Akaun guru telah selesai disediakan.",
  );
}

function teacherSetupResendNotAllowed(): AppError {
  return new AppError(
    "TEACHER_SETUP_RESEND_NOT_ALLOWED",
    403,
    "Jemputan persediaan tidak boleh dihantar semula untuk akaun ini.",
  );
}

function teacherGrantNotFound(): AppError {
  return new AppError("TEACHER_PERMISSION_GRANT_NOT_FOUND", 404, "Kebenaran guru tidak ditemui.");
}

function permissionDenied(): AppError {
  return new AppError(
    "AUTH_PERMISSION_DENIED",
    403,
    "Anda tidak mempunyai kebenaran untuk melaksanakan tindakan ini.",
  );
}

function schoolAccessDenied(): AppError {
  return new AppError(
    "AUTH_SCHOOL_ACCESS_DENIED",
    403,
    "Anda tidak dibenarkan mengakses data sekolah ini.",
  );
}

function roleForbidden(): AppError {
  return new AppError(
    "AUTH_ROLE_FORBIDDEN",
    403,
    "Anda tidak mempunyai kebenaran untuk mengakses fungsi ini.",
  );
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
  const normalized = fields.join(" ").toLowerCase();

  if (normalized.includes("teacherid")) return teacherIdExists();
  if (normalized.includes("phone")) return teacherPhoneExists();
  if (normalized.includes("email")) return teacherEmailExists();

  return new AppError("TEACHER_CONFLICT", 409, "Maklumat guru telah digunakan.");
}

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  return value.trim();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTeacherId(value: string): string {
  return value.trim().toUpperCase();
}

function toTeacherRecord(record: PrismaTeacherAccount): TeacherAccountRecord {
  return record;
}

function toTeacherDetailsRecord(
  record: Prisma.TeacherGetPayload<{
    select: typeof teacherAccountSelect & { classes: { select: typeof teacherClassSelect } };
  }>,
): TeacherDetailsRecord {
  return record;
}

function toTeacherGrantRecord(record: PrismaTeacherGrant): TeacherGrantRecord {
  return record;
}

function toResponse(record: TeacherAccountRecord): TeacherResponse {
  return {
    id: record.id,
    userId: record.userId,
    schoolId: record.schoolId,
    teacherId: record.teacherId,
    fullName: record.fullName,
    gender: record.gender,
    email: record.user.email ?? "",
    phone: record.phone,
    position: record.position,
    avatar: record.avatar,
    accountStatus: record.user.accountStatus,
    isFirstLogin: record.user.isFirstLogin,
    lastLogin: record.user.lastLogin,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    school: record.school,
  };
}

function toDetailsResponse(record: TeacherDetailsRecord): TeacherDetailsResponse {
  const assignedClasses = record.classes.map((schoolClass) => ({
    id: schoolClass.id,
    className: schoolClass.className,
    yearLevel: schoolClass.yearLevel,
    academicYear: schoolClass.academicYear,
    accountStatus: schoolClass.accountStatus,
    studentCount: schoolClass._count.students,
  }));

  return {
    ...toResponse(record),
    assignedClasses,
    studentCount: assignedClasses.reduce((total, schoolClass) => total + schoolClass.studentCount, 0),
  };
}

function toGrantResponse(record: TeacherGrantRecord): TeacherGrantResponse {
  return {
    id: record.id,
    teacherId: record.teacherId,
    grantedById: record.grantedById,
    permission: record.permission,
    expiresAt: record.expiresAt,
    maxUses: record.maxUses,
    usedCount: record.usedCount,
    remainingUses: Math.max(0, record.maxUses - record.usedCount),
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildWhere(
  filters: Pick<TeacherListFilters, "search" | "status" | "schoolId" | "position">,
): Prisma.TeacherWhereInput {
  const search = filters.search?.trim();
  const searchConditions: Prisma.TeacherWhereInput[] = search
    ? [
        { teacherId: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { position: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ]
    : [];

  return {
    ...(filters.schoolId ? { schoolId: filters.schoolId } : {}),
    ...(filters.position ? { position: { equals: filters.position, mode: "insensitive" } } : {}),
    user: {
      role: UserRole.TEACHER,
      ...(filters.status ? { accountStatus: filters.status } : {}),
    },
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
  };
}

function getSetupExpiryHours(value: number | undefined): number {
  const configured = value ?? Number(process.env.TEACHER_SETUP_TOKEN_EXPIRES_HOURS ?? 24);
  return Number.isFinite(configured) && configured > 0 && configured <= 168 ? configured : 24;
}

function canTransitionStatus(current: AccountStatus, next: AccountStatus, role: UserRole): boolean {
  if (current === AccountStatus.ACTIVE) {
    return next === AccountStatus.SUSPENDED || next === AccountStatus.ARCHIVED;
  }

  if (current === AccountStatus.SUSPENDED) {
    return next === AccountStatus.ACTIVE || next === AccountStatus.ARCHIVED;
  }

  return current === AccountStatus.ARCHIVED && next === AccountStatus.ACTIVE && role === UserRole.SUPER_ADMIN;
}

function toAuditEvent(
  context: TeacherAuditContext,
  action: Extract<
    AuditEvent["action"],
    | "TEACHER_CREATED"
    | "TEACHER_UPDATED"
    | "TEACHER_STATUS_CHANGED"
    | "TEACHER_SETUP_RESENT"
  >,
  record: TeacherAccountRecord,
  timestamp: Date,
  before: TeacherResponse | null,
): AuditEvent {
  return {
    actorUserId: context.actor.userId,
    actorProfileId: context.actor.profileId,
    actorRole: context.actor.role,
    actorName: context.actor.name ?? null,
    action,
    resourceType: "TEACHER",
    resourceId: record.id,
    schoolId: record.schoolId,
    before,
    after: toResponse(record),
    timestamp,
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

function toGrantAuditEvent(
  context: TeacherAuditContext,
  action: Extract<AuditEvent["action"], "TEACHER_PERMISSION_GRANTED" | "TEACHER_PERMISSION_REVOKED">,
  teacher: TeacherAccountRecord,
  grant: TeacherGrantRecord,
  timestamp: Date,
  before: TeacherGrantResponse | null,
): AuditEvent {
  return {
    actorUserId: context.actor.userId,
    actorProfileId: context.actor.profileId,
    actorRole: context.actor.role,
    actorName: context.actor.name ?? null,
    action,
    resourceType: "TEACHER_PERMISSION_GRANT",
    resourceId: grant.id,
    schoolId: teacher.schoolId,
    before,
    after: toGrantResponse(grant),
    timestamp,
    requestIp: context.requestIp ?? null,
    userAgent: context.userAgent ?? null,
  };
}

/** Development-safe delivery until a production email provider is configured. */
export function sendTeacherSetupInvitation(
  _invitation: TeacherSetupInvitation,
): InvitationDeliveryStatus {
  return process.env.NODE_ENV === "production" ? "FAILED" : "DEVELOPMENT_PREVIEW";
}

const prismaTeacherRepository: TeacherRepository = {
  async findById(id) {
    const record = await prisma.teacher.findUnique({ where: { id }, select: teacherAccountSelect });
    return record ? toTeacherRecord(record) : null;
  },
  async findDetailsById(id) {
    const record = await prisma.teacher.findUnique({
      where: { id },
      select: {
        ...teacherAccountSelect,
        classes: { select: teacherClassSelect },
      },
    });
    return record ? toTeacherDetailsRecord(record) : null;
  },
  async findBySchoolAndTeacherId(schoolId, teacherId) {
    const record = await prisma.teacher.findUnique({
      where: { schoolId_teacherId: { schoolId, teacherId } },
      select: teacherAccountSelect,
    });
    return record ? toTeacherRecord(record) : null;
  },
  async findByPhone(phone) {
    const record = await prisma.teacher.findUnique({ where: { phone }, select: teacherAccountSelect });
    return record ? toTeacherRecord(record) : null;
  },
  async findUserIdByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user?.id ?? null;
  },
  async schoolExists(schoolId) {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    return school !== null;
  },
  async create(input) {
    return prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({ where: { id: input.schoolId }, select: { id: true } });
      if (!school) throw schoolNotFound();

      const user = await tx.user.create({
        data: {
          role: UserRole.TEACHER,
          email: input.email,
          passwordHash: null,
          accountStatus: AccountStatus.PENDING,
          isFirstLogin: true,
          setupToken: input.setupToken,
          setupTokenExpiry: input.setupTokenExpiry,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });
      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          schoolId: input.schoolId,
          teacherId: input.teacherId,
          fullName: input.fullName,
          gender: input.gender,
          phone: input.phone,
          position: input.position,
          avatar: input.avatar,
        },
        select: teacherAccountSelect,
      });

      if (input.permissionConsumption) {
        await consumeTeacherPermissionGrantInTransaction(
          input.permissionConsumption,
          tx as unknown as TeacherPermissionGrantRepository,
          input.now,
        );
      }

      return toTeacherRecord(teacher);
    });
  },
  async findMany(filters) {
    const orderBy: Prisma.TeacherOrderByWithRelationInput =
      filters.sortBy === "email" || filters.sortBy === "accountStatus"
        ? { user: { [filters.sortBy]: filters.sortOrder } }
        : { [filters.sortBy]: filters.sortOrder };
    const records = await prisma.teacher.findMany({
      where: buildWhere(filters),
      orderBy,
      skip: filters.skip,
      take: filters.take,
      select: teacherAccountSelect,
    });
    return records.map(toTeacherRecord);
  },
  count(filters) {
    return prisma.teacher.count({ where: buildWhere(filters) });
  },
  async updateProfile(id, input) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.teacher.findUnique({ where: { id }, select: { userId: true } });
      if (!current) throw teacherNotFound();

      const { email, ...profileData } = input;
      if (email !== undefined) {
        await tx.user.update({ where: { id: current.userId }, data: { email } });
      }
      const record = await tx.teacher.update({
        where: { id },
        data: profileData,
        select: teacherAccountSelect,
      });
      return toTeacherRecord(record);
    });
  },
  async updateStatus(id, status) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.teacher.findUnique({ where: { id }, select: { userId: true } });
      if (!current) throw teacherNotFound();
      await tx.user.update({ where: { id: current.userId }, data: { accountStatus: status } });
      const record = await tx.teacher.findUnique({ where: { id }, select: teacherAccountSelect });
      if (!record) throw teacherNotFound();
      return toTeacherRecord(record);
    });
  },
  async refreshSetup(id, setupToken, setupTokenExpiry) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.teacher.findUnique({ where: { id }, select: { userId: true } });
      if (!current) throw teacherNotFound();
      await tx.user.update({
        where: { id: current.userId },
        data: { setupToken, setupTokenExpiry },
      });
      const record = await tx.teacher.findUnique({ where: { id }, select: teacherAccountSelect });
      if (!record) throw teacherNotFound();
      return toTeacherRecord(record);
    });
  },
  async createGrant(input) {
    const record = await prisma.teacherPermissionGrant.create({ data: input, select: teacherGrantSelect });
    return toTeacherGrantRecord(record);
  },
  async findGrants(teacherId) {
    const records = await prisma.teacherPermissionGrant.findMany({
      where: { teacherId },
      orderBy: { createdAt: "desc" },
      select: teacherGrantSelect,
    });
    return records.map(toTeacherGrantRecord);
  },
  async findGrant(teacherId, grantId) {
    const record = await prisma.teacherPermissionGrant.findFirst({
      where: { id: grantId, teacherId },
      select: teacherGrantSelect,
    });
    return record ? toTeacherGrantRecord(record) : null;
  },
  async revokeGrant(teacherId, grantId) {
    const record = await prisma.teacherPermissionGrant.update({
      where: { id: grantId, teacherId },
      data: { isActive: false },
      select: teacherGrantSelect,
    });
    return toTeacherGrantRecord(record);
  },
};

function normalizeCreateInput(
  data: CreateTeacherRequest,
  setupToken: string,
  setupTokenExpiry: Date,
  now: Date,
): TeacherProvisionInput {
  return {
    schoolId: data.schoolId,
    teacherId: normalizeTeacherId(data.teacherId),
    fullName: data.fullName.trim(),
    gender: data.gender,
    email: normalizeEmail(data.email),
    phone: data.phone ? normalizeMalaysianPhone(data.phone) : null,
    position: data.position?.trim() || null,
    avatar: data.avatar?.trim() || null,
    setupToken,
    setupTokenExpiry,
    now,
  };
}

function normalizeUpdateInput(data: UpdateTeacherRequest): TeacherProfileUpdateInput {
  const update: TeacherProfileUpdateInput = {};
  if (data.fullName !== undefined) update.fullName = data.fullName.trim();
  if (data.email !== undefined) update.email = normalizeEmail(data.email);
  if (data.phone !== undefined) {
    update.phone = data.phone === null ? null : normalizeMalaysianPhone(data.phone);
  }
  if (data.position !== undefined) update.position = normalizeOptionalString(data.position);
  if (data.avatar !== undefined) update.avatar = normalizeOptionalString(data.avatar);
  return update;
}

async function assertTeacherRecord(repository: TeacherRepository, teacherId: string): Promise<TeacherAccountRecord> {
  const record = await repository.findById(teacherId);
  if (!record || record.user.role !== UserRole.TEACHER) throw teacherNotFound();
  return record;
}

function assertTeacherCreateAuthorization(
  input: TeacherProvisionInput,
  context: TeacherAuditContext,
): TeacherProvisionInput {
  const { actor, permissionGrant } = context;
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return input;
  if (actor.role !== UserRole.TEACHER) throw roleForbidden();
  if (!actor.schoolId || actor.schoolId !== input.schoolId) throw schoolAccessDenied();
  if (
    !permissionGrant ||
    permissionGrant.teacherId !== actor.profileId ||
    permissionGrant.permission !== TeacherPermission.CREATE_TEACHER
  ) {
    throw permissionDenied();
  }

  return {
    ...input,
    permissionConsumption: {
      grantId: permissionGrant.id,
      teacherId: actor.profileId,
      permission: TeacherPermission.CREATE_TEACHER,
    },
  };
}

async function dispatchTeacherAudit(
  context: TeacherAuditContext,
  action: Extract<
    AuditEvent["action"],
    | "TEACHER_CREATED"
    | "TEACHER_UPDATED"
    | "TEACHER_STATUS_CHANGED"
    | "TEACHER_SETUP_RESENT"
  >,
  record: TeacherAccountRecord,
  before: TeacherResponse | null,
  deps: TeacherServiceDependencies,
): Promise<void> {
  await dispatchAuditEvent(
    toAuditEvent(context, action, record, deps.now?.() ?? new Date(), before),
    deps.auditDispatcher,
  );
}

async function dispatchGrantAudit(
  context: TeacherAuditContext,
  action: Extract<AuditEvent["action"], "TEACHER_PERMISSION_GRANTED" | "TEACHER_PERMISSION_REVOKED">,
  teacher: TeacherAccountRecord,
  grant: TeacherGrantRecord,
  before: TeacherGrantResponse | null,
  deps: TeacherServiceDependencies,
): Promise<void> {
  await dispatchAuditEvent(
    toGrantAuditEvent(context, action, teacher, grant, deps.now?.() ?? new Date(), before),
    deps.auditDispatcher,
  );
}

export async function createTeacher(
  data: CreateTeacherRequest,
  context: TeacherAuditContext,
  deps: TeacherServiceDependencies = {},
): Promise<{ teacher: TeacherResponse; invitation: { status: InvitationDeliveryStatus; expiresAt: Date } }> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const now = deps.now?.() ?? new Date();
  const setupToken = (deps.setupTokenGenerator ?? generateSetupToken)();
  const expiresAt = new Date(now.getTime() + getSetupExpiryHours(deps.setupExpiryHours) * 60 * 60 * 1_000);
  const input = assertTeacherCreateAuthorization(
    normalizeCreateInput(data, setupToken, expiresAt, now),
    context,
  );

  const [schoolExists, idMatch, emailMatch, phoneMatch] = await Promise.all([
    repository.schoolExists(input.schoolId),
    repository.findBySchoolAndTeacherId(input.schoolId, input.teacherId),
    repository.findUserIdByEmail(input.email),
    input.phone ? repository.findByPhone(input.phone) : Promise.resolve(null),
  ]);
  if (!schoolExists) throw schoolNotFound();
  if (idMatch) throw teacherIdExists();
  if (emailMatch) throw teacherEmailExists();
  if (phoneMatch) throw teacherPhoneExists();

  let record: TeacherAccountRecord;
  try {
    record = await repository.create(input);
  } catch (error) {
    const mapped = mapUniqueConstraintError(error);
    if (mapped) throw mapped;
    throw error;
  }

  const invitationDispatcher = deps.invitationDispatcher ?? sendTeacherSetupInvitation;
  const status = await invitationDispatcher({
    teacherId: record.id,
    email: record.user.email ?? "",
    setupToken,
    expiresAt,
  });
  await dispatchTeacherAudit(context, "TEACHER_CREATED", record, null, deps);

  return {
    teacher: toResponse(record),
    invitation: { status, expiresAt },
  };
}

export async function listTeachers(
  query: ListTeachersQuery,
  deps: TeacherServiceDependencies = {},
): Promise<{
  teachers: TeacherResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const filters: TeacherListFilters = {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    search: query.search?.trim() || undefined,
    status: query.status,
    schoolId: query.schoolId,
    position: query.position?.trim() || undefined,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
  const [records, total] = await Promise.all([
    repository.findMany(filters),
    repository.count(filters),
  ]);
  const totalPages = Math.ceil(total / query.limit);

  return {
    teachers: records.filter((record) => record.user.role === UserRole.TEACHER).map(toResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
}

export async function getTeacherById(
  teacherId: string,
  deps: TeacherServiceDependencies = {},
): Promise<TeacherDetailsResponse> {
  const record = await (deps.repository ?? prismaTeacherRepository).findDetailsById(teacherId);
  if (!record || record.user.role !== UserRole.TEACHER) throw teacherNotFound();
  return toDetailsResponse(record);
}

export async function updateTeacher(
  teacherId: string,
  data: UpdateTeacherRequest,
  context: TeacherAuditContext,
  deps: TeacherServiceDependencies = {},
): Promise<TeacherResponse> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const current = await assertTeacherRecord(repository, teacherId);
  const input = normalizeUpdateInput(data);

  if (input.email !== undefined) {
    const userId = await repository.findUserIdByEmail(input.email);
    if (userId && userId !== current.userId) throw teacherEmailExists();
  }
  if (input.phone !== undefined && input.phone !== null) {
    const phoneMatch = await repository.findByPhone(input.phone);
    if (phoneMatch && phoneMatch.id !== teacherId) throw teacherPhoneExists();
  }

  let record: TeacherAccountRecord;
  try {
    record = await repository.updateProfile(teacherId, input);
  } catch (error) {
    const mapped = mapUniqueConstraintError(error);
    if (mapped) throw mapped;
    throw error;
  }
  await dispatchTeacherAudit(context, "TEACHER_UPDATED", record, toResponse(current), deps);
  return toResponse(record);
}

export async function updateTeacherStatus(
  teacherId: string,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED",
  context: TeacherAuditContext,
  deps: TeacherServiceDependencies = {},
): Promise<TeacherResponse> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const current = await assertTeacherRecord(repository, teacherId);
  if (!canTransitionStatus(current.user.accountStatus, status, context.actor.role)) {
    throw teacherStatusTransitionInvalid();
  }
  const record = await repository.updateStatus(teacherId, status);
  await dispatchTeacherAudit(context, "TEACHER_STATUS_CHANGED", record, toResponse(current), deps);
  return toResponse(record);
}

export async function resendTeacherSetup(
  teacherId: string,
  context: TeacherAuditContext,
  deps: TeacherServiceDependencies = {},
): Promise<{ invitation: { status: InvitationDeliveryStatus; expiresAt: Date } }> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const current = await assertTeacherRecord(repository, teacherId);
  if (current.user.accountStatus === AccountStatus.ARCHIVED) throw teacherSetupResendNotAllowed();
  if (!current.user.isFirstLogin && current.user.passwordHash) throw teacherSetupAlreadyCompleted();

  const now = deps.now?.() ?? new Date();
  const setupToken = (deps.setupTokenGenerator ?? generateSetupToken)();
  const expiresAt = new Date(now.getTime() + getSetupExpiryHours(deps.setupExpiryHours) * 60 * 60 * 1_000);
  const record = await repository.refreshSetup(teacherId, setupToken, expiresAt);
  const invitationDispatcher = deps.invitationDispatcher ?? sendTeacherSetupInvitation;
  const status = await invitationDispatcher({
    teacherId: record.id,
    email: record.user.email ?? "",
    setupToken,
    expiresAt,
  });
  await dispatchTeacherAudit(context, "TEACHER_SETUP_RESENT", record, toResponse(current), deps);
  return { invitation: { status, expiresAt } };
}

export async function createTeacherPermissionGrant(
  teacherId: string,
  data: CreateTeacherGrantRequest,
  context: TeacherAuditContext,
  deps: TeacherServiceDependencies = {},
): Promise<TeacherGrantResponse> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const teacher = await assertTeacherRecord(repository, teacherId);
  const grant = await repository.createGrant({
    teacherId,
    grantedById: context.actor.profileId,
    permission: data.permission,
    expiresAt: data.expiresAt ?? null,
    maxUses: data.maxUses,
  });
  await dispatchGrantAudit(context, "TEACHER_PERMISSION_GRANTED", teacher, grant, null, deps);
  return toGrantResponse(grant);
}

export async function listTeacherPermissionGrants(
  teacherId: string,
  deps: TeacherServiceDependencies = {},
): Promise<TeacherGrantResponse[]> {
  const repository = deps.repository ?? prismaTeacherRepository;
  await assertTeacherRecord(repository, teacherId);
  const grants = await repository.findGrants(teacherId);
  return grants.map(toGrantResponse);
}

export async function revokeTeacherPermissionGrant(
  teacherId: string,
  grantId: string,
  context: TeacherAuditContext,
  deps: TeacherServiceDependencies = {},
): Promise<TeacherGrantResponse> {
  const repository = deps.repository ?? prismaTeacherRepository;
  const teacher = await assertTeacherRecord(repository, teacherId);
  const current = await repository.findGrant(teacherId, grantId);
  if (!current) throw teacherGrantNotFound();
  const grant = await repository.revokeGrant(teacherId, grantId);
  await dispatchGrantAudit(
    context,
    "TEACHER_PERMISSION_REVOKED",
    teacher,
    grant,
    toGrantResponse(current),
    deps,
  );
  return toGrantResponse(grant);
}

export const teacherStatusPolicy =
  "ACTIVE may transition to SUSPENDED or ARCHIVED; SUSPENDED may transition to ACTIVE or ARCHIVED; only SUPER_ADMIN may restore ARCHIVED teachers to ACTIVE.";
