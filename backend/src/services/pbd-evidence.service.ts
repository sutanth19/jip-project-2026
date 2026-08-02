import { AssessmentItemStatus, AssessmentMethod, AssessmentStatus, EvidenceStrength, EvidenceType, MasteryLevel, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedSession } from "../middleware/auth.middleware.js";
import { recordAuditEvent } from "./audit.service.js";
import { recalculateStudentMastery, requireStudentPbdAccess, type PbdContext } from "./mastery.service.js";

type Tx = Prisma.TransactionClient;
const error = (code: string, status: number, message: string) => new AppError(code, status, message);
const notFound = () => error("PBD_EVIDENCE_NOT_FOUND", 404, "Rekod bukti PBD tidak ditemui.");

function evidenceType(method: AssessmentMethod): EvidenceType { return method === AssessmentMethod.MANUAL ? EvidenceType.MANUAL_ASSESSMENT : method === AssessmentMethod.COMPLETION ? EvidenceType.ACTIVITY_COMPLETION : EvidenceType.AUTOMATIC_ASSESSMENT; }
function percentage(marks: Prisma.Decimal, possible: Prisma.Decimal): Prisma.Decimal | null { return possible.lte(0) ? null : marks.div(possible).mul(100).toDecimalPlaces(2); }
function audit(context: PbdContext, action: "PBD_EVIDENCE_CREATED" | "PBD_TEACHER_OBSERVATION_CREATED" | "PBD_EVIDENCE_INVALIDATED", evidence: { id: string; schoolId: string; studentId: string; remedialSkillId: string; learningStandardId: string | null; evidenceType: EvidenceType }, tx: Tx) {
  return recordAuditEvent({ actorUserId: context.actor.userId, actorProfileId: context.actor.profileId, actorRole: context.actor.role, actorName: null, action, resourceType: "PBD_EVIDENCE", resourceId: evidence.id, schoolId: evidence.schoolId, before: null, after: { studentId: evidence.studentId, remedialSkillId: evidence.remedialSkillId, learningStandardId: evidence.learningStandardId, evidenceType: evidence.evidenceType }, metadata: {}, timestamp: new Date(), requestIp: context.requestIp ?? null, userAgent: context.userAgent ?? null }, { transactionClient: tx, strict: true });
}

async function targetForLink(tx: Tx, activityId: string) {
  const links = await tx.digitalActivityCurriculumLink.findMany({ where: { digitalActivityId: activityId, remedialSkillId: { not: null } }, include: { remedialSkill: { include: { programme: { include: { curriculumVersion: true } } } }, learningStandard: { include: { contentStandard: true } }, learningObjective: true }, orderBy: { createdAt: "asc" } });
  const primary = links.find((link) => link.isPrimary) ?? (links.length === 1 ? links[0] : null);
  if (!primary || !primary.remedialSkill) return null;
  const programme = primary.remedialSkill.programme;
  if (programme.id !== (await tx.digitalActivity.findUniqueOrThrow({ where: { id: activityId }, select: { programmeId: true } })).programmeId) throw error("PBD_CURRICULUM_LINK_INVALID", 409, "Pautan kurikulum aktiviti tidak sah.");
  if (primary.learningStandard && primary.learningStandard.contentStandard.programmeId !== programme.id) throw error("PBD_CROSS_VERSION_LINK", 409, "Pautan kurikulum merentas program tidak dibenarkan.");
  if (primary.learningObjective && primary.learningObjective.remedialSkillId !== primary.remedialSkillId) throw error("PBD_CURRICULUM_LINK_INVALID", 409, "Objektif pembelajaran tidak sepadan dengan kemahiran.");
  if (primary.learningStandardId) {
    const mapping = await tx.remedialSkillStandardMapping.findUnique({ where: { remedialSkillId_learningStandardId: { remedialSkillId: primary.remedialSkillId as string, learningStandardId: primary.learningStandardId } } });
    if (!mapping) throw error("PBD_CURRICULUM_LINK_INVALID", 409, "Standard pembelajaran tidak dipetakan kepada kemahiran pemulihan.");
  }
  return { curriculumVersionId: programme.curriculumVersionId, programmeId: programme.id, remedialSkillId: primary.remedialSkillId as string, learningStandardId: primary.learningStandardId, learningObjectiveId: primary.learningObjectiveId };
}

