import { AccountStatus, Prisma, UserRole } from "@prisma/client";

import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { dispatchAuditEvent, type AuditEvent, type AuditEventDispatcher } from "./audit.service.js";
import { transferStudentClass } from "./student.service.js";
import type { CreateSchoolClassRequest, ListClassStudentsQuery, ListSchoolClassesQuery, UpdateSchoolClassRequest } from "../validators/schoolClass.validator.js";

const classSelect = {
  id: true, schoolId: true, teacherId: true, className: true, yearLevel: true, academicYear: true,
  capacity: true, accountStatus: true, createdAt: true, updatedAt: true,
  school: { select: { id: true, schoolCode: true, schoolName: true } },
  teacher: { select: { id: true, teacherId: true, fullName: true, user: { select: { accountStatus: true } } } },
  _count: { select: { students: true } },
} satisfies Prisma.SchoolClassSelect;

type ClassRecord = Prisma.SchoolClassGetPayload<{ select: typeof classSelect }>;

export interface SchoolClassAuditContext {
  actor: AuthenticatedSession & { name?: string | null };
  requestIp?: string | null;
  userAgent?: string | null;
}
export interface SchoolClassServiceDependencies { auditDispatcher?: AuditEventDispatcher; now?: () => Date; }
export interface ClassResponse {
  id: string; schoolId: string; teacherId: string; className: string; yearLevel: number; academicYear: number;
  capacity: number | null; accountStatus: AccountStatus; createdAt: Date; updatedAt: Date;
  school: { id: string; schoolCode: string; schoolName: string };
  teacher: { id: string; teacherId: string; fullName: string };
  studentCount: number;
}

export function assertTeacherClassSchoolAssignment(classSchoolId: string, teacherSchoolId: string): void {
  if (classSchoolId !== teacherSchoolId) throw new AppError("TEACHER_SCHOOL_ASSIGNMENT_INVALID", 400, "Guru hanya boleh ditugaskan kepada kelas dalam sekolah yang sama.");
}

