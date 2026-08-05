import { AssessmentItemStatus, AssessmentMethod, AssessmentStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { evaluateAutomaticItem } from "./assessment-auto.service.js";
import { calculateAssessmentTotals } from "./assessment-calculation.js";
import { assessmentMethod, defaultPossibleMarks, itemAssessmentMethod } from "./assessment-policy.js";
import { recordAuditEvent } from "./audit.service.js";
import { createEvidenceForAssessment } from "./pbd-evidence.service.js";
import { recalculateStudentMastery } from "./mastery.service.js";
import type { AdjustmentInput, InvalidateInput, ListAssessmentsQuery, ManualScoreInput } from "../validators/assessment.validator.js";

export interface AssessmentContext { actor: AuthenticatedSession; requestIp?: string | null; userAgent?: string | null; }
type Tx = Prisma.TransactionClient;
type AssessmentRecord = Prisma.AssessmentGetPayload<{ include: typeof detailInclude }>;

const detailInclude = {
  assignment: {
    include: {
      classTargets: { include: { schoolClass: { select: { teacherId: true } } } },
      digitalActivity: { select: { id: true, title: true, masteryThreshold: true, activityTemplate: { select: { rendererKey: true } } } },
    },
  },
  student: { include: { class: { select: { id: true, className: true, teacherId: true } } } },
  teacher: { select: { id: true, fullName: true } },
  submission: { select: { id: true, status: true, submittedAt: true, reviewedAt: true } },
  items: {
    orderBy: { createdAt: "asc" },
    include: { activityItem: { include: { questionBankItem: { select: { title: true, content: true, instructions: true } } } }, teacher: { select: { id: true, fullName: true } } },
  },
  adjustments: { orderBy: { createdAt: "asc" }, include: { teacher: { select: { id: true, fullName: true } } } },
} satisfies Prisma.AssessmentInclude;

function err(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const denied = () => err("ASSESSMENT_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses pentaksiran ini.");
const notFound = () => err("ASSESSMENT_NOT_FOUND", 404, "Pentaksiran tidak ditemui.");
const invalid = () => err("ASSESSMENT_STATE_INVALID", 409, "Status pentaksiran tidak sah.");

function dec(value: Prisma.Decimal | number | string): Prisma.Decimal { return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value); }
function num(value: Prisma.Decimal | null): number | null { return value === null ? null : value.toNumber(); }

function audit(context: AssessmentContext, action: "ASSESSMENT_CREATED" | "ASSESSMENT_AUTO_COMPLETED" | "ASSESSMENT_MANUAL_COMPLETED" | "ASSESSMENT_RECALCULATED" | "ASSESSMENT_ADJUSTED" | "ASSESSMENT_INVALIDATED" | "ASSESSMENT_ARCHIVED", assessment: { id: string; schoolId: string; submissionId: string; assignmentId: string; studentId: string }, metadata: Record<string, string | number | boolean | null>, tx: Tx) {
  return recordAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action, resourceType: "ASSESSMENT", resourceId: assessment.id, schoolId: assessment.schoolId, before: null, after: { assessmentId: assessment.id, submissionId: assessment.submissionId, assignmentId: assessment.assignmentId, studentId: assessment.studentId }, metadata, timestamp: new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, { transactionClient: tx, strict: true });
}

async function findDetail(id: string): Promise<AssessmentRecord> {
  const assessment = await prisma.assessment.findUnique({ where: { id }, include: detailInclude });
  if (!assessment) throw notFound();
  return assessment;
}

async function canManage(record: AssessmentRecord, actor: AuthenticatedSession): Promise<boolean> {
  if (actor.role === UserRole.SUPER_ADMIN) return true;
  if (actor.role === UserRole.ADMIN) return actor.schoolId === null || actor.schoolId === record.schoolId;
  if (actor.role !== UserRole.TEACHER || actor.schoolId !== record.schoolId) return false;
  return record.assignment.assignedByTeacherId === actor.profileId || record.student.class.teacherId === actor.profileId || record.assignment.classTargets.some((target) => target.schoolClass.teacherId === actor.profileId);
}

