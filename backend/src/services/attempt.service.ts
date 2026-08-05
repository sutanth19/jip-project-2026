import { AttemptStatus, AssignmentStatus, Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import type { SaveAttemptRequest } from "../validators/attempt.validator.js";
import { createSubmissionForAttempt } from "./submission.service.js";
import { notifySubmissionEvent } from "./notification.service.js";

export interface AttemptContext { actor: AuthenticatedSession; requestIp?: string | null; userAgent?: string | null; }
function err(code: string, status: number, message: string): AppError { return new AppError(code, status, message); }
const denied = () => err("ATTEMPT_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses percubaan ini.");
const notFound = () => err("ATTEMPT_NOT_FOUND", 404, "Percubaan tidak ditemui.");
const limitReached = () => err("ATTEMPT_LIMIT_REACHED", 409, "Had percubaan telah dicapai.");
const unavailable = () => err("ASSIGNMENT_NOT_AVAILABLE", 403, "Tugasan tidak tersedia.");
const invalid = () => err("ATTEMPT_STATE_INVALID", 409, "Status percubaan tidak sah.");

function requireStudent(actor: AuthenticatedSession): void { if (actor.role !== UserRole.STUDENT) throw denied(); }
async function getStudent(actor: AuthenticatedSession) { const student = await prisma.student.findUnique({ where: { id: actor.profileId }, select: { id: true, schoolId: true, classId: true, user: { select: { accountStatus: true } } } }); if (!student) throw denied(); return student; }
async function getAssignment(assignmentId: string) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      status: true,
      attemptsAllowed: true,
      startAt: true,
      dueAt: true,
      availableUntil: true,
      schoolId: true,
      studentTargets: { select: { studentId: true } },
      classTargets: { select: { classId: true } },
      digitalActivity: {
        select: {
          id: true,
          title: true,
          instructions: true,
          status: true,
          activityTemplate: { select: { rendererKey: true } },
          items: {
            select: {
              id: true,
              sequence: true,
              sectionKey: true,
              isRequired: true,
              marks: true,
              configuration: true,
              questionBankItemId: true,
            },
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });
  if (!assignment) throw unavailable();
  return assignment;
}
function nowState(assignment: { status: AssignmentStatus; startAt: Date | null; availableUntil: Date | null }, now = new Date()) {
  if (assignment.status === AssignmentStatus.CANCELLED || assignment.status === AssignmentStatus.ARCHIVED || assignment.status === AssignmentStatus.CLOSED) return "CLOSED";
  if (assignment.availableUntil && assignment.availableUntil <= now) return "EXPIRED";
  if (assignment.startAt && assignment.startAt > now) return "UPCOMING";
  return "AVAILABLE";
}

async function effectiveRecipient(assignmentId: string, studentId: string, classId: string): Promise<boolean> { const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, select: { studentTargets: { select: { studentId: true } }, classTargets: { select: { classId: true } } } }); if (!assignment) return false; return assignment.studentTargets.some((target) => target.studentId === studentId) || assignment.classTargets.some((target) => target.classId === classId); }

async function activeAttempt(assignmentId: string, studentId: string) { return prisma.studentAttempt.findFirst({ where: { assignmentId, studentId, status: AttemptStatus.IN_PROGRESS }, include: { session: true, answers: true } }); }

function attemptDto(attempt: { id: string; assignmentId: string; studentId: string; attemptNumber: number; status: AttemptStatus; startedAt: Date | null; submittedAt: Date | null; lastSavedAt: Date | null; expiresAt: Date | null; totalDurationSeconds: number | null }) { return attempt; }

