import { randomInt } from "node:crypto";
import { AccountStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { hashPin } from "../utils/bcrypt.js";
import { dispatchAuditEvent, type AuditEvent, type AuditEventDispatcher } from "./audit.service.js";
import type { CreateStudentRequest, ListStudentsQuery, UpdateStudentRequest } from "../validators/student.validator.js";

const studentSelect = {
  id: true, userId: true, schoolId: true, classId: true, studentId: true, fullName: true,
  gender: true, birthDate: true, avatar: true, isPinChanged: true, pinUpdatedAt: true,
  createdAt: true, updatedAt: true,
  user: { select: { id: true, accountStatus: true, lastLogin: true } },
  school: { select: { id: true, schoolCode: true, schoolName: true } },
  class: { select: { id: true, schoolId: true, teacherId: true, className: true, yearLevel: true, academicYear: true } },
  _count: { select: { parents: true } },
} satisfies Prisma.StudentSelect;

const studentDetailSelect = {
  ...studentSelect,
  parents: {
    select: {
      id: true, relationship: true, createdAt: true,
      parent: { select: { id: true, fullName: true, phone: true, occupation: true, avatar: true } },
    },
    orderBy: { parent: { fullName: "asc" } },
  },
} satisfies Prisma.StudentSelect;

type StudentRecord = Prisma.StudentGetPayload<{ select: typeof studentSelect }>;
type StudentDetailRecord = Prisma.StudentGetPayload<{ select: typeof studentDetailSelect }>;

export interface StudentAuditContext {
  actor: AuthenticatedSession & { name?: string | null };
  requestIp?: string | null;
  userAgent?: string | null;
}

export type StudentPinDeliveryStatus = "DEVELOPMENT_PREVIEW" | "PRINTABLE_HANDOFF" | "QUEUED" | "SENT" | "FAILED";
interface StudentPinDelivery { studentProfileId: string; studentId: string; temporaryPin: string; }
export type StudentPinDeliveryDispatcher = (delivery: StudentPinDelivery) => Promise<StudentPinDeliveryStatus> | StudentPinDeliveryStatus;
export interface StudentServiceDependencies {
  auditDispatcher?: AuditEventDispatcher;
  now?: () => Date;
  pinGenerator?: () => string;
  pinDeliveryDispatcher?: StudentPinDeliveryDispatcher;
}

export interface StudentResponse {
  id: string; userId: string; schoolId: string; classId: string; studentId: string; fullName: string;
  gender: StudentRecord["gender"]; birthDate: Date | null; avatar: string | null; accountStatus: AccountStatus;
  isPinChanged: boolean; createdAt: Date; updatedAt: Date;
  school: { id: string; schoolCode: string; schoolName: string };
  class: { id: string; className: string; yearLevel: number; academicYear: number };
}

function appError(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const studentNotFound = () => appError("STUDENT_NOT_FOUND", 404, "Murid tidak ditemui.");
const studentIdExists = () => appError("STUDENT_ID_EXISTS", 409, "ID murid telah digunakan di sekolah ini.");
const schoolNotFound = () => appError("SCHOOL_NOT_FOUND", 404, "Sekolah tidak ditemui.");
const classNotFound = () => appError("SCHOOL_CLASS_NOT_FOUND", 404, "Kelas tidak ditemui.");
const forbidden = () => appError("AUTH_ROLE_FORBIDDEN", 403, "Anda tidak mempunyai kebenaran untuk mengakses fungsi ini.");
const teacherDenied = () => appError("AUTH_OWNER_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses murid ini.");
const statusInvalid = () => appError("STUDENT_STATUS_TRANSITION_INVALID", 403, "Perubahan status murid tidak dibenarkan.");
const transferInvalid = () => appError("STUDENT_CLASS_TRANSFER_INVALID", 400, "Pertukaran kelas murid tidak dibenarkan.");
const parentLinkExists = () => appError("STUDENT_PARENT_LINK_EXISTS", 409, "Ibu bapa telah dipautkan kepada murid ini.");
const parentLinkNotFound = () => appError("STUDENT_PARENT_LINK_NOT_FOUND", 404, "Hubungan ibu bapa dan murid tidak ditemui.");
const parentNotFound = () => appError("PARENT_NOT_FOUND", 404, "Ibu bapa tidak ditemui.");

function mapUniqueError(value: unknown): AppError | null {
  if (!(value instanceof Prisma.PrismaClientKnownRequestError) || value.code !== "P2002") return null;
  const target = Array.isArray(value.meta?.target) ? value.meta.target.join(" ") : String(value.meta?.target ?? "");
  const normalized = target.toLowerCase();
  if (normalized.includes("schoolid") && normalized.includes("studentid")) return studentIdExists();
  if (normalized.includes("parentid") && normalized.includes("studentid")) return parentLinkExists();
  return appError("STUDENT_CONFLICT", 409, "Maklumat murid telah digunakan.");
}

function actor(context: StudentAuditContext): AuthenticatedSession { return context.actor; }
function management(context: StudentAuditContext): void {
  const roles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
  if (!roles.includes(actor(context).role)) throw forbidden();
}
function canRead(context: StudentAuditContext): void {
  const roles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER];
  if (!roles.includes(actor(context).role)) throw forbidden();
}
function normalizeOptional(value: string | null | undefined): string | null | undefined {
  return value === undefined || value === null ? value : value.trim() || null;
}
function birthDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(`${value}T00:00:00.000Z`);
}
function safe(record: StudentRecord): StudentResponse {
  return {
    id: record.id, userId: record.userId, schoolId: record.schoolId, classId: record.classId,
    studentId: record.studentId, fullName: record.fullName, gender: record.gender, birthDate: record.birthDate,
    avatar: record.avatar, accountStatus: record.user.accountStatus, isPinChanged: record.isPinChanged,
    createdAt: record.createdAt, updatedAt: record.updatedAt,
    school: record.school,
    class: { id: record.class.id, className: record.class.className, yearLevel: record.class.yearLevel, academicYear: record.class.academicYear },
  };
}
function safeAudit(record: StudentResponse): Record<string, unknown> {
  return { id: record.id, schoolId: record.schoolId, classId: record.classId, studentId: record.studentId, fullName: record.fullName, gender: record.gender, birthDate: record.birthDate, avatar: record.avatar, accountStatus: record.accountStatus, isPinChanged: record.isPinChanged };
}
function audit(context: StudentAuditContext, action: Extract<AuditEvent["action"], "STUDENT_CREATED" | "STUDENT_UPDATED" | "STUDENT_STATUS_CHANGED" | "STUDENT_PIN_RESET" | "STUDENT_CLASS_CHANGED" | "STUDENT_PARENT_LINKED" | "STUDENT_PARENT_UNLINKED" | "CLASS_STUDENT_ASSIGNED">, resourceType: "STUDENT" | "STUDENT_PARENT", resourceId: string, schoolId: string, before: unknown, after: unknown, deps: StudentServiceDependencies): Promise<void> {
  return dispatchAuditEvent({ actorUserId: actor(context).userId, actorProfileId: actor(context).profileId, actorRole: actor(context).role, actorName: context.actor.name ?? null, action, resourceType, resourceId, schoolId, before, after, timestamp: deps.now?.() ?? new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, deps.auditDispatcher);
}

function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin) || /^(\d)\1{3}$/.test(pin)) return true;
  const digits = [...pin].map(Number);
  const ascending = digits.every((digit, index) => index === 0 || digit - digits[index - 1] === 1);
  const descending = digits.every((digit, index) => index === 0 || digits[index - 1] - digit === 1);
  return ascending || descending;
}
export function generateTemporaryStudentPin(): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const pin = randomInt(0, 10_000).toString().padStart(4, "0");
    if (!isWeakPin(pin)) return pin;
  }
  throw appError("STUDENT_PIN_GENERATION_FAILED", 500, "PIN murid tidak dapat dijana.");
}
/** No provider is configured yet. A future printable student credential slip can consume this abstraction. */
export function deliverStudentPin(_delivery: StudentPinDelivery): StudentPinDeliveryStatus { return "DEVELOPMENT_PREVIEW"; }

