import { AttemptStatus, ItemReviewStatus, Prisma, ReviewDecision, SubmissionStatus, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { recordAuditEvent } from "./audit.service.js";
import { createAssessmentForSubmission } from "./assessment.service.js";
import { itemReviewStatus } from "./submission-review-policy.js";
import { notifySubmissionEvent } from "./notification.service.js";
import type { CompleteReviewInput, ItemReviewInput, ListSubmissionsQuery } from "../validators/submission.validator.js";

export interface SubmissionContext { actor: AuthenticatedSession; requestIp?: string | null; userAgent?: string | null; }
type Tx = Prisma.TransactionClient;
type SubmissionRecord = Prisma.SubmissionGetPayload<{ include: typeof detailInclude }>;

const detailInclude = {
  assignment: {
    include: {
      classTargets: { include: { schoolClass: { select: { teacherId: true } } } },
      digitalActivity: {
        include: {
          activityTemplate: { select: { rendererKey: true, requiresTeacherReview: true } },
          items: {
            include: { questionBankItem: { select: { title: true, content: true, instructions: true, answerType: true } } },
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  },
  student: { include: { class: { select: { id: true, className: true, teacherId: true } } } },
  attempt: { include: { answers: true, session: true } },
  itemReviews: { orderBy: { createdAt: "asc" }, include: { teacher: { select: { id: true, fullName: true } } } },
  reviews: { orderBy: { createdAt: "asc" }, include: { teacher: { select: { id: true, fullName: true } } } },
  parentSubmission: { select: { id: true, revisionNumber: true, status: true } },
  revisions: { select: { id: true, revisionNumber: true, status: true, submittedAt: true }, orderBy: { revisionNumber: "asc" } },
} satisfies Prisma.SubmissionInclude;

function error(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const notFound = () => error("SUBMISSION_NOT_FOUND", 404, "Penyerahan tidak ditemui.");
const denied = () => error("SUBMISSION_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses penyerahan ini.");
const transition = () => error("SUBMISSION_TRANSITION_INVALID", 409, "Peralihan status penyerahan tidak sah.");
const notReviewable = () => error("SUBMISSION_NOT_REVIEWABLE", 409, "Penyerahan tidak boleh disemak pada masa ini.");

function audit(context: SubmissionContext, action: "SUBMISSION_CREATED" | "SUBMISSION_REVIEW_STARTED" | "SUBMISSION_ITEM_REVIEWED" | "SUBMISSION_ITEM_REVISION_REQUIRED" | "SUBMISSION_REVIEW_COMPLETED" | "SUBMISSION_RETURNED_FOR_REVISION" | "SUBMISSION_REVISION_STARTED" | "SUBMISSION_CANCELLED" | "SUBMISSION_ARCHIVED", submission: { id: string; schoolId: string; attemptId: string; assignmentId: string; studentId: string; revisionNumber: number }, metadata: Record<string, string | number | boolean | null>, tx: Tx) {
  return recordAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action, resourceType: "SUBMISSION", resourceId: submission.id, schoolId: submission.schoolId, before: null, after: { submissionId: submission.id, attemptId: submission.attemptId, assignmentId: submission.assignmentId, studentId: submission.studentId, revisionNumber: submission.revisionNumber }, metadata, timestamp: new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, { transactionClient: tx, strict: true });
}

async function studentFor(actor: AuthenticatedSession) {
  const student = await prisma.student.findUnique({ where: { id: actor.profileId }, select: { id: true, schoolId: true, classId: true } });
  if (!student) throw denied();
  return student;
}

async function canTeacherAccess(submission: SubmissionRecord, actor: AuthenticatedSession): Promise<boolean> {
  if (actor.role === UserRole.SUPER_ADMIN) return true;
  if (actor.role === UserRole.ADMIN) return actor.schoolId === null || actor.schoolId === submission.schoolId;
  if (actor.role !== UserRole.TEACHER || actor.schoolId !== submission.schoolId) return false;
  return submission.assignment.assignedByTeacherId === actor.profileId || submission.student.class.teacherId === actor.profileId || submission.assignment.classTargets.some((target) => target.classId === submission.student.classId && target.schoolClass.teacherId === actor.profileId);
}

async function findDetail(id: string): Promise<SubmissionRecord> {
  const submission = await prisma.submission.findUnique({ where: { id }, include: detailInclude });
  if (!submission) throw notFound();
  return submission;
}

async function requireManage(submission: SubmissionRecord, context: SubmissionContext, review = false): Promise<void> {
  if (!(await canTeacherAccess(submission, context.actor))) throw denied();
  // Reviews are attributable to Teacher records; administrators retain oversight access.
  if (review && context.actor.role !== UserRole.TEACHER) throw denied();
}

function observedResponse(answer: Prisma.JsonValue | undefined): Prisma.InputJsonValue {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return { responseAssetAvailable: false };
  const source = answer as Record<string, unknown>;
  const safe: Record<string, string | number | boolean | null> = { responseAssetAvailable: false };
  for (const key of ["strokeCount", "duration", "durationSeconds", "coverage", "completion", "activeReadingSeconds"]) {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) safe[key] = value;
  }
  return safe;
}

export async function createSubmissionForAttempt(tx: Tx, attemptId: string, context: SubmissionContext) {
  const existing = await tx.submission.findUnique({ where: { attemptId } });
  if (existing) return existing;
  const attempt = await tx.studentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assignment: {
        include: {
          digitalActivity: {
            include: {
              activityTemplate: { select: { rendererKey: true, requiresTeacherReview: true } },
              items: { select: { id: true, configuration: true, sequence: true } },
            },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt || attempt.status !== AttemptStatus.SUBMITTED || !attempt.submittedAt) throw error("SUBMISSION_NOT_REVIEWABLE", 409, "Percubaan belum dihantar.");
  const parent = await tx.submission.findFirst({ where: { assignmentId: attempt.assignmentId, studentId: attempt.studentId, status: SubmissionStatus.REVISION_REQUIRED }, orderBy: { returnedAt: "desc" }, select: { id: true, revisionNumber: true } });
  const submission = await tx.submission.create({ data: { attemptId: attempt.id, assignmentId: attempt.assignmentId, studentId: attempt.studentId, schoolId: attempt.assignment.schoolId, parentSubmissionId: parent?.id ?? null, revisionNumber: parent ? parent.revisionNumber + 1 : 1, submittedAt: attempt.submittedAt } });
  const answers = new Map(attempt.answers.map((answer) => [answer.activityItemId, answer.answerJson]));
  const { rendererKey, requiresTeacherReview } = attempt.assignment.digitalActivity.activityTemplate;
  await tx.submissionItemReview.createMany({ data: attempt.assignment.digitalActivity.items.map((item) => ({ submissionId: submission.id, activityItemId: item.id, status: itemReviewStatus(rendererKey, item.configuration, requiresTeacherReview), observedResponse: observedResponse(answers.get(item.id)) })) });
  await audit(context, "SUBMISSION_CREATED", submission, { itemCount: attempt.assignment.digitalActivity.items.length, parentSubmissionId: parent?.id ?? null }, tx);
  await createAssessmentForSubmission(tx, submission.id, context);
  return submission;
}

function reviewCounts(record: SubmissionRecord) {
  const manual = record.itemReviews.filter((item) => item.status !== ItemReviewStatus.NOT_REQUIRED);
  return { manualItemCount: manual.length, reviewedItemCount: manual.filter((item) => item.status === ItemReviewStatus.REVIEWED).length, revisionRequiredItemCount: manual.filter((item) => item.status === ItemReviewStatus.REVISION_REQUIRED).length };
}

function summary(record: SubmissionRecord) {
  const review = record.reviews.find((entry) => entry.completedAt === null) ?? record.reviews.at(-1) ?? null;
  return { id: record.id, status: record.status, revisionNumber: record.revisionNumber, submittedAt: record.submittedAt, reviewStartedAt: record.reviewStartedAt, reviewedAt: record.reviewedAt, student: { id: record.student.id, studentId: record.student.studentId, name: record.student.fullName, class: { id: record.student.class.id, name: record.student.class.className } }, assignment: { id: record.assignment.id, title: record.assignment.title }, activity: { id: record.assignment.digitalActivity.id, title: record.assignment.digitalActivity.title, rendererKeys: [record.assignment.digitalActivity.activityTemplate.rendererKey] }, review: { ...reviewCounts(record), reviewer: review ? { id: review.teacher.id, name: review.teacher.fullName } : null } };
}

export async function listSubmissions(query: ListSubmissionsQuery, context: SubmissionContext) {
  if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN && context.actor.role !== UserRole.TEACHER) throw denied();
  const where: Prisma.SubmissionWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.schoolId ? { schoolId: query.schoolId } : {}), ...(query.assignmentId ? { assignmentId: query.assignmentId } : {}), ...(query.studentId ? { studentId: query.studentId } : {}), ...(query.teacherId ? { assignment: { assignedByTeacherId: query.teacherId } } : {}), ...(query.classId ? { student: { classId: query.classId } } : {}), ...(query.rendererKey ? { assignment: { digitalActivity: { activityTemplate: { rendererKey: query.rendererKey } } } } : {}), ...(query.submittedFrom || query.submittedTo ? { submittedAt: { ...(query.submittedFrom ? { gte: query.submittedFrom } : {}), ...(query.submittedTo ? { lte: query.submittedTo } : {}) } } : {}), ...(query.reviewedFrom || query.reviewedTo ? { reviewedAt: { ...(query.reviewedFrom ? { gte: query.reviewedFrom } : {}), ...(query.reviewedTo ? { lte: query.reviewedTo } : {}) } } : {}), ...(query.search ? { OR: [{ student: { fullName: { contains: query.search, mode: "insensitive" } } }, { student: { studentId: { contains: query.search, mode: "insensitive" } } }, { assignment: { title: { contains: query.search, mode: "insensitive" } } }, { assignment: { digitalActivity: { title: { contains: query.search, mode: "insensitive" } } } }] } : {}) };
  if (context.actor.role === UserRole.ADMIN && context.actor.schoolId) where.schoolId = context.actor.schoolId;
  if (context.actor.role === UserRole.TEACHER) { where.schoolId = context.actor.schoolId ?? undefined; where.OR = [{ assignment: { assignedByTeacherId: context.actor.profileId } }, { student: { class: { teacherId: context.actor.profileId } } }, { assignment: { classTargets: { some: { schoolClass: { teacherId: context.actor.profileId } } } } }]; }
  if (query.requiresManualReview !== undefined) where.itemReviews = { some: { status: query.requiresManualReview ? { in: [ItemReviewStatus.PENDING, ItemReviewStatus.REVIEWED, ItemReviewStatus.REVISION_REQUIRED] } : ItemReviewStatus.NOT_REQUIRED } };
  const [records, total] = await Promise.all([prisma.submission.findMany({ where, include: detailInclude, orderBy: { [query.sortBy]: query.sortOrder }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.submission.count({ where })]);
  return { submissions: records.map(summary), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit), hasNextPage: query.page * query.limit < total, hasPreviousPage: query.page > 1 } };
}

function detail(record: SubmissionRecord, includeInternal: boolean) {
  const answers = new Map(record.attempt.answers.map((answer) => [answer.activityItemId, answer]));
  const reviews = new Map(record.itemReviews.map((item) => [item.activityItemId, item]));
  return { ...summary(record), attempt: { id: record.attempt.id, attemptNumber: record.attempt.attemptNumber, startedAt: record.attempt.startedAt, submittedAt: record.attempt.submittedAt }, items: record.assignment.digitalActivity.items.map((item) => { const itemReview = reviews.get(item.id); const answer = answers.get(item.id); return { activityItemId: item.id, sequence: item.sequence, rendererKey: record.assignment.digitalActivity.activityTemplate.rendererKey, title: item.questionBankItem.title, prompt: item.questionBankItem.content, instructions: item.questionBankItem.instructions, answer: answer ? { answerJson: answer.answerJson, isCompleted: answer.isCompleted, timeSpentSeconds: answer.timeSpentSeconds } : null, responseAssetAvailable: false, review: itemReview ? { status: itemReview.status, feedback: itemReview.feedback, ...(includeInternal ? { internalNotes: itemReview.internalNotes } : {}) } : null }; }), reviewHistory: record.reviews.map((entry) => ({ id: entry.id, decision: entry.decision, reviewer: { id: entry.teacher.id, name: entry.teacher.fullName }, startedAt: entry.startedAt, completedAt: entry.completedAt, overallFeedback: entry.overallFeedback, ...(includeInternal ? { internalNotes: entry.internalNotes } : {}) })), revisionLineage: { parent: record.parentSubmission, revisions: record.revisions } };
}

export async function getSubmission(id: string, context: SubmissionContext) { const record = await findDetail(id); await requireManage(record, context); const current = record.reviews.find((entry) => entry.completedAt === null); return detail(record, context.actor.role === UserRole.SUPER_ADMIN || current?.teacherId === context.actor.profileId); }

export async function startReview(id: string, context: SubmissionContext) {
  const record = await findDetail(id); await requireManage(record, context, true);
  if (record.status === SubmissionStatus.IN_REVIEW) { const active = record.reviews.find((review) => review.completedAt === null); if (active?.teacherId === context.actor.profileId) return { submission: summary(record), reviewId: active.id, reused: true }; throw error("SUBMISSION_ALREADY_IN_REVIEW", 409, "Penyerahan sedang disemak oleh guru lain."); }
  if (record.status !== SubmissionStatus.PENDING_REVIEW) throw notReviewable();
  return prisma.$transaction(async (tx) => { const now = new Date(); const updated = await tx.submission.update({ where: { id }, data: { status: SubmissionStatus.IN_REVIEW, reviewStartedAt: now } }); const review = await tx.teacherReview.create({ data: { submissionId: id, teacherId: context.actor.profileId, decision: ReviewDecision.APPROVED, startedAt: now } }); await audit(context, "SUBMISSION_REVIEW_STARTED", updated, { teacherId: context.actor.profileId }, tx); return { submission: { id: updated.id, status: updated.status, reviewStartedAt: updated.reviewStartedAt }, reviewId: review.id, reused: false }; });
}

async function claimedReview(record: SubmissionRecord, context: SubmissionContext) { const active = record.reviews.find((review) => review.completedAt === null); if (!active || active.teacherId !== context.actor.profileId) throw notReviewable(); return active; }

export async function updateItemReview(id: string, activityItemId: string, input: ItemReviewInput, context: SubmissionContext) {
  const record = await findDetail(id); await requireManage(record, context, true); if (record.status !== SubmissionStatus.IN_REVIEW) throw notReviewable(); await claimedReview(record, context);
  const item = record.itemReviews.find((review) => review.activityItemId === activityItemId); if (!item) throw error("SUBMISSION_ITEM_NOT_FOUND", 404, "Item penyerahan tidak ditemui."); if (item.status === ItemReviewStatus.NOT_REQUIRED) throw error("SUBMISSION_ITEM_NOT_REVIEWABLE", 409, "Item ini tidak memerlukan semakan guru.");
  return prisma.$transaction(async (tx) => { const updated = await tx.submissionItemReview.update({ where: { submissionId_activityItemId: { submissionId: id, activityItemId } }, data: { status: input.status, feedback: input.feedback ?? null, internalNotes: input.internalNotes ?? null, teacherId: context.actor.profileId, reviewedAt: new Date() } }); await audit(context, input.status === ItemReviewStatus.REVISION_REQUIRED ? "SUBMISSION_ITEM_REVISION_REQUIRED" : "SUBMISSION_ITEM_REVIEWED", record, { activityItemId, status: input.status }, tx); return { activityItemId: updated.activityItemId, status: updated.status, feedback: updated.feedback, internalNotes: updated.internalNotes, reviewedAt: updated.reviewedAt }; });
}

export async function completeReview(id: string, input: CompleteReviewInput, context: SubmissionContext) {
  const record = await findDetail(id); await requireManage(record, context, true); if (record.status !== SubmissionStatus.IN_REVIEW) throw notReviewable(); const active = await claimedReview(record, context); const counts = reviewCounts(record);
  if (input.decision === ReviewDecision.APPROVED && (counts.reviewedItemCount !== counts.manualItemCount || counts.revisionRequiredItemCount > 0)) throw error("SUBMISSION_REVIEW_INCOMPLETE", 409, "Semua item manual mesti disemak sebelum diluluskan.");
  if (input.decision === ReviewDecision.REVISION_REQUIRED && counts.revisionRequiredItemCount === 0) throw error("SUBMISSION_REVIEW_INCOMPLETE", 409, "Sekurang-kurangnya satu item mesti memerlukan pembetulan.");
  const result = await prisma.$transaction(async (tx) => { const now = new Date(); const status = input.decision === ReviewDecision.APPROVED ? SubmissionStatus.REVIEWED : SubmissionStatus.REVISION_REQUIRED; const updated = await tx.submission.update({ where: { id }, data: { status, ...(status === SubmissionStatus.REVIEWED ? { reviewedAt: now } : { returnedAt: now }) } }); await tx.teacherReview.update({ where: { id: active.id }, data: { decision: input.decision, overallFeedback: input.overallFeedback ?? null, internalNotes: input.internalNotes ?? null, completedAt: now } }); await audit(context, status === SubmissionStatus.REVIEWED ? "SUBMISSION_REVIEW_COMPLETED" : "SUBMISSION_RETURNED_FOR_REVISION", updated, { decision: input.decision, manualItemCount: counts.manualItemCount }, tx); return { id: updated.id, status: updated.status, reviewedAt: updated.reviewedAt, returnedAt: updated.returnedAt }; });
  void notifySubmissionEvent(result.id, true, result.status === SubmissionStatus.REVISION_REQUIRED, context).catch(() => undefined);
  return result;
}

export async function reviseSubmission(id: string, context: SubmissionContext) {
  if (context.actor.role !== UserRole.STUDENT) throw denied(); const student = await studentFor(context.actor); const record = await findDetail(id); if (record.studentId !== student.id) throw notFound(); if (record.status !== SubmissionStatus.REVISION_REQUIRED) throw error("SUBMISSION_REVISION_REQUIRED", 409, "Penyerahan ini tidak memerlukan pembetulan.");
  const assignment = record.assignment; const now = new Date(); if (assignment.status === "CANCELLED" || assignment.status === "ARCHIVED" || assignment.status === "CLOSED" || (assignment.availableUntil && assignment.availableUntil <= now) || (assignment.startAt && assignment.startAt > now)) throw error("SUBMISSION_REVISION_NOT_ALLOWED", 403, "Pembetulan tidak dibenarkan untuk tugasan ini.");
  return prisma.$transaction(async (tx) => { const active = await tx.studentAttempt.findFirst({ where: { assignmentId: record.assignmentId, studentId: student.id, status: AttemptStatus.IN_PROGRESS }, orderBy: { createdAt: "desc" } }); if (active) return { attempt: active, resumed: true }; const latest = await tx.studentAttempt.aggregate({ where: { assignmentId: record.assignmentId, studentId: student.id }, _max: { attemptNumber: true } }); const attempt = await tx.studentAttempt.create({ data: { assignmentId: record.assignmentId, studentId: student.id, attemptNumber: (latest._max.attemptNumber ?? 0) + 1, status: AttemptStatus.IN_PROGRESS, startedAt: now, expiresAt: assignment.availableUntil } }); await tx.assignmentSession.create({ data: { attemptId: attempt.id, sessionToken: randomUUID(), startedAt: now, lastHeartbeat: now } }); await audit(context, "SUBMISSION_REVISION_STARTED", record, { newAttemptId: attempt.id }, tx); return { attempt, resumed: false }; });
}

export async function listStudentSubmissions(context: SubmissionContext) { if (context.actor.role !== UserRole.STUDENT) throw denied(); const student = await studentFor(context.actor); const records = await prisma.submission.findMany({ where: { studentId: student.id }, include: detailInclude, orderBy: { submittedAt: "desc" } }); return { submissions: records.map((record) => ({ ...summary(record), revision: { required: record.status === SubmissionStatus.REVISION_REQUIRED, canStart: record.status === SubmissionStatus.REVISION_REQUIRED, nextSubmissionId: record.revisions.at(-1)?.id ?? null } })) }; }

export async function getStudentSubmission(id: string, context: SubmissionContext) { if (context.actor.role !== UserRole.STUDENT) throw denied(); const student = await studentFor(context.actor); const record = await findDetail(id); if (record.studentId !== student.id) throw notFound(); return detail(record, false); }

export async function getStudentFeedback(id: string, context: SubmissionContext) { if (context.actor.role !== UserRole.STUDENT) throw denied(); const student = await studentFor(context.actor); const record = await findDetail(id); if (record.studentId !== student.id) throw notFound(); const completed = record.reviews.filter((review) => review.completedAt !== null).at(-1); return { submission: { id: record.id, status: record.status, submittedAt: record.submittedAt, reviewedAt: record.reviewedAt, revisionNumber: record.revisionNumber }, overallFeedback: completed?.overallFeedback ?? null, items: record.itemReviews.filter((item) => item.status !== ItemReviewStatus.NOT_REQUIRED).map((item) => ({ activityItemId: item.activityItemId, status: item.status, feedback: item.feedback })), revision: { required: record.status === SubmissionStatus.REVISION_REQUIRED, canStart: record.status === SubmissionStatus.REVISION_REQUIRED, nextSubmissionId: record.revisions.at(-1)?.id ?? null } }; }

export async function listParentSubmissions(studentId: string, query: Pick<ListSubmissionsQuery, "page" | "limit">, context: SubmissionContext) { if (context.actor.role !== UserRole.PARENT) throw denied(); const linked = await prisma.parentStudent.findFirst({ where: { parent: { userId: context.actor.userId }, studentId }, select: { id: true } }); if (!linked) throw notFound(); const [records, total] = await Promise.all([prisma.submission.findMany({ where: { studentId, status: { in: [SubmissionStatus.REVIEWED, SubmissionStatus.REVISION_REQUIRED] } }, include: detailInclude, orderBy: { submittedAt: "desc" }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.submission.count({ where: { studentId, status: { in: [SubmissionStatus.REVIEWED, SubmissionStatus.REVISION_REQUIRED] } } })]); return { submissions: records.map((record) => ({ id: record.id, status: record.status, submittedAt: record.submittedAt, reviewedAt: record.reviewedAt, assignment: { id: record.assignmentId, title: record.assignment.title }, activity: { id: record.assignment.digitalActivity.id, title: record.assignment.digitalActivity.title }, overallFeedback: record.reviews.filter((review) => review.completedAt !== null).at(-1)?.overallFeedback ?? null, correctionRequired: record.status === SubmissionStatus.REVISION_REQUIRED })), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } }; }

export async function cancelSubmission(id: string, context: SubmissionContext) { const record = await findDetail(id); await requireManage(record, context); if (record.status !== SubmissionStatus.PENDING_REVIEW && record.status !== SubmissionStatus.IN_REVIEW) throw transition(); return prisma.$transaction(async (tx) => { const updated = await tx.submission.update({ where: { id }, data: { status: SubmissionStatus.CANCELLED, cancelledAt: new Date() } }); await audit(context, "SUBMISSION_CANCELLED", updated, {}, tx); return { id: updated.id, status: updated.status }; }); }
export async function archiveSubmission(id: string, context: SubmissionContext) { const record = await findDetail(id); await requireManage(record, context); if (record.status !== SubmissionStatus.REVIEWED && record.status !== SubmissionStatus.CANCELLED) throw transition(); return prisma.$transaction(async (tx) => { const updated = await tx.submission.update({ where: { id }, data: { status: SubmissionStatus.ARCHIVED, archivedAt: new Date() } }); await audit(context, "SUBMISSION_ARCHIVED", updated, {}, tx); return { id: updated.id, status: updated.status }; }); }
