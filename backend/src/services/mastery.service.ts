import { MasteryDecisionSource, MasteryLevel, MasteryStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { recordAuditEvent } from "./audit.service.js";
import { calculateMasteryRecommendation } from "./mastery-recommendation.service.js";

export interface PbdContext { actor: AuthenticatedSession; requestIp?: string | null; userAgent?: string | null; }
type Tx = Prisma.TransactionClient;
const error = (code: string, status: number, message: string) => new AppError(code, status, message);
const denied = () => error("PBD_MASTERY_ACCESS_DENIED", 403, "Anda tidak dibenarkan mengakses penguasaan ini.");
const notFound = () => error("PBD_MASTERY_NOT_FOUND", 404, "Rekod penguasaan tidak ditemui.");
export const masteryScopeKey = (remedialSkillId: string, learningStandardId: string | null) => learningStandardId ? `STANDARD:${remedialSkillId}:${learningStandardId}` : `SKILL:${remedialSkillId}`;

async function teacherCanAccessStudent(studentId: string, context: PbdContext): Promise<boolean> {
  if (context.actor.role === UserRole.SUPER_ADMIN) return true;
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true, class: { select: { teacherId: true } } } });
  if (!student) return false;
  if (context.actor.role === UserRole.ADMIN) return context.actor.schoolId === null || context.actor.schoolId === student.schoolId;
  return context.actor.role === UserRole.TEACHER && context.actor.schoolId === student.schoolId && student.class.teacherId === context.actor.profileId;
}

export async function requireStudentPbdAccess(studentId: string, context: PbdContext): Promise<void> { if (!(await teacherCanAccessStudent(studentId, context))) throw denied(); }

function audit(context: PbdContext, action: "PBD_MASTERY_RECOMMENDED" | "PBD_MASTERY_RECALCULATED" | "PBD_MASTERY_CONFIRMED" | "PBD_MASTERY_OVERRIDDEN" | "PBD_MASTERY_ARCHIVED", mastery: { id: string; schoolId: string; studentId: string; remedialSkillId: string; learningStandardId: string | null; currentLevel: MasteryLevel; evidenceCount: number; trend: string }, tx: Tx) {
  return recordAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action, resourceType: "PBD_MASTERY", resourceId: mastery.id, schoolId: mastery.schoolId, before: null, after: { studentId: mastery.studentId, remedialSkillId: mastery.remedialSkillId, learningStandardId: mastery.learningStandardId, level: mastery.currentLevel }, metadata: { evidenceCount: mastery.evidenceCount, trend: mastery.trend }, timestamp: new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, { transactionClient: tx, strict: true });
}

export async function recalculateStudentMastery(studentId: string, target: { curriculumVersionId: string; programmeId: string; remedialSkillId: string; learningStandardId: string | null }, context: PbdContext, tx?: Tx) {
  const database = tx ?? prisma;
  const evidence = await database.pBDEvidence.findMany({ where: { studentId, curriculumVersionId: target.curriculumVersionId, remedialSkillId: target.remedialSkillId, learningStandardId: target.learningStandardId, isValid: true }, select: { percentage: true, completionOnly: true, evidenceType: true, strength: true, observedLevel: true, digitalActivityId: true, observedAt: true } });
  const recommendation = calculateMasteryRecommendation(evidence);
  const scopeKey = masteryScopeKey(target.remedialSkillId, target.learningStandardId);
  const existing = await database.studentMastery.findUnique({ where: { studentId_curriculumVersionId_scopeKey: { studentId, curriculumVersionId: target.curriculumVersionId, scopeKey } } });
  const data = { recommendedLevel: recommendation.recommendedLevel, recommendedConfidence: recommendation.confidencePercentage, recommendedAt: new Date(), confidencePercentage: recommendation.confidencePercentage, evidenceCount: recommendation.evidenceCount, activityCount: recommendation.activityCount, trend: recommendation.trend, latestEvidenceAt: recommendation.latestEvidenceAt };
  if (existing) {
    const preserveTeacherDecision = existing.status === MasteryStatus.CONFIRMED || existing.status === MasteryStatus.OVERRIDDEN;
    const updated = await database.studentMastery.update({ where: { id: existing.id }, data: preserveTeacherDecision ? data : { ...data, currentLevel: recommendation.recommendedLevel, status: MasteryStatus.RECOMMENDED, decisionSource: MasteryDecisionSource.SYSTEM_RECOMMENDATION } });
    if (!preserveTeacherDecision && (existing.currentLevel !== updated.currentLevel || existing.status !== updated.status)) await database.studentMasteryHistory.create({ data: { studentMasteryId: updated.id, previousLevel: existing.currentLevel, newLevel: updated.currentLevel, previousStatus: existing.status, newStatus: updated.status, decisionSource: MasteryDecisionSource.SYSTEM_RECOMMENDATION, evidenceCount: updated.evidenceCount, confidencePercentage: updated.confidencePercentage, reason: "RECOMMENDATION_RECALCULATED" } });
    if (tx) await audit(context, "PBD_MASTERY_RECOMMENDED", updated, tx);
    return updated;
  }
  const student = await database.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
  if (!student) throw error("PBD_PROGRESS_NOT_AVAILABLE", 404, "Data kemajuan murid tidak tersedia.");
  const created = await database.studentMastery.create({ data: { studentId, schoolId: student.schoolId, ...target, scopeKey, currentLevel: recommendation.recommendedLevel, status: MasteryStatus.RECOMMENDED, decisionSource: MasteryDecisionSource.SYSTEM_RECOMMENDATION, ...data } });
  await database.studentMasteryHistory.create({ data: { studentMasteryId: created.id, newLevel: created.currentLevel, newStatus: created.status, decisionSource: created.decisionSource, evidenceCount: created.evidenceCount, confidencePercentage: created.confidencePercentage, reason: "INITIAL_RECOMMENDATION" } });
  if (tx) await audit(context, "PBD_MASTERY_RECOMMENDED", created, tx);
  return created;
}

