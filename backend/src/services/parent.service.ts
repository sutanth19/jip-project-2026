import { AccountStatus, ParentRelationship, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { dispatchAuditEvent, type AuditEvent, type AuditEventDispatcher } from "./audit.service.js";
import { generateSetupToken } from "../utils/generateSetupToken.js";
import { normalizeMalaysianPhone } from "../utils/phone.js";
import type {
  CreateParentRequest,
  LinkParentStudentRequest,
  ListParentsQuery,
  UpdateParentRequest,
} from "../validators/parent.validator.js";

const parentSelect = {
  id: true, userId: true, fullName: true, phone: true, occupation: true, address: true, avatar: true,
  createdAt: true, updatedAt: true,
  user: { select: { id: true, role: true, email: true, accountStatus: true, isFirstLogin: true, lastLogin: true, passwordHash: true } },
  students: { select: { relationship: true } },
  _count: { select: { students: true } },
} satisfies Prisma.ParentSelect;

const parentDetailSelect = {
  ...parentSelect,
  students: {
    select: {
      id: true, relationship: true, createdAt: true,
      student: { select: { id: true, studentId: true, fullName: true, avatar: true, class: { select: { id: true, teacherId: true, schoolId: true, className: true, yearLevel: true, academicYear: true } } } },
    },
    orderBy: { student: { fullName: "asc" } },
  },
} satisfies Prisma.ParentSelect;

type ParentRecord = Prisma.ParentGetPayload<{ select: typeof parentSelect }>;
type ParentDetailRecord = Prisma.ParentGetPayload<{ select: typeof parentDetailSelect }>;

export interface ParentActor extends AuthenticatedSession { name?: string | null; }
export interface ParentAuditContext { actor: ParentActor; requestIp?: string | null; userAgent?: string | null; }
export type InvitationDeliveryStatus = "QUEUED" | "SENT" | "DEVELOPMENT_PREVIEW" | "FAILED";
export interface ParentSetupInvitation { parentId: string; email: string | null; setupToken: string; expiresAt: Date; }
export type ParentInvitationDispatcher = (invitation: ParentSetupInvitation) => Promise<InvitationDeliveryStatus> | InvitationDeliveryStatus;
export interface ParentServiceDependencies { auditDispatcher?: AuditEventDispatcher; invitationDispatcher?: ParentInvitationDispatcher; now?: () => Date; setupTokenGenerator?: () => string; setupExpiryHours?: number; }

function error(code: string, statusCode: number, message: string): AppError { return new AppError(code, statusCode, message); }
const parentNotFound = () => error("PARENT_NOT_FOUND", 404, "Ibu bapa tidak ditemui.");
const studentNotFound = () => error("STUDENT_NOT_FOUND", 404, "Murid tidak ditemui.");
const parentPhoneExists = () => error("PARENT_PHONE_EXISTS", 409, "Nombor telefon ibu bapa telah digunakan.");
const parentEmailExists = () => error("PARENT_EMAIL_EXISTS", 409, "E-mel ibu bapa telah digunakan.");
const parentStudentExists = () => error("PARENT_STUDENT_EXISTS", 409, "Ibu bapa telah dipautkan kepada murid ini.");
const parentStudentNotFound = () => error("PARENT_STUDENT_NOT_FOUND", 404, "Hubungan ibu bapa dan murid tidak ditemui.");
const forbidden = () => error("AUTH_ROLE_FORBIDDEN", 403, "Anda tidak mempunyai kebenaran untuk mengakses fungsi ini.");
const teacherAccessDenied = () => error("AUTH_OWNER_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses rekod ibu bapa ini.");
const transitionInvalid = () => error("PARENT_STATUS_TRANSITION_INVALID", 403, "Perubahan status ibu bapa tidak dibenarkan.");
const setupResendNotAllowed = () => error("PARENT_SETUP_RESEND_NOT_ALLOWED", 403, "Jemputan persediaan tidak boleh dihantar semula untuk akaun ini.");
const setupComplete = () => error("PARENT_SETUP_ALREADY_COMPLETED", 409, "Akaun ibu bapa telah selesai disediakan.");

function mapUniqueError(value: unknown): AppError | null {
  if (!(value instanceof Prisma.PrismaClientKnownRequestError) || value.code !== "P2002") return null;
  const target = Array.isArray(value.meta?.target) ? value.meta.target.join(" ") : String(value.meta?.target ?? "");
  if (target.toLowerCase().includes("phone")) return parentPhoneExists();
  if (target.toLowerCase().includes("email")) return parentEmailExists();
  if (target.toLowerCase().includes("parentid") && target.toLowerCase().includes("studentid")) return parentStudentExists();
  return error("PARENT_CONFLICT", 409, "Maklumat ibu bapa telah digunakan.");
}

function normalizeEmail(value: string): string { return value.trim().toLowerCase(); }
function optional(value: string | null | undefined): string | null | undefined { return value === undefined || value === null ? value : value.trim() || null; }
function setupExpiryHours(value: number | undefined): number {
  const configured = value ?? Number(process.env.PARENT_SETUP_TOKEN_EXPIRES_HOURS ?? 24);
  return Number.isFinite(configured) && configured > 0 && configured <= 168 ? configured : 24;
}

export interface ParentResponse {
  id: string; userId: string; fullName: string; phone: string; email: string | null; occupation: string | null;
  address: string | null; avatar: string | null; accountStatus: AccountStatus; isFirstLogin: boolean;
  lastLogin: Date | null; studentCount: number; relationship: ParentRelationship | null; createdAt: Date; updatedAt: Date;
}
export interface ParentSummaryResponse {
  id: string; fullName: string; phone: string; email: string | null; occupation: string | null;
  avatar: string | null; accountStatus: AccountStatus; studentCount: number; relationship: ParentRelationship | null;
}
export interface ParentStudentResponse {
  id: string;
  relationship: ParentRelationship;
  createdAt: Date;
  student: {
    id: string;
    studentId: string;
    fullName: string;
    avatar: string | null;
    class: { id: string; className: string; yearLevel: number; academicYear: number };
  };
}
export interface TeacherParentDetailResponse extends ParentSummaryResponse {
  students: Array<Omit<ParentStudentResponse, "id" | "createdAt">>;
}
export interface ParentDetailResponse extends ParentResponse {
  students: ParentStudentResponse[];
}

function response(record: ParentRecord): ParentResponse {
  const relationship = record.students?.[0]?.relationship ?? null;
  return {
    id: record.id, userId: record.userId, fullName: record.fullName, phone: record.phone, email: record.user.email,
    occupation: record.occupation, address: record.address, avatar: record.avatar, accountStatus: record.user.accountStatus,
    isFirstLogin: record.user.isFirstLogin, lastLogin: record.user.lastLogin, studentCount: record._count.students,
    relationship, createdAt: record.createdAt, updatedAt: record.updatedAt,
  };
}
function summary(record: ParentRecord): ParentSummaryResponse {
  const { userId: _userId, address: _address, isFirstLogin: _first, lastLogin: _last, createdAt: _created, updatedAt: _updated, ...safe } = response(record);
  return safe;
}
function studentLinks(record: ParentDetailRecord, teacherId?: string): ParentStudentResponse[] {
  return record.students
    .filter((link) => !teacherId || link.student.class.teacherId === teacherId)
    .map((link) => ({ id: link.id, relationship: link.relationship, createdAt: link.createdAt, student: { id: link.student.id, studentId: link.student.studentId, fullName: link.student.fullName, avatar: link.student.avatar, class: { id: link.student.class.id, className: link.student.class.className, yearLevel: link.student.class.yearLevel, academicYear: link.student.class.academicYear } } }));
}
function actor(context: ParentAuditContext): ParentActor { return context.actor; }
const managementRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
const readRoles: UserRole[] = [...managementRoles, UserRole.TEACHER];
function requireManagementRole(context: ParentAuditContext): void {
  if (!managementRoles.includes(actor(context).role)) throw forbidden();
}
function requireWriteRole(context: ParentAuditContext): void {
  if (actor(context).role === UserRole.TEACHER) return;
  requireManagementRole(context);
}
async function resolveTeacherSchoolId(context: ParentAuditContext): Promise<string> {
  const teacher = await prisma.teacher.findUnique({ where: { id: actor(context).profileId }, select: { id: true, schoolId: true } });
  if (!teacher?.schoolId) throw forbidden();
  return teacher.schoolId;
}
async function findParentForTeacherWrite(parentId: string, context: ParentAuditContext): Promise<ParentDetailRecord> {
  const record = await prisma.parent.findUnique({ where: { id: parentId }, select: parentDetailSelect });
  if (!record || record.user.role !== UserRole.PARENT) throw parentNotFound();
  const schoolId = await resolveTeacherSchoolId(context);
  if (!record.students.some((link) => link.student.class.schoolId === schoolId)) throw teacherAccessDenied();
  return record;
}
async function resolveTeacherStudentIds(studentIds: string[] | undefined, context: ParentAuditContext): Promise<string[]> {
  const requested = [...new Set((studentIds ?? []).map((value) => value.trim()).filter(Boolean))];
  if (requested.length === 0) return [];
  const schoolId = await resolveTeacherSchoolId(context);
  const students = await prisma.student.findMany({
    where: {
      id: { in: requested },
      schoolId,
      user: { accountStatus: { not: AccountStatus.ARCHIVED } },
      class: { schoolId, accountStatus: { not: AccountStatus.ARCHIVED } },
    },
    select: { id: true },
  });
  if (students.length !== requested.length) throw studentNotFound();
  return students.map((student) => student.id);
}
async function syncParentStudents(
  tx: Prisma.TransactionClient,
  parentId: string,
  studentIds: string[] | undefined,
  relationship: ParentRelationship | undefined,
  context: ParentAuditContext,
): Promise<void> {
  if (studentIds === undefined) return;
  const resolvedStudentIds = actor(context).role === UserRole.TEACHER ? await resolveTeacherStudentIds(studentIds, context) : [...new Set(studentIds.map((value) => value.trim()).filter(Boolean))];
  if (actor(context).role === UserRole.TEACHER && resolvedStudentIds.length === 0) {
    throw error("PARENT_STUDENT_REQUIRED", 400, "Sekurang-kurangnya seorang murid perlu dipautkan.");
  }
  if (resolvedStudentIds.length > 0 && !relationship) {
    throw error("PARENT_RELATIONSHIP_REQUIRED", 400, "Hubungan ibu bapa diperlukan.");
  }
  const existing = await tx.parentStudent.findMany({ where: { parentId }, select: { id: true, studentId: true } });
  const keep = new Set(resolvedStudentIds);
  const toRemove = existing.filter((link) => !keep.has(link.studentId));
  if (toRemove.length > 0) {
    await tx.parentStudent.deleteMany({ where: { id: { in: toRemove.map((link) => link.id) } } });
  }
  for (const studentId of resolvedStudentIds) {
    await tx.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId, relationship: relationship ?? ParentRelationship.GUARDIAN },
      update: { relationship: relationship ?? ParentRelationship.GUARDIAN },
    });
  }
}
export function canParentTransitionStatus(current: AccountStatus, next: AccountStatus, role: UserRole): boolean {
  if (current === AccountStatus.ACTIVE) return next === AccountStatus.SUSPENDED || next === AccountStatus.ARCHIVED;
  if (current === AccountStatus.SUSPENDED) return next === AccountStatus.ACTIVE || next === AccountStatus.ARCHIVED;
  return current === AccountStatus.ARCHIVED && next === AccountStatus.ACTIVE && role === UserRole.SUPER_ADMIN;
}
function auditEvent(context: ParentAuditContext, action: Extract<AuditEvent["action"], "PARENT_CREATED" | "PARENT_UPDATED" | "PARENT_STATUS_CHANGED" | "PARENT_SETUP_RESENT" | "PARENT_STUDENT_LINKED" | "PARENT_STUDENT_UNLINKED">, resourceType: "PARENT" | "PARENT_STUDENT", resourceId: string, schoolId: string | null, before: unknown, after: unknown, timestamp: Date): AuditEvent {
  return { actorUserId: actor(context).userId, actorProfileId: actor(context).profileId, actorRole: actor(context).role, actorName: actor(context).name ?? null, action, resourceType, resourceId, schoolId, before, after, timestamp, requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null };
}
async function dispatch(context: ParentAuditContext, action: Parameters<typeof auditEvent>[1], resourceType: Parameters<typeof auditEvent>[2], resourceId: string, schoolId: string | null, before: unknown, after: unknown, deps: ParentServiceDependencies): Promise<void> {
  await dispatchAuditEvent(auditEvent(context, action, resourceType, resourceId, schoolId, before, after, deps.now?.() ?? new Date()), deps.auditDispatcher);
}

