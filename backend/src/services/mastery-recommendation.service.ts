import { EvidenceStrength, EvidenceType, MasteryLevel, Prisma, ProgressTrend } from "@prisma/client";
import { MASTERY_POLICY } from "./mastery-policy.js";

export interface EvidenceForRecommendation {
  percentage: Prisma.Decimal | null;
  completionOnly: boolean;
  evidenceType: EvidenceType;
  strength: EvidenceStrength;
  observedLevel: MasteryLevel | null;
  digitalActivityId: string | null;
  observedAt: Date;
}

export interface MasteryRecommendation {
  recommendedLevel: MasteryLevel;
  confidencePercentage: Prisma.Decimal;
  evidenceCount: number;
  activityCount: number;
  recentAveragePercentage: Prisma.Decimal | null;
  trend: ProgressTrend;
  reasons: string[];
  latestEvidenceAt: Date | null;
}

const zero = new Prisma.Decimal(0);
const hundred = new Prisma.Decimal(100);
const quantitative = (entry: EvidenceForRecommendation) => entry.percentage !== null && !entry.completionOnly && MASTERY_POLICY.quantitativeEvidenceTypes.includes(entry.evidenceType as never);
const average = (values: readonly Prisma.Decimal[]) => values.length === 0 ? null : values.reduce((total, value) => total.add(value), zero).div(values.length);
const clamp = (value: Prisma.Decimal) => Prisma.Decimal.min(hundred, Prisma.Decimal.max(zero, value));

export function calculateTrend(evidence: readonly EvidenceForRecommendation[]): ProgressTrend {
  const values = evidence.filter(quantitative).sort((left, right) => left.observedAt.getTime() - right.observedAt.getTime()).map((entry) => entry.percentage as Prisma.Decimal);
  if (values.length < 4) return ProgressTrend.INSUFFICIENT_DATA;
  const midpoint = Math.floor(values.length / 2);
  const older = average(values.slice(0, midpoint));
  const recent = average(values.slice(midpoint));
  if (!older || !recent) return ProgressTrend.INSUFFICIENT_DATA;
  const delta = recent.sub(older);
  if (delta.gte(MASTERY_POLICY.improvingDelta)) return ProgressTrend.IMPROVING;
  if (delta.lte(-MASTERY_POLICY.improvingDelta)) return ProgressTrend.DECLINING;
  return ProgressTrend.STABLE;
}

export function calculateMasteryRecommendation(evidence: readonly EvidenceForRecommendation[]): MasteryRecommendation {
  const ordered = [...evidence].sort((left, right) => right.observedAt.getTime() - left.observedAt.getTime());
  const quantitativeEvidence = ordered.filter(quantitative);
  const recent = quantitativeEvidence.slice(0, MASTERY_POLICY.recentEvidenceWindow);
  const recentAverage = average(recent.map((entry) => entry.percentage as Prisma.Decimal));
  const standardEvidence = evidence.filter((entry) => entry.strength !== EvidenceStrength.SUPPORTING).length;
  const activityCount = new Set(evidence.flatMap((entry) => entry.digitalActivityId ? [entry.digitalActivityId] : [])).size;
  const strongestObservation = evidence.reduce<MasteryLevel | null>((current, entry) => !entry.observedLevel || (current !== null && rank(current) >= rank(entry.observedLevel)) ? current : entry.observedLevel, null);
  const reasons: string[] = [];
  let recommendedLevel: MasteryLevel = MasteryLevel.NOT_STARTED;
  if (evidence.length > 0) {
    recommendedLevel = MasteryLevel.EMERGING;
    reasons.push("VALID_EVIDENCE_RECORDED");
  }
  if (evidence.length >= 2 && (recentAverage === null || recentAverage.gte(40) || strongestObservation !== null)) {
    recommendedLevel = MasteryLevel.DEVELOPING;
    reasons.push("MULTIPLE_VALID_EVIDENCE");
  }
  if (recentAverage?.gte(MASTERY_POLICY.achievedRecentPercentage) && standardEvidence >= MASTERY_POLICY.achievedMinimumStandardEvidence) {
    recommendedLevel = MasteryLevel.ACHIEVED;
    reasons.push("CONSISTENT_RECENT_RESULTS");
  }
  if (recentAverage?.gte(MASTERY_POLICY.masteredRecentPercentage) && evidence.length >= MASTERY_POLICY.masteredMinimumEvidence && activityCount >= MASTERY_POLICY.masteredMinimumActivities && standardEvidence >= MASTERY_POLICY.masteredMinimumEvidence) {
    recommendedLevel = MasteryLevel.MASTERED;
    reasons.push("STRONG_DIVERSE_EVIDENCE");
  }
  if (strongestObservation && rank(strongestObservation) > rank(recommendedLevel)) {
    recommendedLevel = strongestObservation;
    reasons.push("TEACHER_OBSERVATION_SUPPORTS_LEVEL");
  }
  const evidenceConfidence = new Prisma.Decimal(Math.min(evidence.length * 15, 45));
  const scoreConfidence = recentAverage ? recentAverage.mul(0.45) : zero;
  const diversityConfidence = new Prisma.Decimal(Math.min(activityCount * 5, 10));
  return { recommendedLevel, confidencePercentage: clamp(evidenceConfidence.add(scoreConfidence).add(diversityConfidence)), evidenceCount: evidence.length, activityCount, recentAveragePercentage: recentAverage, trend: calculateTrend(evidence), reasons, latestEvidenceAt: ordered[0]?.observedAt ?? null };
}

function rank(level: MasteryLevel): number { return [MasteryLevel.NOT_STARTED, MasteryLevel.EMERGING, MasteryLevel.DEVELOPING, MasteryLevel.ACHIEVED, MasteryLevel.MASTERED].indexOf(level); }