async function requireTeacherAccess(studentProfileId: string, context: StudentAuditContext): Promise<void> {
  if (actor(context).role !== UserRole.TEACHER) return;
  const student = await prisma.student.findUnique({ where: { id: studentProfileId }, select: { schoolId: true, class: { select: { schoolId: true, teacherId: true } } } });
  if (!student || !actor(context).schoolId || student.schoolId !== actor(context).schoolId || student.class.schoolId !== student.schoolId || student.class.teacherId !== actor(context).profileId) throw teacherDenied();
}

export function canStudentTransitionStatus(current: AccountStatus, next: AccountStatus, role: UserRole): boolean {
  if (current === AccountStatus.ACTIVE) return next === AccountStatus.SUSPENDED || next === AccountStatus.ARCHIVED;
  if (current === AccountStatus.SUSPENDED) return next === AccountStatus.ACTIVE || next === AccountStatus.ARCHIVED;
  return current === AccountStatus.ARCHIVED && next === AccountStatus.ACTIVE && role === UserRole.SUPER_ADMIN;
}

export async function createStudent(data: CreateStudentRequest, context: StudentAuditContext, deps: StudentServiceDependencies = {}): Promise<{ student: StudentResponse; pinDelivery: { status: StudentPinDeliveryStatus } }> {
  management(context);
  const [school, assignedClass, existing] = await Promise.all([
    prisma.school.findUnique({ where: { id: data.schoolId }, select: { id: true } }),
    prisma.schoolClass.findUnique({ where: { id: data.classId }, select: { id: true, schoolId: true } }),
    prisma.student.findUnique({ where: { schoolId_studentId: { schoolId: data.schoolId, studentId: data.studentId } }, select: { id: true } }),
  ]);
  if (!school) throw schoolNotFound();
  if (!assignedClass) throw classNotFound();
  if (assignedClass.schoolId !== data.schoolId) throw transferInvalid();
  if (existing) throw studentIdExists();
  const temporaryPin = (deps.pinGenerator ?? generateTemporaryStudentPin)();
  if (isWeakPin(temporaryPin)) throw appError("STUDENT_PIN_POLICY_FAILED", 500, "PIN murid tidak mematuhi polisi keselamatan.");
  const pinHash = await hashPin(temporaryPin);
  let record: StudentRecord;
  try {
    record = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { role: UserRole.STUDENT, email: null, passwordHash: null, accountStatus: AccountStatus.ACTIVE, isFirstLogin: false, setupToken: null, setupTokenExpiry: null, passwordResetToken: null, passwordResetExpiry: null } });
      return tx.student.create({ data: { userId: user.id, schoolId: data.schoolId, classId: data.classId, studentId: data.studentId, fullName: data.fullName.trim(), gender: data.gender, birthDate: birthDate(data.birthDate) ?? null, avatar: normalizeOptional(data.avatar) ?? null, pinHash, isPinChanged: false, pinUpdatedAt: null }, select: studentSelect });
    });
  } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  const student = safe(record);
  const status = await (deps.pinDeliveryDispatcher ?? deliverStudentPin)({ studentProfileId: record.id, studentId: record.studentId, temporaryPin });
  await audit(context, "STUDENT_CREATED", "STUDENT", record.id, record.schoolId, null, safeAudit(student), deps);
  return { student, pinDelivery: { status } };
}