/** Development-safe delivery until a production email provider is configured. */
export function sendParentSetupInvitation(_invitation: ParentSetupInvitation): InvitationDeliveryStatus {
  return process.env.NODE_ENV === "production" ? "FAILED" : "DEVELOPMENT_PREVIEW";
}

export async function createParent(data: CreateParentRequest, context: ParentAuditContext, deps: ParentServiceDependencies = {}): Promise<{ parent: ParentResponse; invitation: { status: InvitationDeliveryStatus; expiresAt: Date } }> {
  requireWriteRole(context);
  const phone = normalizeMalaysianPhone(data.phone);
  const email = data.email ? normalizeEmail(data.email) : null;
  const now = deps.now?.() ?? new Date();
  const setupToken = (deps.setupTokenGenerator ?? generateSetupToken)();
  const expiresAt = new Date(now.getTime() + setupExpiryHours(deps.setupExpiryHours) * 60 * 60 * 1_000);
  const [phoneMatch, emailMatch] = await Promise.all([
    prisma.parent.findUnique({ where: { phone }, select: { id: true } }),
    email ? prisma.user.findUnique({ where: { email }, select: { id: true } }) : Promise.resolve(null),
  ]);
  if (phoneMatch) throw parentPhoneExists();
  if (emailMatch) throw parentEmailExists();
  let record: ParentRecord;
  try {
    record = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { role: UserRole.PARENT, email, passwordHash: null, accountStatus: AccountStatus.PENDING, isFirstLogin: true, setupToken, setupTokenExpiry: expiresAt, passwordResetToken: null, passwordResetExpiry: null } });
      const created = await tx.parent.create({ data: { userId: user.id, fullName: data.fullName.trim(), phone, occupation: optional(data.occupation) ?? null, address: optional(data.address) ?? null, avatar: optional(data.avatar) ?? null }, select: parentSelect });
      if (actor(context).role === UserRole.TEACHER && (!data.studentIds || data.studentIds.length === 0)) {
        throw error("PARENT_STUDENT_REQUIRED", 400, "Sekurang-kurangnya seorang murid perlu dipautkan.");
      }
      await syncParentStudents(tx, created.id, data.studentIds, data.relationship, context);
      const selectedCount = data.studentIds?.length ?? 0;
      return {
        ...created,
        students: data.studentIds
          ? data.studentIds.map(() => ({ relationship: data.relationship ?? ParentRelationship.GUARDIAN }))
          : created.students,
        _count: { students: selectedCount || created._count.students },
      };
    });
  } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  const status = await (deps.invitationDispatcher ?? sendParentSetupInvitation)({ parentId: record.id, email, setupToken, expiresAt });
  await dispatch(context, "PARENT_CREATED", "PARENT", record.id, null, null, response(record), deps);
  return { parent: response(record), invitation: { status, expiresAt } };
}

