import { AccountStatus, AssignmentPriority, AssignmentStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { dispatchAuditEvent, type AuditEvent, type AuditEventDispatcher } from "./audit.service.js";
import { openOrResumeAttempt } from "./attempt.service.js";
import { studentDeliveryActivity } from "./digitalActivity.service.js";
import type { CreateAssignmentRequest, ListAssignmentsQuery, ParentAssignmentsQuery, StudentAssignmentsQuery, UpdateAssignmentRequest } from "../validators/assignment.validator.js";

export interface AssignmentServiceContext { actor: AuthenticatedSession; requestIp?: string | null; userAgent?: string | null; }
interface Deps { auditDispatcher?: AuditEventDispatcher; now?: () => Date; }
const assignmentInclude = { digitalActivity: { select: { id: true, title: true, instructions: true, status: true, activityTemplate: { select: { rendererKey: true } } } }, school: { select: { id: true, schoolName: true } }, assignedByTeacher: { select: { id: true, fullName: true, schoolId: true, user: { select: { accountStatus: true } } } }, classTargets: { select: { classId: true, schoolClass: { select: { id: true, className: true, schoolId: true, accountStatus: true, teacherId: true } } } }, studentTargets: { select: { studentId: true, student: { select: { id: true, fullName: true, schoolId: true, user: { select: { accountStatus: true } }, class: { select: { id: true, className: true, teacherId: true } } } } } } } satisfies Prisma.AssignmentInclude;
type AssignmentRecord = Prisma.AssignmentGetPayload<{ include: typeof assignmentInclude }>;
export type Context = AssignmentServiceContext;
function err(code: string, status: number, message: string, details?: unknown): AppError { return new AppError(code, status, message, details); }
const notFound = () => err("ASSIGNMENT_NOT_FOUND", 404, "Tugasan tidak ditemui.");
const denied = () => err("ASSIGNMENT_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses tugasan ini.");
const schoolContextRequired = () => err("AUTH_SCHOOL_CONTEXT_REQUIRED", 403, "Guru ini belum dipautkan kepada sekolah.");
const invalidTarget = (message: string) => err("ASSIGNMENT_TARGET_INVALID", 400, message);
const invalidSchedule = (message: string) => err("ASSIGNMENT_SCHEDULE_INVALID", 400, message);
const duplicateTarget = () => err("ASSIGNMENT_TARGET_DUPLICATE", 409, "Sasaran tugasan telah dipilih berulang kali.");
function safeDate(value: Date | null | undefined): string | null { return value ? value.toISOString() : null; }
function availability(record: { status: AssignmentStatus; startAt: Date | null; dueAt: Date | null; availableUntil: Date | null }, now = new Date()) {
  if (record.status === AssignmentStatus.CANCELLED) return { status: "CANCELLED", isAvailableNow: false, isUpcoming: false, isOverdue: false, isClosed: false };
  if (record.status === AssignmentStatus.ARCHIVED) return { status: "ARCHIVED", isAvailableNow: false, isUpcoming: false, isOverdue: false, isClosed: false };
  if (record.status === AssignmentStatus.CLOSED) return { status: "CLOSED", isAvailableNow: false, isUpcoming: false, isOverdue: false, isClosed: true };
  if (record.availableUntil && record.availableUntil <= now) return { status: "EXPIRED", isAvailableNow: false, isUpcoming: false, isOverdue: false, isClosed: true };
  if (record.startAt && record.startAt > now) return { status: "UPCOMING", isAvailableNow: false, isUpcoming: true, isOverdue: false, isClosed: false };
  if (record.dueAt && record.dueAt < now) return { status: "OVERDUE", isAvailableNow: true, isUpcoming: false, isOverdue: true, isClosed: false };
  return { status: "AVAILABLE", isAvailableNow: true, isUpcoming: false, isOverdue: false, isClosed: false };
}
function requireManage(actor: AuthenticatedSession) { if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN && actor.role !== UserRole.TEACHER) throw denied(); }
function requireStudent(actor: AuthenticatedSession) { if (actor.role !== UserRole.STUDENT) throw denied(); }
function requireParent(actor: AuthenticatedSession) { if (actor.role !== UserRole.PARENT) throw denied(); }
function uniqueIds(ids: string[]): string[] { return [...new Set(ids)]; }
function ensureSchedule(input: Pick<CreateAssignmentRequest | UpdateAssignmentRequest, "startAt" | "dueAt" | "availableUntil">): void {
  if (input.startAt && input.dueAt && input.dueAt < input.startAt) throw invalidSchedule("Tarikh tamat mesti selepas tarikh mula.");
  if (input.dueAt && input.availableUntil && input.availableUntil < input.dueAt) throw invalidSchedule("Tarikh tutup mesti sama atau selepas tarikh tamat.");
  if (input.startAt && input.availableUntil && input.availableUntil < input.startAt) throw invalidSchedule("Tarikh tutup mesti selepas tarikh mula.");
}
function pagination(page: number, limit: number, total: number) { const totalPages = Math.ceil(total / limit); return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 }; }
function dto(record: AssignmentRecord, now = new Date()) {
  return { id: record.id, title: record.title, instructions: record.instructions, status: record.status, priority: record.priority, isRequired: record.isRequired, attemptsAllowed: record.attemptsAllowed, showResultsAfterCompletion: record.showResultsAfterCompletion, startAt: safeDate(record.startAt), dueAt: safeDate(record.dueAt), availableUntil: safeDate(record.availableUntil), activity: { id: record.digitalActivity.id, title: record.digitalActivity.title, rendererKey: record.digitalActivity.activityTemplate.rendererKey, status: record.digitalActivity.status }, school: record.school, assignedBy: { teacherId: record.assignedByTeacher.id, name: record.assignedByTeacher.fullName }, targets: { classCount: record.classTargets.length, studentCount: record.studentTargets.length, effectiveStudentCount: new Set([...record.classTargets.map((target) => target.classId), ...record.studentTargets.map((target) => target.studentId)]).size, classes: record.classTargets.map((target) => ({ id: target.schoolClass.id, className: target.schoolClass.className })), students: record.studentTargets.map((target) => ({ id: target.student.id, fullName: target.student.fullName, className: target.student.class.className })) }, availability: availability(record, now), createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}
async function fetchAssignment(id: string) { const record = await prisma.assignment.findUnique({ where: { id }, include: assignmentInclude }); if (!record) throw notFound(); return record; }
function studentRecipientIds(record: AssignmentRecord): string[] { return [...new Set([...record.studentTargets.map((t) => t.studentId)])]; }
function safeActivityItems(record: AssignmentRecord) { return record.digitalActivity.activityTemplate.rendererKey; }
export async function createAssignment(input: CreateAssignmentRequest, context: AssignmentServiceContext, deps: Deps = {}) {
  requireManage(context.actor);
  const now = deps.now?.() ?? new Date();
  ensureSchedule(input);
  const classIds = uniqueIds(input.classIds);
  const studentIds = uniqueIds(input.studentIds);
  if (classIds.length !== input.classIds.length || studentIds.length !== input.studentIds.length) throw duplicateTarget();
  const [activity, school, teacher] = await Promise.all([
    prisma.digitalActivity.findUnique({
      where: { id: input.digitalActivityId },
      select: {
        id: true,
        status: true,
        title: true,
        attemptsAllowed: true,
        activityTemplate: { select: { rendererKey: true } },
      },
    }),
    prisma.school.findUnique({ where: { id: input.schoolId ?? context.actor.schoolId ?? "" }, select: { id: true, accountStatus: true } }),
    prisma.teacher.findUnique({ where: { id: context.actor.profileId }, select: { id: true, schoolId: true, user: { select: { accountStatus: true } } } }),
  ]);
  if (!activity || activity.status !== "PUBLISHED") throw err("ASSIGNMENT_ACTIVITY_NOT_PUBLISHED", 400, "Aktiviti mesti diterbitkan.");
  if (!school || school.accountStatus !== AccountStatus.ACTIVE) throw err("SCHOOL_NOT_FOUND", 404, "Sekolah tidak ditemui.");
  if (!teacher || teacher.user.accountStatus !== AccountStatus.ACTIVE) throw err("ASSIGNMENT_TARGET_INVALID", 400, "Guru tidak sah.");
  if (context.actor.role === UserRole.TEACHER) {
    if (!teacher.schoolId || !context.actor.schoolId) throw schoolContextRequired();
    if (teacher.schoolId !== context.actor.schoolId) throw denied();
    if (school.id !== teacher.schoolId) throw denied();
  }
  const [classes, students] = await Promise.all([
    classIds.length
      ? prisma.schoolClass.findMany({
        where: { id: { in: classIds } },
        select: { id: true, schoolId: true, teacherId: true, accountStatus: true },
      })
      : Promise.resolve([]),
    studentIds.length
      ? prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          schoolId: true,
          user: { select: { accountStatus: true } },
          class: { select: { id: true, teacherId: true, schoolId: true, accountStatus: true } },
        },
      })
      : Promise.resolve([]),
  ]);
  if (classes.length !== classIds.length) throw invalidTarget("Sebahagian kelas yang dipilih tidak ditemui.");
  if (students.length !== studentIds.length) throw invalidTarget("Sebahagian murid yang dipilih tidak ditemui.");
  for (const schoolClass of classes) {
    if (schoolClass.schoolId !== school.id) throw invalidTarget("Kelas mesti berada dalam sekolah yang sama.");
    if (schoolClass.accountStatus !== AccountStatus.ACTIVE) throw invalidTarget("Hanya kelas aktif boleh ditugaskan.");
    if (context.actor.role === UserRole.TEACHER && schoolClass.teacherId !== teacher.id) throw denied();
  }
  for (const student of students) {
    if (student.schoolId !== school.id || student.class.schoolId !== school.id) throw invalidTarget("Murid mesti berada dalam sekolah yang sama.");
    if (student.user.accountStatus !== AccountStatus.ACTIVE) throw invalidTarget("Hanya murid aktif boleh ditugaskan.");
    if (student.class.accountStatus !== AccountStatus.ACTIVE) throw invalidTarget("Murid dalam kelas tidak aktif tidak boleh ditugaskan.");
    if (context.actor.role === UserRole.TEACHER && student.class.teacherId !== teacher.id) throw denied();
  }
  const status = input.startAt && input.startAt > now ? AssignmentStatus.SCHEDULED : AssignmentStatus.ACTIVE;
  const resolvedAvailableUntil = input.availableUntil ?? input.dueAt ?? null;
  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.assignment.create({
      data: {
        title: input.title.trim(),
        instructions: input.instructions ?? null,
        digitalActivityId: input.digitalActivityId,
        schoolId: school.id,
        assignedByTeacherId: teacher.id,
        priority: input.priority,
        startAt: input.startAt ?? null,
        dueAt: input.dueAt ?? null,
        availableUntil: resolvedAvailableUntil,
        isRequired: input.isRequired,
        attemptsAllowed: input.attemptsAllowed ?? activity.attemptsAllowed ?? null,
        showResultsAfterCompletion: input.showResultsAfterCompletion,
        status,
        publishedAt: now,
      },
      include: assignmentInclude,
    });
    if (classIds.length) await tx.assignmentClassTarget.createMany({ data: classIds.map((classId) => ({ assignmentId: created.id, classId })) });
    if (studentIds.length) await tx.assignmentStudentTarget.createMany({ data: studentIds.map((studentId) => ({ assignmentId: created.id, studentId })) });
    return tx.assignment.findUniqueOrThrow({ where: { id: created.id }, include: assignmentInclude });
  });
  await dispatchAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action: "ASSIGNMENT_CREATED" as AuditEvent["action"], resourceType: "SYSTEM", resourceId: record.id, schoolId: record.schoolId, before: null, after: { title: record.title }, timestamp: now, requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, deps.auditDispatcher);
  return dto(record, now);
}
export async function listAssignments(query: ListAssignmentsQuery, context: AssignmentServiceContext) { requireManage(context.actor); const where: Prisma.AssignmentWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.schoolId ? { schoolId: query.schoolId } : {}), ...(query.teacherId ? { assignedByTeacherId: query.teacherId } : {}), ...(query.digitalActivityId ? { digitalActivityId: query.digitalActivityId } : {}), ...(query.priority ? { priority: query.priority } : {}), ...(query.classId ? { classTargets: { some: { classId: query.classId } } } : {}), ...(query.studentId ? { studentTargets: { some: { studentId: query.studentId } } } : {}), ...(query.search ? { OR: [{ title: { contains: query.search, mode: "insensitive" } }, { instructions: { contains: query.search, mode: "insensitive" } }, { digitalActivity: { title: { contains: query.search, mode: "insensitive" } } }, { assignedByTeacher: { fullName: { contains: query.search, mode: "insensitive" } } }] } : {}) };
  if (context.actor.role === UserRole.TEACHER) {
    where.schoolId = context.actor.schoolId ?? undefined;
    where.assignedByTeacherId = context.actor.profileId;
  }
  const [records, total] = await Promise.all([prisma.assignment.findMany({ where, orderBy: { [query.sortBy]: query.sortOrder }, skip: (query.page - 1) * query.limit, take: query.limit, include: assignmentInclude }), prisma.assignment.count({ where })]);
  return { assignments: records.map((record) => dto(record)), pagination: pagination(query.page, query.limit, total) };
}
function ensureTeacherOwnsAssignment(record: AssignmentRecord, context: AssignmentServiceContext): void {
  if (context.actor.role === UserRole.TEACHER && (record.assignedByTeacher.id !== context.actor.profileId || record.school.id !== context.actor.schoolId)) throw notFound();
}
export async function getAssignment(id: string, context: AssignmentServiceContext) { requireManage(context.actor); const record = await fetchAssignment(id); ensureTeacherOwnsAssignment(record, context); return dto(record); }
export async function updateAssignment(id: string, input: UpdateAssignmentRequest, context: AssignmentServiceContext) { requireManage(context.actor); ensureSchedule(input); const record = await fetchAssignment(id); ensureTeacherOwnsAssignment(record, context); if (record.status !== AssignmentStatus.DRAFT && record.status !== AssignmentStatus.SCHEDULED && record.status !== AssignmentStatus.ACTIVE) throw err("ASSIGNMENT_NOT_EDITABLE", 409, "Tugasan tidak boleh diubah."); const updated = await prisma.assignment.update({ where: { id }, data: { ...(input.title !== undefined ? { title: input.title.trim() } : {}), ...(input.instructions !== undefined ? { instructions: input.instructions } : {}), ...(input.digitalActivityId !== undefined ? { digitalActivityId: input.digitalActivityId } : {}), ...(input.priority !== undefined ? { priority: input.priority } : {}), ...(input.startAt !== undefined ? { startAt: input.startAt } : {}), ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}), ...(input.availableUntil !== undefined ? { availableUntil: input.availableUntil } : {}), ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}), ...(input.attemptsAllowed !== undefined ? { attemptsAllowed: input.attemptsAllowed } : {}), ...(input.showResultsAfterCompletion !== undefined ? { showResultsAfterCompletion: input.showResultsAfterCompletion } : {}) }, include: assignmentInclude }); return dto(updated); }
async function studentAssignmentsForActor(actor: AuthenticatedSession) { const student = await prisma.student.findUnique({ where: { id: actor.profileId }, select: { id: true, classId: true, schoolId: true } }); if (!student) throw notFound(); return student; }
export async function listStudentAssignments(query: StudentAssignmentsQuery, context: AssignmentServiceContext) { requireStudent(context.actor); const student = await studentAssignmentsForActor(context.actor); const records = await prisma.assignment.findMany({ where: { schoolId: student.schoolId, status: { in: [AssignmentStatus.DRAFT, AssignmentStatus.SCHEDULED, AssignmentStatus.ACTIVE, AssignmentStatus.CLOSED, AssignmentStatus.CANCELLED, AssignmentStatus.ARCHIVED] }, OR: [{ studentTargets: { some: { studentId: student.id } } }, { classTargets: { some: { classId: student.classId } } }] }, include: assignmentInclude, orderBy: { createdAt: query.sortOrder } }); const filtered = records.filter((record) => { const a = availability(record); if (query.status === "UPCOMING") return a.status === "UPCOMING"; if (query.status === "AVAILABLE") return a.status === "AVAILABLE"; if (query.status === "OVERDUE") return a.status === "OVERDUE"; if (query.status === "CLOSED") return a.status === "CLOSED"; return true; }); return { assignments: filtered.map((record) => ({ id: record.id, title: record.title, instructions: record.instructions, priority: record.priority, isRequired: record.isRequired, startAt: safeDate(record.startAt), dueAt: safeDate(record.dueAt), availableUntil: safeDate(record.availableUntil), availabilityStatus: availability(record).status, activity: { id: record.digitalActivity.id, title: record.digitalActivity.title, rendererKey: record.digitalActivity.activityTemplate.rendererKey, estimatedMinutes: null }, teacher: { name: record.assignedByTeacher.fullName }, canOpen: availability(record).status === "AVAILABLE" || availability(record).status === "OVERDUE" })), pagination: pagination(query.page, query.limit, filtered.length) }; }
export async function getStudentAssignment(id: string, context: AssignmentServiceContext) { requireStudent(context.actor); const student = await studentAssignmentsForActor(context.actor); const record = await fetchAssignment(id); if (!studentRecipientIds(record).includes(student.id) && !record.classTargets.some((target) => target.classId === student.classId)) throw notFound(); const a = availability(record); return { assignment: { ...dto(record), canOpen: a.status === "AVAILABLE" || a.status === "OVERDUE" }, activity: { id: record.digitalActivity.id, title: record.digitalActivity.title, instructions: record.digitalActivity.instructions, rendererKey: record.digitalActivity.activityTemplate.rendererKey, timeLimitSeconds: null, items: [] } }; }
export async function getStudentAssignmentDelivery(id: string, context: AssignmentServiceContext) { requireStudent(context.actor); const student = await studentAssignmentsForActor(context.actor); const record = await fetchAssignment(id); if (!studentRecipientIds(record).includes(student.id) && !record.classTargets.some((target) => target.classId === student.classId)) throw notFound(); const a = availability(record); if (!(a.status === "AVAILABLE" || a.status === "OVERDUE")) throw err("ASSIGNMENT_NOT_AVAILABLE", 403, "Tugasan tidak tersedia."); const [attempt, activity] = await Promise.all([openOrResumeAttempt(id, context), studentDeliveryActivity(record.digitalActivity.id)]); return { attempt, assignment: { id: record.id, title: record.title, instructions: record.instructions, isRequired: record.isRequired, attemptsAllowed: record.attemptsAllowed, dueAt: safeDate(record.dueAt), availableUntil: safeDate(record.availableUntil), showResultsAfterCompletion: record.showResultsAfterCompletion }, activity, deliveryStatus: "AVAILABLE" }; }
export async function listParentChildrenAssignments(studentId: string, query: ParentAssignmentsQuery, context: AssignmentServiceContext) { requireParent(context.actor); const links = await prisma.parentStudent.findFirst({ where: { parent: { userId: context.actor.userId }, studentId }, select: { studentId: true } }); if (!links) throw notFound(); return listStudentAssignments(query as StudentAssignmentsQuery, { actor: { ...context.actor, role: UserRole.STUDENT, profileId: studentId } }); }