function error(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const classNotFound = () => error("CLASS_NOT_FOUND", 404, "Kelas tidak ditemui.");
const schoolNotFound = () => error("SCHOOL_NOT_FOUND", 404, "Sekolah tidak ditemui.");
const teacherNotFound = () => error("TEACHER_NOT_FOUND", 404, "Guru tidak ditemui.");
const classExists = () => error("CLASS_ALREADY_EXISTS", 409, "Kelas dengan nama dan tahun akademik ini telah wujud di sekolah tersebut.");
const forbidden = () => error("AUTH_ROLE_FORBIDDEN", 403, "Anda tidak mempunyai kebenaran untuk mengakses fungsi ini.");
const teacherAccessDenied = () => error("AUTH_OWNER_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses kelas ini.");
const statusInvalid = () => error("CLASS_STATUS_TRANSITION_INVALID", 403, "Perubahan status kelas tidak dibenarkan.");
const teacherAssignmentInvalid = () => error("CLASS_TEACHER_ASSIGNMENT_INVALID", 400, "Penugasan guru kepada kelas tidak dibenarkan.");
const removalUnsupported = () => error("CLASS_STUDENT_REMOVAL_NOT_SUPPORTED", 400, "Murid mesti dipindahkan ke kelas lain dan tidak boleh dikeluarkan tanpa kelas gantian.");

function mapUniqueError(caught: unknown): AppError | null {
  if (!(caught instanceof Prisma.PrismaClientKnownRequestError) || caught.code !== "P2002") return null;
  const target = Array.isArray(caught.meta?.target) ? caught.meta.target.join(" ") : String(caught.meta?.target ?? "");
  if (target.toLowerCase().includes("schoolid") && target.toLowerCase().includes("classname") && target.toLowerCase().includes("academicyear")) return classExists();
  return error("CLASS_CONFLICT", 409, "Maklumat kelas telah digunakan.");
}
function actor(context: SchoolClassAuditContext): AuthenticatedSession { return context.actor; }
function management(context: SchoolClassAuditContext): void {
  const roles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
  if (!roles.includes(actor(context).role)) throw forbidden();
}
function readable(context: SchoolClassAuditContext): void {
  const roles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER];
  if (!roles.includes(actor(context).role)) throw forbidden();
}
function response(record: ClassRecord): ClassResponse {
  return {
    id: record.id, schoolId: record.schoolId, teacherId: record.teacherId, className: record.className,
    yearLevel: record.yearLevel, academicYear: record.academicYear, capacity: record.capacity,
    accountStatus: record.accountStatus, createdAt: record.createdAt, updatedAt: record.updatedAt,
    school: record.school, teacher: { id: record.teacher.id, teacherId: record.teacher.teacherId, fullName: record.teacher.fullName },
    studentCount: record._count.students,
  };
}
function auditSafe(record: ClassResponse): Record<string, unknown> {
  return { id: record.id, schoolId: record.schoolId, teacherId: record.teacherId, className: record.className, yearLevel: record.yearLevel, academicYear: record.academicYear, capacity: record.capacity, accountStatus: record.accountStatus, studentCount: record.studentCount };
}
function audit(context: SchoolClassAuditContext, action: Extract<AuditEvent["action"], "CLASS_CREATED" | "CLASS_UPDATED" | "CLASS_STATUS_CHANGED" | "CLASS_TEACHER_CHANGED">, classId: string, schoolId: string, before: unknown, after: unknown, deps: SchoolClassServiceDependencies): Promise<void> {
  return dispatchAuditEvent({ actorUserId: actor(context).userId, actorProfileId: actor(context).profileId, actorRole: actor(context).role, actorName: context.actor.name ?? null, action, resourceType: "CLASS", resourceId: classId, schoolId, before, after, timestamp: deps.now?.() ?? new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, deps.auditDispatcher);
}

async function requireTeacherClassAccess(classId: string, context: SchoolClassAuditContext): Promise<void> {
  if (actor(context).role !== UserRole.TEACHER) return;
  const schoolClass = await prisma.schoolClass.findUnique({ where: { id: classId }, select: { schoolId: true, teacherId: true } });
  if (!schoolClass || !actor(context).schoolId || schoolClass.schoolId !== actor(context).schoolId || schoolClass.teacherId !== actor(context).profileId) throw teacherAccessDenied();
}

export function canSchoolClassTransitionStatus(current: AccountStatus, next: AccountStatus, role: UserRole): boolean {
  if (current === AccountStatus.ACTIVE) return next === AccountStatus.SUSPENDED || next === AccountStatus.ARCHIVED;
  if (current === AccountStatus.SUSPENDED) return next === AccountStatus.ACTIVE || next === AccountStatus.ARCHIVED;
  return current === AccountStatus.ARCHIVED && next === AccountStatus.ACTIVE && role === UserRole.SUPER_ADMIN;
}

export async function createSchoolClass(data: CreateSchoolClassRequest, context: SchoolClassAuditContext, deps: SchoolClassServiceDependencies = {}): Promise<ClassResponse> {
  management(context);
  const [school, teacher, duplicate] = await Promise.all([
    prisma.school.findUnique({ where: { id: data.schoolId }, select: { id: true } }),
    prisma.teacher.findUnique({ where: { id: data.teacherId }, select: { id: true, schoolId: true, user: { select: { accountStatus: true } } } }),
    prisma.schoolClass.findUnique({ where: { schoolId_className_academicYear: { schoolId: data.schoolId, className: data.className.trim(), academicYear: data.academicYear } }, select: { id: true } }),
  ]);
  if (!school) throw schoolNotFound();
  if (!teacher) throw teacherNotFound();
  if (teacher.schoolId !== data.schoolId || teacher.user.accountStatus === AccountStatus.ARCHIVED) throw teacherAssignmentInvalid();
  if (duplicate) throw classExists();
  let record: ClassRecord;
  try {
    record = await prisma.schoolClass.create({ data: { schoolId: data.schoolId, teacherId: data.teacherId, className: data.className.trim(), yearLevel: data.yearLevel, academicYear: data.academicYear, capacity: data.capacity ?? null, accountStatus: AccountStatus.ACTIVE }, select: classSelect });
  } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  const result = response(record);
  await audit(context, "CLASS_CREATED", record.id, record.schoolId, null, auditSafe(result), deps);
  return result;
}

function classWhere(query: ListSchoolClassesQuery, teacherId?: string, schoolId?: string): Prisma.SchoolClassWhereInput {
  const search = query.search?.trim();
  return {
    ...(query.status ? { accountStatus: query.status } : {}), ...(query.schoolId ? { schoolId: query.schoolId } : {}),
    ...(query.teacherId ? { teacherId: query.teacherId } : {}), ...(query.yearLevel ? { yearLevel: query.yearLevel } : {}),
    ...(query.academicYear ? { academicYear: query.academicYear } : {}),
    ...(teacherId ? { teacherId, ...(schoolId ? { schoolId } : {}) } : {}),
    ...(search ? { OR: [ { className: { contains: search, mode: "insensitive" } }, { school: { schoolName: { contains: search, mode: "insensitive" } } }, { school: { schoolCode: { contains: search, mode: "insensitive" } } }, { teacher: { fullName: { contains: search, mode: "insensitive" } } }, { teacher: { teacherId: { contains: search, mode: "insensitive" } } } ] } : {}),
  };
}
export async function getSchoolClasses(query: ListSchoolClassesQuery, context: SchoolClassAuditContext): Promise<{ classes: ClassResponse[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }> {
  readable(context);
  const teacher = actor(context).role === UserRole.TEACHER ? actor(context).profileId : undefined;
  const scopedSchoolId = actor(context).role === UserRole.TEACHER ? actor(context).schoolId ?? undefined : undefined;
  const where = classWhere(query, teacher, scopedSchoolId);
  const orderBy: Prisma.SchoolClassOrderByWithRelationInput = { [query.sortBy]: query.sortOrder };
  const [records, total] = await Promise.all([prisma.schoolClass.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit, select: classSelect }), prisma.schoolClass.count({ where })]);
  const totalPages = Math.ceil(total / query.limit);
  return { classes: records.map(response), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

export async function getSchoolClassById(classId: string, context: SchoolClassAuditContext): Promise<{ class: ClassResponse & { capacitySummary: { capacity: number | null; occupied: number; availableSeats: number | null } } }> {
  readable(context);
  await requireTeacherClassAccess(classId, context);
  const record = await prisma.schoolClass.findUnique({ where: { id: classId }, select: classSelect });
  if (!record) throw classNotFound();
  const activeStudentCount = await prisma.student.count({ where: { classId, user: { accountStatus: { in: [AccountStatus.ACTIVE, AccountStatus.SUSPENDED] } } } });
  const result = response(record);
  return { class: { ...result, capacitySummary: { capacity: record.capacity, occupied: activeStudentCount, availableSeats: record.capacity === null ? null : Math.max(0, record.capacity - activeStudentCount) } } };
}

export async function updateSchoolClass(classId: string, data: UpdateSchoolClassRequest, context: SchoolClassAuditContext, deps: SchoolClassServiceDependencies = {}): Promise<ClassResponse> {
  management(context);
  const beforeRecord = await prisma.schoolClass.findUnique({ where: { id: classId }, select: classSelect });
  if (!beforeRecord) throw classNotFound();
  const nextClassName = data.className?.trim() ?? beforeRecord.className;
  const nextAcademicYear = data.academicYear ?? beforeRecord.academicYear;
  if (nextClassName !== beforeRecord.className || nextAcademicYear !== beforeRecord.academicYear) {
    const duplicate = await prisma.schoolClass.findUnique({ where: { schoolId_className_academicYear: { schoolId: beforeRecord.schoolId, className: nextClassName, academicYear: nextAcademicYear } }, select: { id: true } });
    if (duplicate && duplicate.id !== classId) throw classExists();
  }
  let record: ClassRecord;
  try { record = await prisma.schoolClass.update({ where: { id: classId }, data: { ...(data.className !== undefined ? { className: data.className.trim() } : {}), ...(data.yearLevel !== undefined ? { yearLevel: data.yearLevel } : {}), ...(data.academicYear !== undefined ? { academicYear: data.academicYear } : {}), ...(data.capacity !== undefined ? { capacity: data.capacity } : {}) }, select: classSelect }); } catch (caught) { const mapped = mapUniqueError(caught); if (mapped) throw mapped; throw caught; }
  const result = response(record);
  await audit(context, "CLASS_UPDATED", classId, record.schoolId, auditSafe(response(beforeRecord)), auditSafe(result), deps);
  return result;
}

export async function updateSchoolClassStatus(classId: string, status: AccountStatus, context: SchoolClassAuditContext, deps: SchoolClassServiceDependencies = {}): Promise<ClassResponse> {
  management(context);
  const beforeRecord = await prisma.schoolClass.findUnique({ where: { id: classId }, select: classSelect });
  if (!beforeRecord) throw classNotFound();
  if (!canSchoolClassTransitionStatus(beforeRecord.accountStatus, status, actor(context).role)) throw statusInvalid();
  const record = await prisma.schoolClass.update({ where: { id: classId }, data: { accountStatus: status }, select: classSelect });
  const result = response(record);
  await audit(context, "CLASS_STATUS_CHANGED", classId, record.schoolId, { accountStatus: beforeRecord.accountStatus }, { accountStatus: record.accountStatus }, deps);
  return result;
}

export async function assignSchoolClassTeacher(classId: string, teacherId: string, context: SchoolClassAuditContext, deps: SchoolClassServiceDependencies = {}): Promise<ClassResponse> {
  management(context);
  const schoolClass = await prisma.schoolClass.findUnique({ where: { id: classId }, select: classSelect });
  if (!schoolClass) throw classNotFound();
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, schoolId: true, user: { select: { accountStatus: true } } } });
  const assignableStatuses: AccountStatus[] = [AccountStatus.ACTIVE, AccountStatus.PENDING];
  if (!teacher || teacher.schoolId !== schoolClass.schoolId || schoolClass.teacherId === teacherId || !assignableStatuses.includes(teacher.user.accountStatus)) throw teacherAssignmentInvalid();
  const record = await prisma.schoolClass.update({ where: { id: classId }, data: { teacherId }, select: classSelect });
  const result = response(record);
  await audit(context, "CLASS_TEACHER_CHANGED", classId, record.schoolId, { teacherId: schoolClass.teacherId }, { teacherId: record.teacherId }, deps);
  return result;
}