export async function openOrResumeAttempt(assignmentId: string, context: AttemptContext) {
  requireStudent(context.actor);
  const student = await getStudent(context.actor);
  const assignment = await getAssignment(assignmentId);
  if (assignment.status === AssignmentStatus.CANCELLED || assignment.status === AssignmentStatus.ARCHIVED) throw unavailable();
  if (!(await effectiveRecipient(assignment.id, student.id, student.classId))) throw denied();
  const currentState = nowState(assignment);
  if (currentState === "EXPIRED" || currentState === "CLOSED" || currentState === "UPCOMING") throw unavailable();
  const existing = await activeAttempt(assignment.id, student.id);
  if (existing) return { attempt: attemptDto(existing), resumed: true };
  const attemptsAllowed = assignment.attemptsAllowed ?? 1;
  const used = await prisma.studentAttempt.count({ where: { assignmentId: assignment.id, studentId: student.id } });
  if (used >= attemptsAllowed) throw limitReached();
  const record = await prisma.$transaction(async (tx) => {
    const created = await tx.studentAttempt.create({ data: { assignmentId: assignment.id, studentId: student.id, attemptNumber: used + 1, status: AttemptStatus.IN_PROGRESS, startedAt: new Date(), expiresAt: assignment.availableUntil ?? null, totalDurationSeconds: null } });
    await tx.assignmentSession.create({ data: { attemptId: created.id, sessionToken: randomUUID(), startedAt: new Date(), lastHeartbeat: new Date(), isActive: true } });
    return created;
  });
  return { attempt: attemptDto(record), resumed: false };
}

export async function saveAttempt(attemptId: string, input: SaveAttemptRequest, context: AttemptContext) {
  requireStudent(context.actor);
  const student = await getStudent(context.actor);
  const attempt = await prisma.studentAttempt.findUnique({ where: { id: attemptId }, include: { assignment: { include: { digitalActivity: { select: { items: { select: { id: true }, orderBy: { sequence: "asc" } } } } } } } });
  if (!attempt || attempt.studentId !== student.id) throw notFound();
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw invalid();
  const itemIds = new Set(attempt.assignment.digitalActivity.items.map((item) => item.id));
  const answers = input.answers.map((answer, index) => {
    const supplied = answer && typeof answer === "object" && !Array.isArray(answer) ? answer as Record<string, unknown> : null;
    const suppliedItemId = supplied?.activityItemId;
    const activityItemId = typeof suppliedItemId === "string" ? suppliedItemId : attempt.assignment.digitalActivity.items[index]?.id;
    if (!activityItemId || !itemIds.has(activityItemId)) throw err("ATTEMPT_ANSWER_INVALID", 400, "Item jawapan tidak sah.");
    const answerJson = supplied && "answerJson" in supplied ? supplied.answerJson : answer;
    const isCompleted = supplied?.isCompleted === true;
    const timeSpentSeconds = typeof supplied?.timeSpentSeconds === "number" && Number.isInteger(supplied.timeSpentSeconds) && supplied.timeSpentSeconds >= 0 ? supplied.timeSpentSeconds : null;
    return { attemptId, activityItemId, answerJson: answerJson as Prisma.InputJsonValue, isCompleted, timeSpentSeconds };
  });
  if (new Set(answers.map((answer) => answer.activityItemId)).size !== answers.length) throw err("ATTEMPT_ANSWER_INVALID", 400, "Setiap item hanya boleh mempunyai satu jawapan.");
  await prisma.$transaction(async (tx) => {
    await tx.studentAnswer.deleteMany({ where: { attemptId } });
    if (answers.length) await tx.studentAnswer.createMany({ data: answers });
    await tx.studentAttempt.update({ where: { id: attemptId }, data: { lastSavedAt: new Date() } });
    await tx.assignmentSession.updateMany({ where: { attemptId }, data: { lastHeartbeat: new Date(), isActive: true } });
  });
  return { attemptId };
}

export async function submitAttempt(attemptId: string, context: AttemptContext) {
  requireStudent(context.actor);
  const student = await getStudent(context.actor);
  const attempt = await prisma.studentAttempt.findUnique({ where: { id: attemptId }, include: { assignment: true, session: true, submission: true } });
  if (!attempt || attempt.studentId !== student.id) throw notFound();
  if (attempt.status === AttemptStatus.SUBMITTED && attempt.submission) return { attempt: attemptDto(attempt), submission: attempt.submission, idempotent: true };
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw invalid();
  const result = await prisma.$transaction(async (tx) => {
    await tx.assignmentSession.updateMany({ where: { attemptId }, data: { endedAt: new Date(), isActive: false } });
    const updated = await tx.studentAttempt.update({ where: { id: attemptId }, data: { status: AttemptStatus.SUBMITTED, submittedAt: new Date(), lastSavedAt: new Date() } });
    const submission = await createSubmissionForAttempt(tx, attemptId, context);
    return { updated, submission };
  });
  void notifySubmissionEvent(result.submission.id, false, false, context).catch(() => undefined);
  return { attempt: attemptDto(result.updated), submission: result.submission, idempotent: false };
}
