import { MasteryLevel, Prisma, ProgressTrend } from "@prisma/client";
import { SubmissionStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { REPORT_POLICY } from "./report-policy.js";

const zero = new Prisma.Decimal(0);
export const decimalAverage = (values: readonly (Prisma.Decimal | null)[]): number | null => { const valid = values.filter((value): value is Prisma.Decimal => value !== null); return valid.length === 0 ? null : valid.reduce((sum, value) => sum.add(value), zero).div(valid.length).toDecimalPlaces(2).toNumber(); };
export const percentage = (numerator: number, denominator: number): number => denominator === 0 ? 0 : new Prisma.Decimal(numerator).div(denominator).mul(100).toDecimalPlaces(2).toNumber();
export const masteryDistribution = (levels: readonly MasteryLevel[]) => Object.fromEntries(Object.values(MasteryLevel).map((level) => [level, levels.filter((entry) => entry === level).length])) as Record<MasteryLevel, number>;
export const masteryProgress = (levels: readonly MasteryLevel[]): number => levels.length === 0 ? 0 : new Prisma.Decimal(levels.reduce((sum, level) => sum + REPORT_POLICY.levelWeights[level], 0)).div(levels.length).toDecimalPlaces(2).toNumber();
export const aggregateTrend = (trends: readonly ProgressTrend[]): ProgressTrend => { if (trends.length === 0) return ProgressTrend.INSUFFICIENT_DATA; const improving = trends.filter((trend) => trend === ProgressTrend.IMPROVING).length; const declining = trends.filter((trend) => trend === ProgressTrend.DECLINING).length; if (improving > declining) return ProgressTrend.IMPROVING; if (declining > improving) return ProgressTrend.DECLINING; return trends.some((trend) => trend === ProgressTrend.STABLE) ? ProgressTrend.STABLE : ProgressTrend.INSUFFICIENT_DATA; };

export async function studentDashboardAnalytics(studentId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, classId: true, schoolId: true } });
  if (!student) return null;
  const [assignments, submissions, masteries, assessments] = await Promise.all([
    prisma.assignment.findMany({ where: { schoolId: student.schoolId, OR: [{ classTargets: { some: { classId: student.classId } } }, { studentTargets: { some: { studentId } } }] }, select: { id: true, title: true, dueAt: true, digitalActivity: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.submission.findMany({ where: { studentId }, select: { assignmentId: true, status: true } }),
    prisma.studentMastery.findMany({ where: { studentId, learningStandardId: null, archivedAt: null }, select: { currentLevel: true, trend: true, latestEvidenceAt: true, remedialSkill: { select: { code: true, name: true } } }, orderBy: { latestEvidenceAt: "desc" }, take: 10 }),
    prisma.assessment.findMany({ where: { studentId }, select: { overallFeedback: true, assessedAt: true }, orderBy: { assessedAt: "desc" }, take: 5 }),
  ]);
  const completed = new Set(submissions.filter((entry) => entry.status === SubmissionStatus.REVIEWED).map((entry) => entry.assignmentId));
  return { assignments: { total: assignments.length, completionPercentage: percentage(completed.size, assignments.length), recent: assignments.map((entry) => ({ title: entry.title, activity: entry.digitalActivity.title, dueAt: entry.dueAt, completed: completed.has(entry.id) })) }, mastery: { currentProgress: masteryProgress(masteries.map((entry) => entry.currentLevel)), distribution: masteryDistribution(masteries.map((entry) => entry.currentLevel)), trend: aggregateTrend(masteries.map((entry) => entry.trend)), skills: masteries.map((entry) => ({ code: entry.remedialSkill.code, name: entry.remedialSkill.name, level: entry.currentLevel, trend: entry.trend })) }, teacherFeedback: assessments.filter((entry) => entry.overallFeedback).map((entry) => ({ message: entry.overallFeedback, at: entry.assessedAt })) };
}

export async function teacherDashboardAnalytics(teacherId: string) { const classes = await prisma.schoolClass.findMany({ where: { teacherId }, select: { id: true } }); const classIds = classes.map((entry) => entry.id); const [pendingReviews, assignments, masteries] = await Promise.all([prisma.submission.count({ where: { student: { classId: { in: classIds } }, status: { in: [SubmissionStatus.PENDING_REVIEW, SubmissionStatus.IN_REVIEW] } } }), prisma.assignment.count({ where: { assignedByTeacherId: teacherId } }), prisma.studentMastery.findMany({ where: { student: { classId: { in: classIds } }, learningStandardId: null, archivedAt: null }, select: { currentLevel: true, trend: true } })]); return { pendingReviews, assignments, averageMastery: masteryProgress(masteries.map((entry) => entry.currentLevel)), masteryTrend: aggregateTrend(masteries.map((entry) => entry.trend)) }; }

export async function adminDashboardAnalytics(schoolId: string | null) { const where = schoolId ? { schoolId } : {}; const [assignments, assessments, masteries] = await Promise.all([prisma.assignment.count({ where }), prisma.assessment.count({ where }), prisma.studentMastery.findMany({ where: { ...where, learningStandardId: null, archivedAt: null }, select: { currentLevel: true } })]); return { assignments, assessments, mastery: { averageProgress: masteryProgress(masteries.map((entry) => entry.currentLevel)), distribution: masteryDistribution(masteries.map((entry) => entry.currentLevel)) } }; }