function where(query: ListParentsQuery, teacherId?: string): Prisma.ParentWhereInput {
  const search = query.search?.trim();
  const searchConditions: Prisma.ParentWhereInput[] = [];
  if (search) {
    searchConditions.push(
      { fullName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { occupation: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    );
    if (teacherId) {
      searchConditions.push({
        students: {
          some: {
            student: {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { studentId: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        },
      });
    }
  }
  return {
    user: { role: UserRole.PARENT, ...(query.status ? { accountStatus: query.status } : {}) },
    ...(teacherId ? { students: { some: { student: { class: { teacherId } } } } } : {}),
    ...(query.relationship ? { students: { some: { relationship: query.relationship } } } : {}),
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
  };
}
export async function listParents(query: ListParentsQuery, context: ParentAuditContext): Promise<{ parents: Array<ParentResponse | ParentSummaryResponse>; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }> {
  const role = actor(context).role;
  if (!readRoles.includes(role)) throw forbidden();
  const conditions = where(query, role === UserRole.TEACHER ? actor(context).profileId : undefined);
  const orderBy: Prisma.ParentOrderByWithRelationInput = query.sortBy === "email" || query.sortBy === "accountStatus" ? { user: { [query.sortBy]: query.sortOrder } } : { [query.sortBy]: query.sortOrder };
  const [records, total] = await Promise.all([prisma.parent.findMany({ where: conditions, orderBy, skip: (query.page - 1) * query.limit, take: query.limit, select: parentSelect }), prisma.parent.count({ where: conditions })]);
  const totalPages = Math.ceil(total / query.limit);
  return { parents: records.map(role === UserRole.TEACHER ? summary : response), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

async function findParentForRead(parentId: string, context: ParentAuditContext): Promise<ParentDetailRecord> {
  const role = actor(context).role;
  if (!readRoles.includes(role)) throw forbidden();
  const record = await prisma.parent.findUnique({ where: { id: parentId }, select: parentDetailSelect });
  if (!record || record.user.role !== UserRole.PARENT) throw parentNotFound();
  if (role === UserRole.TEACHER && !record.students.some((link) => link.student.class.teacherId === actor(context).profileId)) throw teacherAccessDenied();
  return record;
}

export async function getParentById(parentId: string, context: ParentAuditContext): Promise<ParentDetailResponse | TeacherParentDetailResponse> {
  const record = await findParentForRead(parentId, context);
  if (actor(context).role === UserRole.TEACHER) {
    return {
      ...summary(record),
      students: studentLinks(record, actor(context).profileId).map(({ id: _id, createdAt: _createdAt, ...link }) => link),
    };
  }
  return { ...response(record), students: studentLinks(record) };
}

export async function getParentStudents(parentId: string, context: ParentAuditContext): Promise<ParentStudentResponse[]> {
  const record = await findParentForRead(parentId, context);
  const teacherId = actor(context).role === UserRole.TEACHER ? actor(context).profileId : null;
  return studentLinks(record, teacherId ?? undefined);
}

export async function updateParent(parentId: string, data: UpdateParentRequest, context: ParentAuditContext, deps: ParentServiceDependencies = {}): Promise<ParentResponse> {
  requireWriteRole(context);
  const current = actor(context).role === UserRole.TEACHER ? await findParentForTeacherWrite(parentId, context) : await prisma.parent.findUnique({ where: { id: parentId }, select: parentSelect });
  if (!current || current.user.role !== UserRole.PARENT) throw parentNotFound();
  const phone = data.phone === undefined ? undefined : normalizeMalaysianPhone(data.phone);
  const email = data.email === undefined ? undefined : data.email === null ? null : normalizeEmail(data.email);
  if (phone !== undefined) {
    const match = await prisma.parent.findUnique({ where: { phone }, select: { id: true } });
    if (match && match.id !== parentId) throw parentPhoneExists();
  }
  if (email !== undefined && email !== null) {
    const match = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (match && match.id !== current.userId) throw parentEmailExists();
  }
  let record: ParentRecord;
  try {
    record = await prisma.$transaction(async (tx) => {
      if (email !== undefined) await tx.user.update({ where: { id: current.userId }, data: { email } });
      const updated = await tx.parent.update({ where: { id: parentId }, data: { ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}), ...(phone !== undefined ? { phone } : {}), ...(data.occupation !== undefined ? { occupation: optional(data.occupation) ?? null } : {}), ...(data.address !== undefined ? { address: optional(data.address) ?? null } : {}), ...(data.avatar !== undefined ? { avatar: optional(data.avatar) ?? null } : {}) }, select: parentSelect });
      await syncParentStudents(tx, parentId, data.studentIds, data.relationship ?? updated.students[0]?.relationship ?? ParentRelationship.GUARDIAN, context);
      const selectedCount = data.studentIds?.length;
      return {
        ...updated,
        students: data.studentIds
          ? data.studentIds.map(() => ({ relationship: data.relationship ?? updated.students[0]?.relationship ?? ParentRelationship.GUARDIAN }))
          : updated.students,
        _count: { students: selectedCount ?? updated._count.students },
      };
    });
  } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  await dispatch(context, "PARENT_UPDATED", "PARENT", record.id, null, response(current), response(record), deps);
  return response(record);
}

export async function updateParentStatus(parentId: string, status: "ACTIVE" | "SUSPENDED" | "ARCHIVED", context: ParentAuditContext, deps: ParentServiceDependencies = {}): Promise<ParentResponse> {
  requireWriteRole(context);
  const current = actor(context).role === UserRole.TEACHER ? await findParentForTeacherWrite(parentId, context) : await prisma.parent.findUnique({ where: { id: parentId }, select: parentSelect });
  if (!current || current.user.role !== UserRole.PARENT) throw parentNotFound();
  if (!canParentTransitionStatus(current.user.accountStatus, status, actor(context).role)) throw transitionInvalid();
  const record = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: current.userId }, data: { accountStatus: status } });
    const result = await tx.parent.findUnique({ where: { id: parentId }, select: parentSelect });
    if (!result) throw parentNotFound();
    return result;
  });
  await dispatch(context, "PARENT_STATUS_CHANGED", "PARENT", record.id, null, response(current), response(record), deps);
  return response(record);
}