async function requireManage(record: AssessmentRecord, context: AssessmentContext, teacherAction = false): Promise<void> {
  if (!(await canManage(record, context.actor))) throw denied();
  if (teacherAction && context.actor.role !== UserRole.TEACHER) throw denied();
}

function totalsData(items: readonly { status: AssessmentItemStatus; marksAwarded: Prisma.Decimal; possibleMarks: Prisma.Decimal }[], adjustments: readonly { difference: Prisma.Decimal }[], passPercentage: Prisma.Decimal | null) {
  return calculateAssessmentTotals({ items, adjustments, passPercentage });
}

async function recalcAndPersist(tx: Tx, assessmentId: string) {
  const assessment = await tx.assessment.findUnique({ where: { id: assessmentId }, include: { items: true, adjustments: true } });
  if (!assessment) throw notFound();
  const totals = totalsData(assessment.items, assessment.adjustments, assessment.passPercentage);
  return tx.assessment.update({ where: { id: assessmentId }, data: { automaticMarks: totals.automaticMarks, manualMarks: totals.manualMarks, adjustedMarks: totals.adjustedMarks, finalMarks: totals.finalMarks, possibleMarks: totals.possibleMarks, percentage: totals.percentage, result: totals.result, status: assessment.status === AssessmentStatus.INVALIDATED || assessment.status === AssessmentStatus.ARCHIVED ? assessment.status : totals.status, assessedAt: totals.status === AssessmentStatus.COMPLETED || totals.status === AssessmentStatus.AUTO_ASSESSED ? new Date() : null } });
}

async function detailInTx(tx: Tx, id: string, includeInternal: boolean) {
  const record = await tx.assessment.findUnique({ where: { id }, include: detailInclude });
  if (!record) throw notFound();
  return detail(record, includeInternal);
}

function summary(record: AssessmentRecord) {
  return { id: record.id, status: record.status, method: record.method, result: record.result, marks: { automatic: num(record.automaticMarks), manual: num(record.manualMarks), adjusted: num(record.adjustedMarks), final: num(record.finalMarks), possible: num(record.possibleMarks), percentage: num(record.percentage), passPercentage: num(record.passPercentage) }, assessedAt: record.assessedAt, assignment: { id: record.assignmentId, title: record.assignment.title }, activity: { id: record.assignment.digitalActivity.id, title: record.assignment.digitalActivity.title, rendererKey: record.assignment.digitalActivity.activityTemplate.rendererKey }, student: { id: record.studentId, studentId: record.student.studentId, name: record.student.fullName, class: record.student.class.className }, teacher: record.teacher ? { id: record.teacher.id, name: record.teacher.fullName } : null };
}

function detail(record: AssessmentRecord, includeInternal: boolean) {
  return { ...summary(record), submission: record.submission, overallFeedback: record.overallFeedback, items: record.items.map((item) => ({ activityItemId: item.activityItemId, status: item.status, method: item.method, correct: item.correct, marksAwarded: num(item.marksAwarded), possibleMarks: num(item.possibleMarks), feedback: item.feedback, teacherFeedback: item.teacherFeedback, ...(includeInternal ? { internalNotes: item.internalNotes } : {}), assessedAt: item.assessedAt, activityItem: { sequence: item.activityItem.sequence, title: item.activityItem.questionBankItem.title, prompt: item.activityItem.questionBankItem.content, instructions: item.activityItem.questionBankItem.instructions } })), adjustments: includeInternal ? record.adjustments.map((adjustment) => ({ id: adjustment.id, reason: adjustment.reason, previousMarks: num(adjustment.previousMarks), newMarks: num(adjustment.newMarks), difference: num(adjustment.difference), notes: adjustment.notes, createdAt: adjustment.createdAt, teacher: adjustment.teacher ? { id: adjustment.teacher.id, name: adjustment.teacher.fullName } : null })) : undefined };
}