export async function recalculateMastery(id: string, context: PbdContext) {
  const mastery = await prisma.studentMastery.findUnique({ where: { id } }); if (!mastery) throw notFound(); await requireStudentPbdAccess(mastery.studentId, context);
  if (mastery.status === MasteryStatus.ARCHIVED) throw error("PBD_MASTERY_ARCHIVED", 409, "Rekod penguasaan telah diarkibkan.");
  return prisma.$transaction(async (tx) => { const updated = await recalculateStudentMastery(mastery.studentId, mastery, context, tx); await audit(context, "PBD_MASTERY_RECALCULATED", updated, tx); return updated; });
}

async function decide(id: string, input: { level: MasteryLevel; reason: string; teacherNote?: string | null }, context: PbdContext, override: boolean) {
  const mastery = await prisma.studentMastery.findUnique({ where: { id } }); if (!mastery) throw notFound(); await requireStudentPbdAccess(mastery.studentId, context);
  if (context.actor.role !== UserRole.TEACHER && context.actor.role !== UserRole.SUPER_ADMIN) throw denied();
  if (mastery.status === MasteryStatus.ARCHIVED) throw error("PBD_MASTERY_ARCHIVED", 409, "Rekod penguasaan telah diarkibkan.");
  return prisma.$transaction(async (tx) => {
    const status = override ? MasteryStatus.OVERRIDDEN : MasteryStatus.CONFIRMED;
    const decisionSource = override ? MasteryDecisionSource.TEACHER_OVERRIDE : MasteryDecisionSource.TEACHER_JUDGMENT;
    const updated = await tx.studentMastery.update({ where: { id }, data: { currentLevel: input.level, status, decisionSource, confirmedByTeacherId: context.actor.role === UserRole.TEACHER ? context.actor.profileId : null, confirmedAt: new Date(), teacherNote: input.teacherNote ?? null } });
    await tx.studentMasteryHistory.create({ data: { studentMasteryId: id, previousLevel: mastery.currentLevel, newLevel: updated.currentLevel, previousStatus: mastery.status, newStatus: updated.status, decisionSource, evidenceCount: updated.evidenceCount, confidencePercentage: updated.confidencePercentage, decidedByTeacherId: context.actor.role === UserRole.TEACHER ? context.actor.profileId : null, reason: input.reason, teacherNote: input.teacherNote ?? null } });
    await audit(context, override ? "PBD_MASTERY_OVERRIDDEN" : "PBD_MASTERY_CONFIRMED", updated, tx); return updated;
  });
}
export const confirmMastery = (id: string, input: { level: MasteryLevel; reason: string; teacherNote?: string | null }, context: PbdContext) => decide(id, input, context, false);
export const overrideMastery = (id: string, input: { level: MasteryLevel; reason: string; teacherNote?: string | null }, context: PbdContext) => decide(id, input, context, true);
export async function archiveMastery(id: string, context: PbdContext) { const mastery = await prisma.studentMastery.findUnique({ where: { id } }); if (!mastery) throw notFound(); await requireStudentPbdAccess(mastery.studentId, context); if (context.actor.role !== UserRole.SUPER_ADMIN) throw denied(); return prisma.$transaction(async (tx) => { const updated = await tx.studentMastery.update({ where: { id }, data: { status: MasteryStatus.ARCHIVED, archivedAt: new Date() } }); await audit(context, "PBD_MASTERY_ARCHIVED", updated, tx); return updated; }); }