export async function resendParentSetup(parentId: string, context: ParentAuditContext, deps: ParentServiceDependencies = {}): Promise<{ invitation: { status: InvitationDeliveryStatus; expiresAt: Date } }> {
  requireWriteRole(context);
  const current = actor(context).role === UserRole.TEACHER ? await findParentForTeacherWrite(parentId, context) : await prisma.parent.findUnique({ where: { id: parentId }, select: parentSelect });
  if (!current || current.user.role !== UserRole.PARENT) throw parentNotFound();
  if (current.user.accountStatus === AccountStatus.ARCHIVED) throw setupResendNotAllowed();
  if (!current.user.isFirstLogin && current.user.passwordHash) throw setupComplete();
  const now = deps.now?.() ?? new Date();
  const setupToken = (deps.setupTokenGenerator ?? generateSetupToken)();
  const expiresAt = new Date(now.getTime() + setupExpiryHours(deps.setupExpiryHours) * 60 * 60 * 1_000);
  const record = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: current.userId }, data: { setupToken, setupTokenExpiry: expiresAt } });
    const result = await tx.parent.findUnique({ where: { id: parentId }, select: parentSelect });
    if (!result) throw parentNotFound();
    return result;
  });
  const status = await (deps.invitationDispatcher ?? sendParentSetupInvitation)({ parentId: record.id, email: record.user.email, setupToken, expiresAt });
  await dispatch(context, "PARENT_SETUP_RESENT", "PARENT", record.id, null, response(current), response(record), deps);
  return { invitation: { status, expiresAt } };
}