function listWhere(query: ListStudentsQuery, teacherId?: string): Prisma.StudentWhereInput {
  const search = query.search?.trim();
  return {
    ...(query.schoolId ? { schoolId: query.schoolId } : {}), ...(query.classId ? { classId: query.classId } : {}), ...(query.gender ? { gender: query.gender } : {}),
    ...(query.status ? { user: { accountStatus: query.status } } : {}),
    ...(query.yearLevel ? { class: { yearLevel: query.yearLevel } } : {}),
    ...(teacherId ? { class: { ...(query.yearLevel ? { yearLevel: query.yearLevel } : {}), teacherId } } : {}),
    ...(search ? { OR: [ { studentId: { contains: search, mode: "insensitive" } }, { fullName: { contains: search, mode: "insensitive" } }, { class: { className: { contains: search, mode: "insensitive" } } }, { school: { schoolName: { contains: search, mode: "insensitive" } } } ] } : {}),
  };
}
export async function listStudents(query: ListStudentsQuery, context: StudentAuditContext): Promise<{ students: StudentResponse[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }> {
  canRead(context);
  const teacherId = actor(context).role === UserRole.TEACHER ? actor(context).profileId : undefined;
  const where = listWhere(query, teacherId);
  const orderBy: Prisma.StudentOrderByWithRelationInput = query.sortBy === "accountStatus" ? { user: { accountStatus: query.sortOrder } } : { [query.sortBy]: query.sortOrder };
  const [records, total] = await Promise.all([prisma.student.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit, select: studentSelect }), prisma.student.count({ where })]);
  const totalPages = Math.ceil(total / query.limit);
  return { students: records.map(safe), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

export async function getStudentById(studentProfileId: string, context: StudentAuditContext): Promise<{ student: StudentResponse & { linkedParentCount: number; parents?: Array<{ id: string; fullName: string; relationship: string; phone?: string; occupation?: string | null; avatar: string | null }> } }> {
  canRead(context);
  await requireTeacherAccess(studentProfileId, context);
  const record = await prisma.student.findUnique({ where: { id: studentProfileId }, select: studentDetailSelect });
  if (!record) throw studentNotFound();
  const base = safe(record);
  const teacher = actor(context).role === UserRole.TEACHER;
  const parents = record.parents.map((link) => teacher
    ? { id: link.parent.id, fullName: link.parent.fullName, relationship: link.relationship, avatar: link.parent.avatar }
    : { id: link.parent.id, fullName: link.parent.fullName, relationship: link.relationship, phone: link.parent.phone, occupation: link.parent.occupation, avatar: link.parent.avatar });
  return { student: { ...base, linkedParentCount: record._count.parents, parents } };
}

export async function updateStudent(studentProfileId: string, data: UpdateStudentRequest, context: StudentAuditContext, deps: StudentServiceDependencies = {}): Promise<StudentResponse> {
  canRead(context);
  const role = actor(context).role;
  if (role === UserRole.TEACHER) {
    await requireTeacherAccess(studentProfileId, context);
    const permitted = new Set(["fullName", "avatar"]);
    if (Object.keys(data).some((key) => !permitted.has(key))) throw forbidden();
  }
  const beforeRecord = await prisma.student.findUnique({ where: { id: studentProfileId }, select: studentSelect });
  if (!beforeRecord) throw studentNotFound();
  if (data.studentId && data.studentId !== beforeRecord.studentId) {
    const conflict = await prisma.student.findUnique({ where: { schoolId_studentId: { schoolId: beforeRecord.schoolId, studentId: data.studentId } }, select: { id: true } });
    if (conflict) throw studentIdExists();
  }
  let record: StudentRecord;
  try {
    record = await prisma.student.update({ where: { id: studentProfileId }, data: { ...(data.studentId !== undefined ? { studentId: data.studentId } : {}), ...(data.fullName !== undefined ? { fullName: data.fullName.trim() } : {}), ...(data.gender !== undefined ? { gender: data.gender } : {}), ...(data.birthDate !== undefined ? { birthDate: birthDate(data.birthDate) } : {}), ...(data.avatar !== undefined ? { avatar: normalizeOptional(data.avatar) } : {}) }, select: studentSelect });
  } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  const result = safe(record);
  await audit(context, "STUDENT_UPDATED", "STUDENT", record.id, record.schoolId, safeAudit(safe(beforeRecord)), safeAudit(result), deps);
  return result;
}

export async function updateStudentStatus(studentProfileId: string, status: AccountStatus, context: StudentAuditContext, deps: StudentServiceDependencies = {}): Promise<StudentResponse> {
  management(context);
  const beforeRecord = await prisma.student.findUnique({ where: { id: studentProfileId }, select: studentSelect });
  if (!beforeRecord) throw studentNotFound();
  if (!canStudentTransitionStatus(beforeRecord.user.accountStatus, status, actor(context).role)) throw statusInvalid();
  const record = await prisma.student.update({ where: { id: studentProfileId }, data: { user: { update: { accountStatus: status } } }, select: studentSelect });
  const result = safe(record);
  await audit(context, "STUDENT_STATUS_CHANGED", "STUDENT", record.id, record.schoolId, { accountStatus: beforeRecord.user.accountStatus, classId: beforeRecord.classId }, { accountStatus: result.accountStatus, classId: record.classId }, deps);
  return result;
}

export async function resetStudentPin(studentProfileId: string, context: StudentAuditContext, deps: StudentServiceDependencies = {}): Promise<{ pinDelivery: { status: StudentPinDeliveryStatus } }> {
  canRead(context);
  if (actor(context).role === UserRole.TEACHER) await requireTeacherAccess(studentProfileId, context);
  const student = await prisma.student.findUnique({ where: { id: studentProfileId }, select: { id: true, studentId: true, schoolId: true, classId: true } });
  if (!student) throw studentNotFound();
  const temporaryPin = (deps.pinGenerator ?? generateTemporaryStudentPin)();
  if (isWeakPin(temporaryPin)) throw appError("STUDENT_PIN_POLICY_FAILED", 500, "PIN murid tidak mematuhi polisi keselamatan.");
  const now = deps.now?.() ?? new Date();
  await prisma.student.update({ where: { id: student.id }, data: { pinHash: await hashPin(temporaryPin), isPinChanged: false, pinUpdatedAt: now } });
  const status = await (deps.pinDeliveryDispatcher ?? deliverStudentPin)({ studentProfileId: student.id, studentId: student.studentId, temporaryPin });
  await audit(context, "STUDENT_PIN_RESET", "STUDENT", student.id, student.schoolId, null, { classId: student.classId, isPinChanged: false, pinUpdatedAt: now }, deps);
  return { pinDelivery: { status } };
}

export interface StudentClassTransferOptions {
  mode?: "student" | "class";
  auditAction?: "STUDENT_CLASS_CHANGED" | "CLASS_STUDENT_ASSIGNED";
}

export async function transferStudentClass(studentProfileId: string, classId: string, context: StudentAuditContext, deps: StudentServiceDependencies = {}, options: StudentClassTransferOptions = {}): Promise<StudentResponse> {
  management(context);
  const failure = options.mode === "class"
    ? () => appError("CLASS_STUDENT_ASSIGNMENT_INVALID", 400, "Penempatan murid ke dalam kelas tidak dibenarkan.")
    : transferInvalid;
  const result = await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentProfileId }, select: { id: true, schoolId: true, classId: true } });
    if (!student) throw studentNotFound();
    const targetClass = await tx.schoolClass.findUnique({
      where: { id: classId },
      select: {
        id: true, schoolId: true, accountStatus: true, capacity: true,
        _count: { select: { students: { where: { user: { accountStatus: { in: [AccountStatus.ACTIVE, AccountStatus.SUSPENDED] } } } } } },
      },
    });
    if (!targetClass || targetClass.schoolId !== student.schoolId || targetClass.id === student.classId || targetClass.accountStatus !== AccountStatus.ACTIVE) throw failure();
    if (targetClass.capacity !== null && targetClass._count.students >= targetClass.capacity) {
      throw appError("CLASS_CAPACITY_REACHED", 409, "Kapasiti kelas telah penuh.");
    }
    const record = await tx.student.update({ where: { id: studentProfileId }, data: { classId }, select: studentSelect });
    return { beforeClassId: student.classId, record };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  const student = safe(result.record);
  await audit(context, options.auditAction ?? "STUDENT_CLASS_CHANGED", "STUDENT", result.record.id, result.record.schoolId, { classId: result.beforeClassId }, { classId: result.record.classId }, deps);
  return student;
}