export async function createEvidenceForAssessment(assessmentId: string, context: PbdContext, tx?: Tx): Promise<number> {
  const database = tx ?? prisma;
  const assessment = await database.assessment.findUnique({ where: { id: assessmentId }, include: { assignment: { include: { digitalActivity: true } }, items: true } });
  if (!assessment || (assessment.status !== AssessmentStatus.COMPLETED && assessment.status !== AssessmentStatus.AUTO_ASSESSED)) return 0;
  const target = await targetForLink(database as Tx, assessment.assignment.digitalActivityId);
  if (!target) return 0; // An unlinked assessment remains valid but contributes no PBD evidence.
  let count = 0;
  for (const item of assessment.items) {
    if (item.status === AssessmentItemStatus.PENDING) continue;
    const sourceKey = `ASSESSMENT_ITEM:${item.id}:${target.remedialSkillId}:${target.learningStandardId ?? "SKILL"}`;
    const created = await database.pBDEvidence.upsert({ where: { sourceKey }, create: { sourceKey, studentId: assessment.studentId, schoolId: assessment.schoolId, assessmentId: assessment.id, assessmentItemId: item.id, submissionId: assessment.submissionId, assignmentId: assessment.assignmentId, digitalActivityId: assessment.assignment.digitalActivityId, ...target, evidenceType: evidenceType(item.method), strength: EvidenceStrength.STANDARD, awardedMarks: item.marksAwarded, possibleMarks: item.possibleMarks, percentage: percentage(item.marksAwarded, item.possibleMarks), completionOnly: item.method === AssessmentMethod.COMPLETION, observedAt: item.assessedAt ?? assessment.assessedAt ?? new Date() }, update: { awardedMarks: item.marksAwarded, possibleMarks: item.possibleMarks, percentage: percentage(item.marksAwarded, item.possibleMarks), isValid: true, invalidatedAt: null, invalidationReason: null, observedAt: item.assessedAt ?? assessment.assessedAt ?? new Date() } });
    count += 1;
    if (tx) await audit(context, "PBD_EVIDENCE_CREATED", created, tx);
  }
  await recalculateStudentMastery(assessment.studentId, target, context, tx);
  return count;
}

export interface ObservationInput { studentId: string; remedialSkillId: string; learningStandardId: string | null; learningObjectiveId: string | null; strength: EvidenceStrength; observedLevel: MasteryLevel; summary: string; observedAt: Date; }
export async function createObservation(input: ObservationInput, context: PbdContext) {
  await requireStudentPbdAccess(input.studentId, context);
  if (context.actor.role !== UserRole.TEACHER) throw error("PBD_EVIDENCE_ACCESS_DENIED", 403, "Hanya guru boleh merekod pemerhatian PBD.");
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: input.studentId }, select: { schoolId: true } }); if (!student) throw error("PBD_PROGRESS_NOT_AVAILABLE", 404, "Murid tidak ditemui.");
    const skill = await tx.remedialSkill.findUnique({ where: { id: input.remedialSkillId }, include: { programme: { include: { curriculumVersion: true } } } });
    if (!skill || skill.programme.curriculumVersion.status !== "PUBLISHED") throw error("PBD_OBSERVATION_INVALID", 409, "Kemahiran atau versi kurikulum belum diterbitkan.");
    if (input.learningStandardId && !await tx.remedialSkillStandardMapping.findUnique({ where: { remedialSkillId_learningStandardId: { remedialSkillId: skill.id, learningStandardId: input.learningStandardId } } })) throw error("PBD_CURRICULUM_LINK_INVALID", 409, "Standard pembelajaran tidak sah bagi kemahiran ini.");
    if (input.learningObjectiveId) { const objective = await tx.learningObjective.findUnique({ where: { id: input.learningObjectiveId } }); if (!objective || objective.remedialSkillId !== skill.id) throw error("PBD_CURRICULUM_LINK_INVALID", 409, "Objektif pembelajaran tidak sah bagi kemahiran ini."); }
    const evidence = await tx.pBDEvidence.create({ data: { sourceKey: `OBSERVATION:${crypto.randomUUID()}`, studentId: input.studentId, schoolId: student.schoolId, curriculumVersionId: skill.programme.curriculumVersionId, programmeId: skill.programmeId, remedialSkillId: skill.id, learningStandardId: input.learningStandardId, learningObjectiveId: input.learningObjectiveId, evidenceType: EvidenceType.TEACHER_OBSERVATION, strength: input.strength, observedLevel: input.observedLevel, summary: input.summary, observedAt: input.observedAt, recordedByTeacherId: context.actor.profileId } });
    await recalculateStudentMastery(input.studentId, { curriculumVersionId: skill.programme.curriculumVersionId, programmeId: skill.programmeId, remedialSkillId: skill.id, learningStandardId: input.learningStandardId }, context, tx); await audit(context, "PBD_TEACHER_OBSERVATION_CREATED", evidence, tx); return evidence;
  });
}

export async function invalidateEvidence(id: string, reason: string | null, context: PbdContext) {
  const evidence = await prisma.pBDEvidence.findUnique({ where: { id } }); if (!evidence) throw notFound(); await requireStudentPbdAccess(evidence.studentId, context);
  if (context.actor.role !== UserRole.SUPER_ADMIN && context.actor.role !== UserRole.ADMIN) throw error("PBD_EVIDENCE_ACCESS_DENIED", 403, "Anda tidak dibenarkan membatalkan bukti PBD.");
  if (!evidence.isValid) throw error("PBD_EVIDENCE_NOT_INVALIDATABLE", 409, "Bukti PBD telah dibatalkan.");
  return prisma.$transaction(async (tx) => { const updated = await tx.pBDEvidence.update({ where: { id }, data: { isValid: false, invalidatedAt: new Date(), invalidationReason: reason } }); await recalculateStudentMastery(updated.studentId, updated, context, tx); await audit(context, "PBD_EVIDENCE_INVALIDATED", updated, tx); return updated; });
}