export async function createAssessmentForSubmission(tx: Tx, submissionId: string, context: AssessmentContext) {
  const existing = await tx.assessment.findUnique({ where: { submissionId } });
  if (existing) return existing;
  const submission = await tx.submission.findUnique({
    where: { id: submissionId },
    include: {
      attempt: { include: { answers: true } },
      assignment: {
        include: {
          digitalActivity: {
            include: {
              activityTemplate: { select: { rendererKey: true, requiresTeacherReview: true } },
              items: {
                include: {
                  questionBankItem: {
                    include: { answerOptions: { orderBy: { sequence: "asc" } } },
                  },
                },
                orderBy: { sequence: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!submission) throw notFound();
  const answers = new Map(submission.attempt.answers.map((answer) => [answer.activityItemId, answer]));
  const rendererKey = submission.assignment.digitalActivity.activityTemplate.rendererKey;
  const methods = submission.assignment.digitalActivity.items.map((item) => itemAssessmentMethod(rendererKey, item.configuration, item.questionBankItem.answerType, submission.assignment.digitalActivity.activityTemplate.requiresTeacherReview));
  const assessment = await tx.assessment.create({ data: { submissionId: submission.id, attemptId: submission.attemptId, assignmentId: submission.assignmentId, studentId: submission.studentId, schoolId: submission.schoolId, method: assessmentMethod(methods), passPercentage: submission.assignment.digitalActivity.masteryThreshold === null ? null : new Prisma.Decimal(submission.assignment.digitalActivity.masteryThreshold) } });
  for (const item of submission.assignment.digitalActivity.items) {
    const answer = answers.get(item.id);
    const method = itemAssessmentMethod(rendererKey, item.configuration, item.questionBankItem.answerType, submission.assignment.digitalActivity.activityTemplate.requiresTeacherReview);
    const possibleMarks = new Prisma.Decimal(defaultPossibleMarks(method, item.marks));
    const evaluation = evaluateAutomaticItem({ rendererKey, method, configuration: item.configuration, possibleMarks, question: { answerType: item.questionBankItem.answerType, correctAnswer: item.questionBankItem.correctAnswer, answerOptions: item.questionBankItem.answerOptions }, answerJson: answer?.answerJson ?? null, isCompleted: answer?.isCompleted ?? false });
    await tx.assessmentItem.create({ data: { assessmentId: assessment.id, activityItemId: item.id, method, status: evaluation.status, correct: evaluation.correct, marksAwarded: evaluation.marksAwarded, possibleMarks: evaluation.possibleMarks, feedback: evaluation.feedback } });
  }
  const updated = await recalcAndPersist(tx, assessment.id);
  await audit(context, "ASSESSMENT_CREATED", updated, { method: updated.method, itemCount: methods.length }, tx);
  if (updated.status === AssessmentStatus.AUTO_ASSESSED || updated.status === AssessmentStatus.COMPLETED) await audit(context, "ASSESSMENT_AUTO_COMPLETED", updated, { finalMarks: updated.finalMarks.toString(), possibleMarks: updated.possibleMarks.toString() }, tx);
  if (updated.status === AssessmentStatus.AUTO_ASSESSED || updated.status === AssessmentStatus.COMPLETED) await createEvidenceForAssessment(updated.id, context, tx);
  return updated;
}

export async function listAssessments(query: ListAssessmentsQuery, context: AssessmentContext) {
  if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN && context.actor.role !== UserRole.TEACHER) throw denied();
  const filters: Prisma.AssessmentWhereInput[] = [];
  if (query.status) filters.push({ status: query.status });
  if (query.schoolId) filters.push({ schoolId: query.schoolId });
  if (query.assignmentId) filters.push({ assignmentId: query.assignmentId });
  if (query.studentId) filters.push({ studentId: query.studentId });
  if (query.teacherId) filters.push({ teacherId: query.teacherId });
  if (query.classId) filters.push({ student: { classId: query.classId } });
  if (query.search) filters.push({ OR: [{ student: { fullName: { contains: query.search, mode: "insensitive" } } }, { student: { studentId: { contains: query.search, mode: "insensitive" } } }, { assignment: { title: { contains: query.search, mode: "insensitive" } } }] });
  if (context.actor.role === UserRole.ADMIN && context.actor.schoolId) filters.push({ schoolId: context.actor.schoolId });
  if (context.actor.role === UserRole.TEACHER) filters.push({ schoolId: context.actor.schoolId ?? undefined, OR: [{ assignment: { assignedByTeacherId: context.actor.profileId } }, { student: { class: { teacherId: context.actor.profileId } } }, { assignment: { classTargets: { some: { schoolClass: { teacherId: context.actor.profileId } } } } }] });
  const where: Prisma.AssessmentWhereInput = filters.length ? { AND: filters } : {};
  const [records, total] = await Promise.all([prisma.assessment.findMany({ where, include: detailInclude, orderBy: { [query.sortBy]: query.sortOrder }, skip: (query.page - 1) * query.limit, take: query.limit }), prisma.assessment.count({ where })]);
  return { assessments: records.map(summary), pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit), hasNextPage: query.page * query.limit < total, hasPreviousPage: query.page > 1 } };
}

export async function getAssessment(id: string, context: AssessmentContext) {
  const record = await findDetail(id);
  await requireManage(record, context);
  return detail(record, context.actor.role === UserRole.SUPER_ADMIN || context.actor.role === UserRole.ADMIN || record.teacherId === context.actor.profileId);
}

export async function scoreManualItem(id: string, activityItemId: string, input: ManualScoreInput, context: AssessmentContext) {
  const record = await findDetail(id);
  await requireManage(record, context, true);
  if (record.status === AssessmentStatus.INVALIDATED || record.status === AssessmentStatus.ARCHIVED) throw invalid();
  const item = record.items.find((entry) => entry.activityItemId === activityItemId);
  if (!item) throw err("ASSESSMENT_ITEM_NOT_FOUND", 404, "Item pentaksiran tidak ditemui.");
  if (item.method !== AssessmentMethod.MANUAL) throw err("ASSESSMENT_ITEM_NOT_MANUAL", 409, "Item ini tidak memerlukan pentaksiran manual.");
  const possibleMarks = input.possibleMarks === undefined ? item.possibleMarks : dec(input.possibleMarks);
  const marksAwarded = dec(input.marksAwarded);
  if (marksAwarded.gt(possibleMarks)) throw err("ASSESSMENT_MARKS_INVALID", 400, "Markah tidak boleh melebihi markah penuh.");
  return prisma.$transaction(async (tx) => {
    await tx.assessmentItem.update({ where: { assessmentId_activityItemId: { assessmentId: id, activityItemId } }, data: { status: AssessmentItemStatus.MANUALLY_ASSESSED, correct: marksAwarded.eq(possibleMarks), marksAwarded, possibleMarks, teacherId: context.actor.profileId, teacherFeedback: input.teacherFeedback ?? null, internalNotes: input.internalNotes ?? null, assessedAt: new Date(), feedback: { type: "manual", assessed: true } } });
    const updated = await recalcAndPersist(tx, id);
    await tx.assessment.update({ where: { id }, data: { teacherId: context.actor.profileId } });
    await audit(context, "ASSESSMENT_MANUAL_COMPLETED", updated, { activityItemId, marksAwarded: marksAwarded.toString(), possibleMarks: possibleMarks.toString() }, tx);
    if (updated.status === AssessmentStatus.AUTO_ASSESSED || updated.status === AssessmentStatus.COMPLETED) await createEvidenceForAssessment(updated.id, context, tx);
    return detailInTx(tx, id, true);
  });
}

export async function recalculateAssessment(id: string, context: AssessmentContext) {
  const record = await findDetail(id);
  await requireManage(record, context);
  if (record.status === AssessmentStatus.INVALIDATED || record.status === AssessmentStatus.ARCHIVED) throw invalid();
  return prisma.$transaction(async (tx) => {
    const full = await tx.assessment.findUnique({
      where: { id },
      include: {
        submission: {
          include: {
            attempt: { include: { answers: true } },
            assignment: {
              include: {
                digitalActivity: {
                  include: {
                    activityTemplate: { select: { rendererKey: true, requiresTeacherReview: true } },
                    items: {
                      include: {
                        questionBankItem: {
                          include: { answerOptions: { orderBy: { sequence: "asc" } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!full) throw notFound();
    const answers = new Map(full.submission.attempt.answers.map((answer) => [answer.activityItemId, answer]));
    const rendererKey = full.submission.assignment.digitalActivity.activityTemplate.rendererKey;
    for (const item of full.submission.assignment.digitalActivity.items) {
      const current = record.items.find((entry) => entry.activityItemId === item.id);
      if (!current || current.method !== AssessmentMethod.AUTOMATIC) continue;
      const possibleMarks = current.possibleMarks;
      const answer = answers.get(item.id);
      const evaluation = evaluateAutomaticItem({ rendererKey, method: AssessmentMethod.AUTOMATIC, configuration: item.configuration, possibleMarks, question: { answerType: item.questionBankItem.answerType, correctAnswer: item.questionBankItem.correctAnswer, answerOptions: item.questionBankItem.answerOptions }, answerJson: answer?.answerJson ?? null, isCompleted: answer?.isCompleted ?? false });
      await tx.assessmentItem.update({ where: { assessmentId_activityItemId: { assessmentId: id, activityItemId: item.id } }, data: { status: evaluation.status, correct: evaluation.correct, marksAwarded: evaluation.marksAwarded, possibleMarks: evaluation.possibleMarks, feedback: evaluation.feedback, assessedAt: new Date() } });
    }
    const updated = await recalcAndPersist(tx, id);
    await audit(context, "ASSESSMENT_RECALCULATED", updated, { finalMarks: updated.finalMarks.toString() }, tx);
    if (updated.status === AssessmentStatus.AUTO_ASSESSED || updated.status === AssessmentStatus.COMPLETED) await createEvidenceForAssessment(updated.id, context, tx);
    return detailInTx(tx, id, context.actor.role === UserRole.SUPER_ADMIN || context.actor.role === UserRole.ADMIN || record.teacherId === context.actor.profileId);
  });
}

export async function createAdjustment(id: string, input: AdjustmentInput, context: AssessmentContext) {
  const record = await findDetail(id);
  await requireManage(record, context);
  if (record.status === AssessmentStatus.INVALIDATED || record.status === AssessmentStatus.ARCHIVED) throw invalid();
  const previousMarks = record.finalMarks;
  const newMarks = dec(input.newMarks);
  return prisma.$transaction(async (tx) => {
    await tx.assessmentAdjustment.create({ data: { assessmentId: id, teacherId: context.actor.role === UserRole.TEACHER ? context.actor.profileId : null, adjustedByUserId: context.actor.userId, reason: input.reason, previousMarks, newMarks, difference: newMarks.sub(previousMarks), notes: input.notes ?? null } });
    const updated = await recalcAndPersist(tx, id);
    await audit(context, "ASSESSMENT_ADJUSTED", updated, { previousMarks: previousMarks.toString(), newMarks: newMarks.toString(), reason: input.reason }, tx);
    return detailInTx(tx, id, context.actor.role === UserRole.SUPER_ADMIN || context.actor.role === UserRole.ADMIN || record.teacherId === context.actor.profileId);
  });
}

export async function invalidateAssessment(id: string, input: InvalidateInput, context: AssessmentContext) {
  if (context.actor.role !== UserRole.SUPER_ADMIN) throw denied();
  const record = await findDetail(id);
  return prisma.$transaction(async (tx) => {
    const targets = await tx.pBDEvidence.findMany({ where: { assessmentId: id, isValid: true }, select: { curriculumVersionId: true, programmeId: true, remedialSkillId: true, learningStandardId: true } });
    const updated = await tx.assessment.update({ where: { id }, data: { status: AssessmentStatus.INVALIDATED, invalidatedAt: new Date(), overallFeedback: input.notes ?? record.overallFeedback } });
    await tx.pBDEvidence.updateMany({ where: { assessmentId: id, isValid: true }, data: { isValid: false, invalidatedAt: new Date(), invalidationReason: "ASSESSMENT_INVALIDATED" } });
    for (const target of targets) await recalculateStudentMastery(updated.studentId, target, context, tx);
    await audit(context, "ASSESSMENT_INVALIDATED", updated, { notesProvided: Boolean(input.notes) }, tx);
    return { id: updated.id, status: updated.status, invalidatedAt: updated.invalidatedAt };
  });
}

export async function archiveAssessment(id: string, context: AssessmentContext) {
  const record = await findDetail(id);
  await requireManage(record, context);
  if (record.status === AssessmentStatus.INVALIDATED) throw invalid();
  return prisma.$transaction(async (tx) => { const updated = await tx.assessment.update({ where: { id }, data: { status: AssessmentStatus.ARCHIVED, archivedAt: new Date() } }); await audit(context, "ASSESSMENT_ARCHIVED", updated, {}, tx); return { id: updated.id, status: updated.status, archivedAt: updated.archivedAt }; });
}

async function studentIdFor(context: AssessmentContext): Promise<string> {
  if (context.actor.role !== UserRole.STUDENT) throw denied();
  const student = await prisma.student.findUnique({ where: { id: context.actor.profileId }, select: { id: true } });
  if (!student) throw denied();
  return student.id;
}

function studentDto(record: AssessmentRecord) {
  return { id: record.id, status: record.status, marks: { final: num(record.finalMarks), possible: num(record.possibleMarks), percentage: num(record.percentage) }, result: record.result, overallFeedback: record.overallFeedback, assignment: { id: record.assignmentId, title: record.assignment.title }, itemFeedback: record.items.map((item) => ({ activityItemId: item.activityItemId, status: item.status, correct: item.correct, marksAwarded: num(item.marksAwarded), possibleMarks: num(item.possibleMarks), feedback: item.teacherFeedback ?? item.feedback })) };
}

export async function listStudentAssessments(context: AssessmentContext) {
  const studentId = await studentIdFor(context);
  const records = await prisma.assessment.findMany({ where: { studentId, status: { notIn: [AssessmentStatus.ARCHIVED, AssessmentStatus.INVALIDATED] } }, include: detailInclude, orderBy: { createdAt: "desc" } });
  return { assessments: records.map(studentDto) };
}

export async function getStudentAssessment(id: string, context: AssessmentContext) {
  const studentId = await studentIdFor(context);
  const record = await findDetail(id);
  if (record.studentId !== studentId) throw notFound();
  return studentDto(record);
}

export async function listParentAssessments(studentId: string, context: AssessmentContext) {
  if (context.actor.role !== UserRole.PARENT) throw denied();
  const linked = await prisma.parentStudent.findFirst({ where: { parent: { userId: context.actor.userId }, studentId }, select: { id: true } });
  if (!linked) throw notFound();
  const records = await prisma.assessment.findMany({ where: { studentId, status: { in: [AssessmentStatus.AUTO_ASSESSED, AssessmentStatus.COMPLETED, AssessmentStatus.PARTIALLY_ASSESSED] } }, include: detailInclude, orderBy: { createdAt: "desc" } });
  return { assessments: records.map((record) => ({ id: record.id, assignment: { id: record.assignmentId, title: record.assignment.title }, status: record.status, marks: { final: num(record.finalMarks), possible: num(record.possibleMarks) }, percentage: num(record.percentage), teacherFeedbackSummary: record.overallFeedback ?? (record.items.map((item) => item.teacherFeedback).filter((value): value is string => Boolean(value)).join("\n") || null) })) };
}