export async function getSchoolClassStudents(classId: string, query: ListClassStudentsQuery, context: SchoolClassAuditContext): Promise<{ students: Array<{ id: string; userId: string; studentId: string; fullName: string; gender: "MALE" | "FEMALE"; birthDate: Date | null; avatar: string | null; accountStatus: AccountStatus; createdAt: Date; updatedAt: Date }>; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }> {
  readable(context);
  await requireTeacherClassAccess(classId, context);
  const exists = await prisma.schoolClass.findUnique({ where: { id: classId }, select: { id: true } });
  if (!exists) throw classNotFound();
  const search = query.search?.trim();
  const where: Prisma.StudentWhereInput = { classId, ...(query.gender ? { gender: query.gender } : {}), ...(query.status ? { user: { accountStatus: query.status } } : {}), ...(search ? { OR: [{ studentId: { contains: search, mode: "insensitive" } }, { fullName: { contains: search, mode: "insensitive" } }] } : {}) };
  const orderBy: Prisma.StudentOrderByWithRelationInput = query.sortBy === "accountStatus" ? { user: { accountStatus: query.sortOrder } } : { [query.sortBy]: query.sortOrder };
  const [records, total] = await Promise.all([prisma.student.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit, select: { id: true, userId: true, studentId: true, fullName: true, gender: true, birthDate: true, avatar: true, createdAt: true, updatedAt: true, user: { select: { accountStatus: true } } } }), prisma.student.count({ where })]);
  const totalPages = Math.ceil(total / query.limit);
  return { students: records.map((student) => ({ id: student.id, userId: student.userId, studentId: student.studentId, fullName: student.fullName, gender: student.gender, birthDate: student.birthDate, avatar: student.avatar, accountStatus: student.user.accountStatus, createdAt: student.createdAt, updatedAt: student.updatedAt })), pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages, hasPreviousPage: query.page > 1 } };
}

export async function assignStudentToSchoolClass(classId: string, studentId: string, context: SchoolClassAuditContext, deps: SchoolClassServiceDependencies = {}): Promise<{ student: Awaited<ReturnType<typeof transferStudentClass>> }> {
  management(context);
  const student = await transferStudentClass(studentId, classId, context, { auditDispatcher: deps.auditDispatcher, now: deps.now }, { mode: "class", auditAction: "CLASS_STUDENT_ASSIGNED" });
  return { student };
}

export async function removeStudentFromSchoolClass(_classId: string, _studentId: string, context: SchoolClassAuditContext): Promise<never> {
  management(context);
  throw removalUnsupported();
}