export async function getStudentParents(studentProfileId: string, context: StudentAuditContext): Promise<{ parents: Array<{ id: string; fullName: string; relationship: string; phone?: string; occupation?: string | null; avatar: string | null }> }> {
  canRead(context);
  if (actor(context).role === UserRole.TEACHER) await requireTeacherAccess(studentProfileId, context);
  const student = await prisma.student.findUnique({ where: { id: studentProfileId }, select: { id: true, parents: { select: { relationship: true, parent: { select: { id: true, fullName: true, phone: true, occupation: true, avatar: true } } }, orderBy: { parent: { fullName: "asc" } } } } });
  if (!student) throw studentNotFound();
  const teacher = actor(context).role === UserRole.TEACHER;
  return { parents: student.parents.map((link) => teacher ? { id: link.parent.id, fullName: link.parent.fullName, relationship: link.relationship, avatar: link.parent.avatar } : { id: link.parent.id, fullName: link.parent.fullName, relationship: link.relationship, phone: link.parent.phone, occupation: link.parent.occupation, avatar: link.parent.avatar }) };
}

export async function linkStudentParent(studentProfileId: string, parentId: string, relationship: "FATHER" | "MOTHER" | "GUARDIAN", context: StudentAuditContext, deps: StudentServiceDependencies = {}): Promise<{ id: string; parentId: string; studentId: string; relationship: string; createdAt: Date }> {
  management(context);
  const [student, parent, existing] = await Promise.all([prisma.student.findUnique({ where: { id: studentProfileId }, select: { id: true, schoolId: true, classId: true } }), prisma.parent.findUnique({ where: { id: parentId }, select: { id: true } }), prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId: studentProfileId } }, select: { id: true } })]);
  if (!student) throw studentNotFound();
  if (!parent) throw parentNotFound();
  if (existing) throw parentLinkExists();
  let link: { id: string; parentId: string; studentId: string; relationship: "FATHER" | "MOTHER" | "GUARDIAN"; createdAt: Date };
  try { link = await prisma.parentStudent.create({ data: { parentId, studentId: studentProfileId, relationship }, select: { id: true, parentId: true, studentId: true, relationship: true, createdAt: true } }); } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  await audit(context, "STUDENT_PARENT_LINKED", "STUDENT_PARENT", link.id, student.schoolId, null, { classId: student.classId, parentId: link.parentId, studentId: link.studentId, relationship: link.relationship }, deps);
  return link;
}

export async function unlinkStudentParent(studentProfileId: string, parentId: string, context: StudentAuditContext, deps: StudentServiceDependencies = {}): Promise<void> {
  management(context);
  const student = await prisma.student.findUnique({ where: { id: studentProfileId }, select: { id: true, schoolId: true, classId: true } });
  if (!student) throw studentNotFound();
  const link = await prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId: studentProfileId } }, select: { id: true, parentId: true, studentId: true, relationship: true } });
  if (!link) throw parentLinkNotFound();
  await prisma.parentStudent.delete({ where: { id: link.id } });
  await audit(context, "STUDENT_PARENT_UNLINKED", "STUDENT_PARENT", link.id, student.schoolId, { classId: student.classId, parentId: link.parentId, studentId: link.studentId, relationship: link.relationship }, null, deps);
}