export async function linkParentStudent(parentId: string, studentId: string, data: LinkParentStudentRequest, context: ParentAuditContext, deps: ParentServiceDependencies = {}): Promise<{ id: string; parentId: string; studentId: string; relationship: ParentRelationship; createdAt: Date }> {
  requireWriteRole(context);
  const teacherSchoolId = actor(context).role === UserRole.TEACHER ? await resolveTeacherSchoolId(context) : null;
  const [parent, student, existing] = await Promise.all([
    prisma.parent.findUnique({ where: { id: parentId }, select: { id: true, user: { select: { role: true } }, students: { select: { student: { select: { class: { select: { schoolId: true } } } } } } } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true, schoolId: true, user: { select: { accountStatus: true } }, class: { select: { accountStatus: true, schoolId: true } } } }),
    prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } }, select: { id: true } }),
  ]);
  if (!parent || parent.user.role !== UserRole.PARENT) throw parentNotFound();
  if (!student) throw studentNotFound();
  if (teacherSchoolId && (student.schoolId !== teacherSchoolId || student.class.schoolId !== teacherSchoolId || student.class.accountStatus === AccountStatus.ARCHIVED || student.user.accountStatus === AccountStatus.ARCHIVED)) throw teacherAccessDenied();
  if (teacherSchoolId && !parent.students.some((link) => link.student.class.schoolId === teacherSchoolId)) throw teacherAccessDenied();
  if (existing) throw parentStudentExists();
  let link: { id: string; parentId: string; studentId: string; relationship: ParentRelationship; createdAt: Date };
  try { link = await prisma.parentStudent.create({ data: { parentId, studentId, relationship: data.relationship }, select: { id: true, parentId: true, studentId: true, relationship: true, createdAt: true } }); }
  catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  await dispatch(context, "PARENT_STUDENT_LINKED", "PARENT_STUDENT", link.id, student.schoolId, null, link, deps);
  return link;
}

export async function unlinkParentStudent(parentId: string, studentId: string, context: ParentAuditContext, deps: ParentServiceDependencies = {}): Promise<void> {
  requireWriteRole(context);
  const teacherSchoolId = actor(context).role === UserRole.TEACHER ? await resolveTeacherSchoolId(context) : null;
  const link = await prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } }, select: { id: true, parentId: true, studentId: true, relationship: true, createdAt: true, student: { select: { schoolId: true, class: { select: { schoolId: true } } } }, parent: { select: { students: { select: { student: { select: { class: { select: { schoolId: true } } } } } } } } } });
  if (!link) throw parentStudentNotFound();
  if (teacherSchoolId && (link.student.schoolId !== teacherSchoolId || link.student.class.schoolId !== teacherSchoolId || !link.parent.students.some((entry) => entry.student.class.schoolId === teacherSchoolId))) throw teacherAccessDenied();
  await prisma.parentStudent.delete({ where: { id: link.id } });
  await dispatch(context, "PARENT_STUDENT_UNLINKED", "PARENT_STUDENT", link.id, link.student.schoolId, link, null, deps);
}

export const parentStatusPolicy = "ACTIVE may transition to SUSPENDED or ARCHIVED; SUSPENDED may transition to ACTIVE or ARCHIVED; only SUPER_ADMIN may restore ARCHIVED parents to ACTIVE.";
